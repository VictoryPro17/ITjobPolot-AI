using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FluentValidation;
using JobPilot.Api.Extensions;
using JobPilot.Api.Filters;
using JobPilot.Api.Middleware;
using JobPilot.Api.Services;
using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;
using JobPilot.Infrastructure;
using JobPilot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Serilog;
using Serilog.Events;

const string CorsPolicyName = "JobPilotFrontend";
const string AuthRateLimitPolicy = "auth";

var builder = WebApplication.CreateBuilder(args);

// Strukturiertes Logging ab dem ersten Start, konfigurierbar ueber appsettings.
builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext());

builder.Services.Configure<AppOptions>(builder.Configuration.GetSection(AppOptions.SectionName));
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection(StorageOptions.SectionName));
builder.Services.Configure<AiOptions>(builder.Configuration.GetSection(AiOptions.SectionName));
builder.Services.Configure<RateLimitOptions>(builder.Configuration.GetSection(RateLimitOptions.SectionName));

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddJobPilotIdentity(builder.Environment);
builder.Services.AddAuthorization();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<ResumeParsingService>();

// Alle Validatoren der Anwendungsschicht automatisch registrieren.
builder.Services.AddValidatorsFromAssemblyContaining<AppOptions>(ServiceLifetime.Scoped);

builder.Services
    .AddControllers(options => options.Filters.Add<ValidationActionFilter>())
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// Die Modellvalidierung laeuft ueber ValidationActionFilter, damit alle
// Fehlerantworten dasselbe Format besitzen.
builder.Services.Configure<ApiBehaviorOptions>(options => options.SuppressModelStateInvalidFilter = true);

builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

var corsOrigins = builder.Configuration
    .GetSection($"{AppOptions.SectionName}:CorsOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Grundlegender Missbrauchsschutz. Anmelde- und Registrierungsendpunkte erhalten
// zusaetzlich eine deutlich strengere Policy gegen das Durchprobieren von Passwoertern.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = Math.Max(1, RateLimits(context).GlobalPermitLimit),
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    options.AddPolicy(AuthRateLimitPolicy, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = Math.Max(1, RateLimits(context).AuthPermitLimit),
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

var app = builder.Build();

// Das Request-Log liegt aussen, damit es den endgueltigen Statuscode der
// Fehlerbehandlung sieht (z. B. 400 statt einer rohen Ausnahme als 500).
app.UseSerilogRequestLogging(options => options.GetLevel = (httpContext, _, exception) =>
    exception is not null || httpContext.Response.StatusCode >= 500 ? LogEventLevel.Error
    : httpContext.Response.StatusCode >= 400 ? LogEventLevel.Warning
    : LogEventLevel.Information);
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();

    // In der Entwicklung laeuft die API bewusst auch ueber HTTP, damit der
    // Vite-Dev-Proxy ohne Entwicklerzertifikat funktioniert.
    app.UseHttpsRedirection();
}

app.UseCors(CorsPolicyName);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

await MigrateDatabaseAsync(app);

app.Run();

/// <summary>
/// Fuehrt Migrationen und Rollen-Seeding beim Start aus. Schlaegt die Datenbank
/// fehl, startet die API trotzdem, damit der Health-Endpunkt diagnostizierbar bleibt.
/// </summary>
// Grenzen werden pro Anfrage aus den Optionen gelesen, damit sie sich per Konfiguration
// (auch in Integrationstests) setzen lassen.
static RateLimitOptions RateLimits(HttpContext context) =>
    context.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value;

static async Task MigrateDatabaseAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
        await seeder.MigrateAsync();
        await seeder.SeedRolesAsync();
    }
    catch (Exception ex)
    {
        logger.LogError(ex,
            "Die Datenbank konnte nicht initialisiert werden. Laeuft PostgreSQL (docker compose up -d)?");
    }
}

/// <summary>Sichtbar gemacht fuer Integrationstests mit WebApplicationFactory.</summary>
public partial class Program;