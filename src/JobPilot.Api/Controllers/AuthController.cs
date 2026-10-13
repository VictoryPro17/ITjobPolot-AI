using JobPilot.Application.Auth;
using JobPilot.Application.Common;
using JobPilot.Domain.Constants;
using JobPilot.Domain.Entities;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace JobPilot.Api.Controllers;

/// <summary>
/// Benutzerverwaltung auf Basis von ASP.NET Core Identity mit Cookie-Sitzungen.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    ILogger<AuthController> logger) : ControllerBase
{
    /// <summary>Legt ein neues Konto an und meldet den Benutzer direkt an.</summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<CurrentUserResponse>> Register(RegisterRequest request)
    {
        var email = request.Email.Trim();

        if (await userManager.FindByEmailAsync(email) is not null)
        {
            throw new ConflictException("Für diese E-Mail-Adresse besteht bereits ein Konto.");
        }

        var user = new ApplicationUser
        {
            Id = Guid.CreateVersion7(),
            UserName = email,
            Email = email,
            FirstName = Normalize(request.FirstName),
            LastName = Normalize(request.LastName)
        };

        var result = await userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            throw ToValidationException(result, nameof(request.Password));
        }

        await userManager.AddToRoleAsync(user, Roles.User);
        await signInManager.SignInAsync(user, isPersistent: true);

        logger.LogInformation("Neues Benutzerkonto {UserId} angelegt.", user.Id);

        return Created($"/api/auth/me", await BuildResponseAsync(user));
    }

    /// <summary>Meldet einen Benutzer an und setzt das Sitzungscookie.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<CurrentUserResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());

        // Einheitliche Meldung: Es darf nicht erkennbar sein, ob die Adresse existiert.
        if (user is null)
        {
            throw new ValidationFailedException("credentials", "E-Mail-Adresse oder Passwort ist falsch.");
        }

        var result = await signInManager.PasswordSignInAsync(
            user, request.Password, request.RememberMe, lockoutOnFailure: true);

        if (result.IsLockedOut)
        {
            throw new ValidationFailedException(
                "credentials",
                "Das Konto ist nach mehreren Fehlversuchen vorübergehend gesperrt. Bitte versuchen Sie es in 15 Minuten erneut.");
        }

        if (!result.Succeeded)
        {
            logger.LogInformation("Fehlgeschlagener Anmeldeversuch für {UserId}.", user.Id);
            throw new ValidationFailedException("credentials", "E-Mail-Adresse oder Passwort ist falsch.");
        }

        return Ok(await BuildResponseAsync(user));
    }

    /// <summary>Beendet die Sitzung und loescht das Cookie.</summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await signInManager.SignOutAsync();
        return NoContent();
    }

    /// <summary>Liefert das Profil des angemeldeten Benutzers.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<CurrentUserResponse>> Me()
    {
        var user = await GetCurrentUserAsync();
        return Ok(await BuildResponseAsync(user));
    }

    /// <summary>Aktualisiert die eigenen Profildaten.</summary>
    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<CurrentUserResponse>> UpdateProfile(UpdateProfileRequest request)
    {
        var user = await GetCurrentUserAsync();

        user.FirstName = Normalize(request.FirstName);
        user.LastName = Normalize(request.LastName);
        user.TargetJobTitle = Normalize(request.TargetJobTitle);
        user.Location = Normalize(request.Location);
        user.ThemePreference = request.ThemePreference ?? user.ThemePreference;

        var result = await userManager.UpdateAsync(user);

        if (!result.Succeeded)
        {
            throw ToValidationException(result, "profile");
        }

        return Ok(await BuildResponseAsync(user));
    }

    /// <summary>Aendert das eigene Passwort und erneuert die Sitzung.</summary>
    [HttpPost("change-password")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var user = await GetCurrentUserAsync();

        var result = await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);

        if (!result.Succeeded)
        {
            var field = result.Errors.Any(e => e.Code == "PasswordMismatch")
                ? nameof(request.CurrentPassword)
                : nameof(request.NewPassword);

            throw ToValidationException(result, field);
        }

        // Nach einer Passwortaenderung wird der Sicherheitsstempel erneuert,
        // damit bestehende Sitzungen auf anderen Geraeten ungueltig werden.
        await signInManager.RefreshSignInAsync(user);

        logger.LogInformation("Passwort für Benutzer {UserId} geändert.", user.Id);

        return NoContent();
    }

    private async Task<ApplicationUser> GetCurrentUserAsync() =>
        await userManager.GetUserAsync(User)
        ?? throw new UnauthorizedAccessException("Es ist kein Benutzer angemeldet.");

    private async Task<CurrentUserResponse> BuildResponseAsync(ApplicationUser user)
    {
        var roles = await userManager.GetRolesAsync(user);

        return new CurrentUserResponse(
            user.Id,
            user.Email ?? string.Empty,
            user.DisplayName,
            user.FirstName,
            user.LastName,
            user.TargetJobTitle,
            user.Location,
            user.ThemePreference,
            [.. roles],
            user.CreatedAt);
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ValidationFailedException ToValidationException(IdentityResult result, string field)
    {
        var messages = result.Errors
            .Select(error => Translate(error))
            .ToArray();

        return new ValidationFailedException(new Dictionary<string, string[]> { [field] = messages });
    }

    private static string Translate(IdentityError error) => error.Code switch
    {
        "PasswordTooShort" => $"Das Passwort muss mindestens {PasswordRules.MinimumLength} Zeichen lang sein.",
        "PasswordRequiresDigit" => "Das Passwort muss mindestens eine Ziffer enthalten.",
        "PasswordRequiresLower" => "Das Passwort muss mindestens einen Kleinbuchstaben enthalten.",
        "PasswordRequiresUpper" => "Das Passwort muss mindestens einen Großbuchstaben enthalten.",
        "PasswordMismatch" => "Das aktuelle Passwort ist falsch.",
        "DuplicateUserName" or "DuplicateEmail" => "Für diese E-Mail-Adresse besteht bereits ein Konto.",
        "InvalidEmail" => "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
        _ => error.Description
    };
}