using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;

using JobPilot.Api.Services;
using JobPilot.Application.Abstractions;
using JobPilot.Application.Auth;
using JobPilot.Application.Common;
using JobPilot.Application.Matching;
using JobPilot.Application.Profile;
using JobPilot.Domain.Constants;
using JobPilot.Infrastructure.Email;
using JobPilot.Infrastructure.Services;
using JobPilot.Domain.Entities;
using JobPilot.Domain.Enums;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace JobPilot.Api.Controllers;

/// <summary>
/// Benutzerverwaltung auf Basis von ASP.NET Core Identity mit Cookie-Sitzungen.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    JobPilot.Infrastructure.Persistence.JobPilotDbContext db,
    ResumeParsingService resumeParsingService,
    IResumeProfileExtractor resumeProfileExtractor,
    IFileStorage fileStorage,
    IAccountService accountService,
    IAvatarService avatarService,
    IOptions<StorageOptions> storageOptions,
    IOptions<AppOptions> appOptions,
    IEmailQueue emailQueue,
    TimeProvider timeProvider,
    ILogger<AuthController> logger) : ControllerBase
{
    private readonly StorageOptions _storageOptions = storageOptions.Value;
    private readonly AppOptions _appOptions = appOptions.Value;

    private const string InvalidResetLinkMessage = "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.";
    private const string InvalidConfirmationLinkMessage = "Der Bestätigungslink ist ungültig oder abgelaufen. Du kannst in der App einen neuen anfordern.";

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
        await QueueConfirmationEmailAsync(user, HttpContext.RequestAborted);

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
                "Das Konto ist nach mehreren Fehlversuchen vorübergehend gesperrt. Bitte versuche es in 15 Minuten erneut.");
        }

        if (!result.Succeeded)
        {
            logger.LogInformation("Fehlgeschlagener Anmeldeversuch für {UserId}.", user.Id);
            throw new ValidationFailedException("credentials", "E-Mail-Adresse oder Passwort ist falsch.");
        }

        return Ok(await BuildResponseAsync(user));
    }

    /// <summary>
    /// Verschickt einen Link zum Zuruecksetzen des Passworts. Antwortet immer mit 204, damit sich nicht
    /// erkennen laesst, ob zu einer Adresse ein Konto existiert; der Versand laeuft im Hintergrund.
    /// </summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());

        if (user?.Email is not null)
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var link = AccountEmails.BuildLink(_appOptions.FrontendBaseUrl, AccountEmails.ResetPasswordPath, new Dictionary<string, string>
            {
                ["email"] = user.Email,
                ["token"] = AccountEmails.EncodeToken(token)
            });

            await emailQueue.EnqueueAsync(AccountEmails.PasswordReset(user.Email, user.FirstName, link), cancellationToken);
            logger.LogInformation("Passwort-Reset fuer {UserId} angefordert.", user.Id);
        }

        return NoContent();
    }

    /// <summary>Setzt mit dem Token aus der E-Mail ein neues Passwort. Das Token gilt nur einmal.</summary>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());
        var token = AccountEmails.DecodeToken(request.Token);

        if (user is null || token is null)
        {
            throw new ValidationFailedException("token", InvalidResetLinkMessage);
        }

        var result = await userManager.ResetPasswordAsync(user, token, request.NewPassword);
        if (!result.Succeeded)
        {
            throw result.Errors.Any(error => error.Code == "InvalidToken")
                ? new ValidationFailedException("token", InvalidResetLinkMessage)
                : ToValidationException(result, nameof(request.NewPassword));
        }

        // Wer den Link aus der E-Mail nutzt, hat Zugriff auf das Postfach: Adresse gilt als bestaetigt.
        // Eine Sperre nach Fehlversuchen wird aufgehoben, damit die Anmeldung sofort klappt.
        user.EmailConfirmed = true;
        await userManager.UpdateAsync(user);
        await userManager.ResetAccessFailedCountAsync(user);
        await userManager.SetLockoutEndDateAsync(user, null);

        logger.LogInformation("Passwort fuer {UserId} ueber E-Mail-Link zurueckgesetzt.", user.Id);
        return NoContent();
    }

    /// <summary>Bestaetigt die E-Mail-Adresse mit dem Token aus der Bestaetigungsmail.</summary>
    [HttpPost("confirm-email")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ConfirmEmail(ConfirmEmailRequest request)
    {
        var user = await userManager.FindByIdAsync(request.UserId.ToString());
        var token = AccountEmails.DecodeToken(request.Token);

        if (user is null || token is null)
        {
            throw new ValidationFailedException("token", InvalidConfirmationLinkMessage);
        }

        if (user.EmailConfirmed)
        {
            return NoContent();
        }

        var result = await userManager.ConfirmEmailAsync(user, token);
        if (!result.Succeeded)
        {
            throw new ValidationFailedException("token", InvalidConfirmationLinkMessage);
        }

        logger.LogInformation("E-Mail-Adresse von {UserId} bestaetigt.", user.Id);
        return NoContent();
    }

    /// <summary>Verschickt die Bestaetigungsmail fuer den angemeldeten Benutzer erneut.</summary>
    [HttpPost("resend-confirmation")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResendConfirmation(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync();
        if (!user.EmailConfirmed)
        {
            await QueueConfirmationEmailAsync(user, cancellationToken);
        }

        return NoContent();
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
        user.ProfileSummary = Normalize(request.ProfileSummary);
        user.ExperienceSummary = Normalize(request.ExperienceSummary);
        user.EducationSummary = Normalize(request.EducationSummary);
        user.ResumeText = Normalize(request.ResumeText);
        user.Skills = NormalizeSkills(request.Skills);
        user.ThemePreference = request.ThemePreference ?? user.ThemePreference;
        user.AccentColor = request.AccentColor ?? user.AccentColor;
        user.TryCompleteOnboarding(timeProvider.GetUtcNow());

        var result = await userManager.UpdateAsync(user);

        if (!result.Succeeded)
        {
            throw ToValidationException(result, "profile");
        }

        return Ok(await BuildResponseAsync(user));
    }

    /// <summary>
    /// Speichert einen Lebenslauf als Dokument und liefert einen Profilvorschlag.
    /// Das Profil selbst wird erst ueber <see cref="UpdateProfile"/> geaendert.
    /// </summary>
    [HttpPost("profile/resume")]
    [Authorize]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ResumeProfileSuggestion>> UploadResume(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            throw new ValidationFailedException("file", "Bitte wähle eine gültige Datei aus.");
        }

        if (file.Length > _storageOptions.MaxFileSizeInBytes)
        {
            throw new ValidationFailedException("file", $"Die Datei ist größer als das erlaubte Limit von {_storageOptions.MaxFileSizeInBytes} Bytes.");
        }

        var extension = Path.GetExtension(file.FileName);
        var allowedExtensions = _storageOptions.AllowedExtensions ?? [];
        if (!allowedExtensions.Any(ext => string.Equals(ext, extension, StringComparison.OrdinalIgnoreCase)))
        {
            throw new ValidationFailedException("file", "Dieses Dateiformat wird für Lebensläufe nicht unterstützt.");
        }

        // Die Datei wird genau einmal gelesen und fuer Parsing, Hash und Ablage wiederverwendet.
        using var buffer = new MemoryStream();
        await file.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();

        var extractedText = resumeParsingService.ExtractText(bytes, file.FileName);
        if (string.IsNullOrWhiteSpace(extractedText))
        {
            throw new ValidationFailedException("file", "Die Datei konnte nicht als lesbarer Lebenslauf erkannt werden.");
        }

        var user = await GetCurrentUserAsync();

        var storagePath = await fileStorage.SaveAsync(bytes, extension, cancellationToken);

        try
        {
            db.UserDocuments.Add(new UserDocument
            {
                UserId = user.Id,
                FileName = Path.GetFileName(file.FileName),
                StoragePath = storagePath,
                ContentType = FileSignature.ContentTypeFor(extension),
                SizeInBytes = file.Length,
                DocumentType = DocumentType.Resume,
                Sha256 = Convert.ToHexString(SHA256.HashData(bytes)),
                ExtractedText = extractedText
            });

            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // Ohne Datenbankeintrag waere die Datei verwaist.
            fileStorage.Delete(storagePath);
            throw;
        }

        logger.LogInformation("Lebenslauf für Benutzer {UserId} hochgeladen und extrahiert.", user.Id);

        return Ok(await resumeProfileExtractor.ExtractAsync(extractedText, cancellationToken));
    }

    /// <summary>Liefert einen Profilvorschlag aus eingefuegtem Lebenslauf-Text, ohne zu speichern.</summary>
    [HttpPost("profile/resume/extract")]
    [Authorize]
    public async Task<ActionResult<ResumeProfileSuggestion>> ExtractResumeProfile(
        ExtractResumeProfileRequest request,
        CancellationToken cancellationToken) =>
        Ok(await resumeProfileExtractor.ExtractAsync(request.ResumeText.Trim(), cancellationToken));

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

    /// <summary>Laedt ein neues Profilbild hoch (PNG/JPG, max. 2 MB) und ersetzt das bisherige.</summary>
    [HttpPost("profile/avatar")]
    [Authorize]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<CurrentUserResponse>> UploadAvatar(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length > AvatarService.MaxSizeInBytes)
        {
            throw new ValidationFailedException("file", "Das Profilbild darf höchstens 2 MB groß sein.");
        }

        using var buffer = new MemoryStream();
        await file.CopyToAsync(buffer, cancellationToken);
        await avatarService.UploadAsync(buffer.ToArray(), file.FileName, cancellationToken);

        return Ok(await BuildResponseAsync(await GetCurrentUserAsync()));
    }

    /// <summary>Liefert das eigene Profilbild.</summary>
    [HttpGet("profile/avatar")]
    [Authorize]
    public async Task<IActionResult> GetAvatar(CancellationToken cancellationToken)
    {
        var avatar = await avatarService.OpenAsync(cancellationToken);
        if (avatar is null)
        {
            return NotFound();
        }

        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.CacheControl = "private, max-age=86400";
        return File(avatar.Value.Content, avatar.Value.ContentType);
    }

    /// <summary>Entfernt das eigene Profilbild.</summary>
    [HttpDelete("profile/avatar")]
    [Authorize]
    public async Task<ActionResult<CurrentUserResponse>> DeleteAvatar(CancellationToken cancellationToken)
    {
        await avatarService.DeleteAsync(cancellationToken);
        return Ok(await BuildResponseAsync(await GetCurrentUserAsync()));
    }

    /// <summary>Exportiert alle eigenen Daten als JSON-Datei (ohne hochgeladene Dateien).</summary>
    [HttpGet("export")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Export(CancellationToken cancellationToken)
    {
        var export = await accountService.ExportAsync(cancellationToken);
        var content = JsonSerializer.SerializeToUtf8Bytes(export, ExportJsonOptions);

        return File(content, "application/json", $"jobpilot-export-{export.ExportedAt:yyyyMMdd}.json");
    }

    /// <summary>Loescht das eigene Konto samt aller Daten und Dateien endgueltig.</summary>
    [HttpDelete("account")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> DeleteAccount(DeleteAccountRequest request, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync();

        if (!await userManager.CheckPasswordAsync(user, request.Password))
        {
            throw new ValidationFailedException(nameof(request.Password), "Das Passwort ist falsch.");
        }

        await accountService.DeleteAccountAsync(cancellationToken);
        await signInManager.SignOutAsync();

        return NoContent();
    }

    private static readonly JsonSerializerOptions ExportJsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() }
    };

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
            user.ProfileSummary,
            user.ExperienceSummary,
            user.EducationSummary,
            user.ResumeText,
            [.. user.Skills.Where(skill => !string.IsNullOrWhiteSpace(skill)).Select(skill => skill.Trim())],
            user.ThemePreference,
            [.. roles],
            user.CreatedAt,
            user.AvatarStoragePath is null ? null : user.AvatarUpdatedAt?.ToUnixTimeMilliseconds(),
            user.AccentColor,
            user.OnboardingCompletedAt is not null,
            user.EmailConfirmed);
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static List<string> NormalizeSkills(IReadOnlyList<string>? skills) =>
        skills?
            .Where(skill => !string.IsNullOrWhiteSpace(skill))
            .Select(SkillCatalog.Canonicalize)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList() ?? [];

    private async Task QueueConfirmationEmailAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        if (user.Email is null)
        {
            return;
        }

        var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
        var link = AccountEmails.BuildLink(_appOptions.FrontendBaseUrl, AccountEmails.ConfirmEmailPath, new Dictionary<string, string>
        {
            ["userId"] = user.Id.ToString(),
            ["token"] = AccountEmails.EncodeToken(token)
        });

        await emailQueue.EnqueueAsync(AccountEmails.Confirmation(user.Email, user.FirstName, link), cancellationToken);
    }

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
        "InvalidEmail" => "Bitte gib eine gültige E-Mail-Adresse ein.",
        _ => error.Description
    };
}