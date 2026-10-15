using JobPilot.Domain.Entities;
using JobPilot.Infrastructure.Persistence;

using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace JobPilot.Api.Extensions;

/// <summary>
/// Konfiguriert ASP.NET Core Identity inklusive Cookie-Authentifizierung.
/// </summary>
public static class IdentityServiceExtensions
{
    public static IServiceCollection AddJobPilotIdentity(
        this IServiceCollection services,
        IHostEnvironment environment)
    {
        services.AddIdentityCore<ApplicationUser>(options =>
            {
                options.User.RequireUniqueEmail = true;

                options.Password.RequiredLength = 10;
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = false;

                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.Lockout.AllowedForNewUsers = true;

                // Bestaetigung ist erwuenscht, aber keine Voraussetzung fuer die Anmeldung.
                options.SignIn.RequireConfirmedAccount = false;

                // Bestaetigungslinks laufen laenger als Passwort-Links (eigener Anbieter, siehe unten).
                options.Tokens.EmailConfirmationTokenProvider = EmailConfirmationTokenProvider.ProviderName;
            })
            .AddRoles<ApplicationRole>()
            .AddEntityFrameworkStores<JobPilotDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders()
            .AddTokenProvider<EmailConfirmationTokenProvider>(EmailConfirmationTokenProvider.ProviderName);

        // Links zum Zuruecksetzen des Passworts gelten 2 Stunden (Standard-Anbieter),
        // Bestaetigungslinks 3 Tage. Beide werden mit dem Sicherheitsstempel ungueltig.
        services.Configure<DataProtectionTokenProviderOptions>(options => options.TokenLifespan = TimeSpan.FromHours(2));
        services.Configure<EmailConfirmationTokenProviderOptions>(options =>
        {
            options.Name = EmailConfirmationTokenProvider.ProviderName;
            options.TokenLifespan = TimeSpan.FromDays(3);
        });

        // Identity-Cookies statt JWT: Das Frontend laeuft als First-Party-SPA,
        // HttpOnly-Cookies schuetzen das Sitzungstoken zuverlaessig vor XSS-Zugriff.
        services
            .AddAuthentication(IdentityConstants.ApplicationScheme)
            .AddIdentityCookies();

        services.ConfigureApplicationCookie(options =>
        {
            options.Cookie.Name = "jobpilot.auth";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;

            // In der Entwicklung laeuft die API ueber HTTP (Vite-Dev-Proxy). Mit
            // CookieSecurePolicy.Always wuerde der Browser das Cookie verwerfen.
            options.Cookie.SecurePolicy = environment.IsDevelopment()
                ? CookieSecurePolicy.SameAsRequest
                : CookieSecurePolicy.Always;

            options.ExpireTimeSpan = TimeSpan.FromDays(14);
            options.SlidingExpiration = true;

            // Eine API darf nicht auf eine Login-Seite umleiten, sondern muss Statuscodes liefern.
            options.Events.OnRedirectToLogin = ctx =>
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = ctx =>
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            };
        });

        return services;
    }
}

/// <summary>Optionen des Anbieters fuer Bestaetigungslinks (eigene Gueltigkeitsdauer).</summary>
public class EmailConfirmationTokenProviderOptions : DataProtectionTokenProviderOptions;

/// <summary>Token-Anbieter fuer E-Mail-Bestaetigungen mit eigener, laengerer Gueltigkeitsdauer.</summary>
public class EmailConfirmationTokenProvider(
    IDataProtectionProvider dataProtectionProvider,
    IOptions<EmailConfirmationTokenProviderOptions> options,
    ILogger<DataProtectorTokenProvider<ApplicationUser>> logger)
    : DataProtectorTokenProvider<ApplicationUser>(dataProtectionProvider, options, logger)
{
    public const string ProviderName = "EmailConfirmation";
}
