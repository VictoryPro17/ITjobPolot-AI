using JobPilot.Domain.Entities;
using JobPilot.Infrastructure.Persistence;

using Microsoft.AspNetCore.Identity;

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

                options.SignIn.RequireConfirmedAccount = false;
            })
            .AddRoles<ApplicationRole>()
            .AddEntityFrameworkStores<JobPilotDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders();

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