using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;
using JobPilot.Infrastructure.Ai;
using JobPilot.Infrastructure.Email;
using JobPilot.Infrastructure.Persistence;
using JobPilot.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace JobPilot.Infrastructure;

/// <summary>
/// Registriert die Persistenzschicht. Die Identity-Dienste werden bewusst in der
/// API-Schicht konfiguriert, da SignInManager und Cookies ASP.NET-Core-Belange
/// sind und die Infrastruktur nicht vom Webframework abhaengen soll.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException(
                "Es ist kein Verbindungsstring 'ConnectionStrings:Default' konfiguriert.");

        services.AddDbContext<JobPilotDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsql =>
            {
                npgsql.MigrationsAssembly(typeof(JobPilotDbContext).Assembly.FullName);
                npgsql.EnableRetryOnFailure(3);
            });
        });

        services.AddScoped<DatabaseSeeder>();
        services.AddScoped<IJobApplicationService, JobApplicationService>();
        services.AddScoped<IAiService, AiService>();
        services.TryAddSingleton(TimeProvider.System);

        // Regelbasierte Varianten sind immer registriert: als Standard und als Rueckfall der KI.
        services.AddScoped<HeuristicResumeProfileExtractor>();
        services.AddScoped<HeuristicJobMatchAnalyzer>();
        services.AddScoped<OllamaResumeProfileExtractor>();
        services.AddScoped<OllamaJobMatchAnalyzer>();
        services.AddHttpClient<OllamaClient>((provider, client) =>
        {
            var ai = provider.GetRequiredService<IOptions<AiOptions>>().Value;
            client.BaseAddress = new Uri(ai.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(Math.Max(5, ai.TimeoutSeconds));
        });

        services.AddScoped<IResumeProfileExtractor>(provider => UsesOllama(provider)
            ? provider.GetRequiredService<OllamaResumeProfileExtractor>()
            : provider.GetRequiredService<HeuristicResumeProfileExtractor>());
        services.AddScoped<IJobMatchAnalyzer>(provider => UsesOllama(provider)
            ? provider.GetRequiredService<OllamaJobMatchAnalyzer>()
            : provider.GetRequiredService<HeuristicJobMatchAnalyzer>());

        services.AddSingleton<IFileStorage, LocalFileStorage>();
        services.AddScoped<IDocumentService, DocumentService>();
        services.AddScoped<IReminderService, ReminderService>();
        services.AddScoped<IApplicationNoteService, ApplicationNoteService>();

        // E-Mail: ohne SMTP-Konfiguration nur protokollieren; Versand immer ueber die Warteschlange.
        services.AddScoped<IEmailSender>(provider =>
            provider.GetRequiredService<IOptions<EmailOptions>>().Value.Enabled
                ? ActivatorUtilities.CreateInstance<SmtpEmailSender>(provider)
                : ActivatorUtilities.CreateInstance<LoggingEmailSender>(provider));
        services.AddSingleton<EmailQueue>();
        services.AddSingleton<IEmailQueue>(provider => provider.GetRequiredService<EmailQueue>());
        services.AddHostedService<EmailDispatcher>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<IAvatarService, AvatarService>();

        return services;
    }

    /// <summary>Die lokale KI wird nur genutzt, wenn sie aktiviert und Ollama als Anbieter gewaehlt ist.</summary>
    public static bool UsesOllama(AiOptions options) =>
        options.Enabled && string.Equals(options.Provider, OllamaJobMatchAnalyzer.ProviderName, StringComparison.OrdinalIgnoreCase);

    private static bool UsesOllama(IServiceProvider provider) =>
        UsesOllama(provider.GetRequiredService<IOptions<AiOptions>>().Value);
}