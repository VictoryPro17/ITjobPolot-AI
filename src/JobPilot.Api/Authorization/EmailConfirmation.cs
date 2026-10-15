using System.Security.Claims;

using JobPilot.Domain.Entities;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace JobPilot.Api.Authorization;

/// <summary>
/// E-Mail-Bestaetigung als Pflicht: Die Standard-Policy aller [Authorize]-Endpunkte verlangt eine
/// bestaetigte Adresse. Nur wenige Endpunkte (Profil abrufen, Abmelden, Mail erneut senden,
/// Export, Konto loeschen) sind mit <see cref="AllowUnconfirmedPolicy"/> auch vorher erreichbar.
/// </summary>
public static class EmailConfirmation
{
    /// <summary>Claim im Anmelde-Cookie, damit nicht jede Anfrage die Datenbank fragen muss.</summary>
    public const string ClaimType = "jobpilot:email_confirmed";

    public const string AllowUnconfirmedPolicy = "AllowUnconfirmedEmail";

    public const string ForbiddenDetail = "Bitte bestätige zuerst deine E-Mail-Adresse.";

    public static void Configure(AuthorizationOptions options)
    {
        options.DefaultPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .RequireClaim(ClaimType, "true")
            .Build();

        options.AddPolicy(AllowUnconfirmedPolicy, policy => policy.RequireAuthenticatedUser());
    }

    public static bool IsConfirmed(ClaimsPrincipal principal) =>
        principal.HasClaim(ClaimType, "true");

    /// <summary>Stimmt der Cookie-Claim nicht mit der Datenbank ueberein (z. B. in anderem Browser bestaetigt)?</summary>
    public static bool IsStale(ClaimsPrincipal principal, ApplicationUser user) =>
        principal.FindFirst(ClaimType)?.Value != (user.EmailConfirmed ? "true" : "false");
}

/// <summary>Ergaenzt das Anmelde-Cookie um den Bestaetigungsstatus der E-Mail-Adresse.</summary>
public class JobPilotClaimsPrincipalFactory(
    UserManager<ApplicationUser> userManager,
    RoleManager<ApplicationRole> roleManager,
    IOptions<IdentityOptions> options)
    : UserClaimsPrincipalFactory<ApplicationUser, ApplicationRole>(userManager, roleManager, options)
{
    protected override async Task<ClaimsIdentity> GenerateClaimsAsync(ApplicationUser user)
    {
        var identity = await base.GenerateClaimsAsync(user);
        identity.AddClaim(new Claim(EmailConfirmation.ClaimType, user.EmailConfirmed ? "true" : "false"));
        return identity;
    }
}
