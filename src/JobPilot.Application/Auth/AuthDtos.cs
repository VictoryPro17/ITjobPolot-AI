namespace JobPilot.Application.Auth;

/// <summary>Registrierung eines neuen Benutzerkontos.</summary>
public record RegisterRequest(
    string Email,
    string Password,
    string? FirstName,
    string? LastName);

/// <summary>Anmeldung mit E-Mail und Passwort.</summary>
public record LoginRequest(
    string Email,
    string Password,
    bool RememberMe = true);

/// <summary>Anforderung eines Links zum Zuruecksetzen des Passworts.</summary>
public record ForgotPasswordRequest(string Email);

/// <summary>Neues Passwort mit dem Token aus der E-Mail setzen.</summary>
public record ResetPasswordRequest(string Email, string Token, string NewPassword);

/// <summary>E-Mail-Adresse mit dem Token aus der Bestaetigungsmail bestaetigen.</summary>
public record ConfirmEmailRequest(Guid UserId, string Token);

/// <summary>Aenderung des eigenen Passworts.</summary>
public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword);

/// <summary>Aenderung der eigenen Profildaten.</summary>
public record UpdateProfileRequest(
    string? FirstName,
    string? LastName,
    string? TargetJobTitle,
    string? Location,
    string? ProfileSummary,
    string? ExperienceSummary,
    string? EducationSummary,
    string? ResumeText,
    IReadOnlyList<string>? Skills,
    string? ThemePreference,
    string? AccentColor = null);

/// <summary>Profil des angemeldeten Benutzers.</summary>
public record CurrentUserResponse(
    Guid Id,
    string Email,
    string DisplayName,
    string? FirstName,
    string? LastName,
    string? TargetJobTitle,
    string? Location,
    string? ProfileSummary,
    string? ExperienceSummary,
    string? EducationSummary,
    string? ResumeText,
    IReadOnlyList<string> Skills,
    string ThemePreference,
    IReadOnlyList<string> Roles,
    DateTimeOffset CreatedAt,
    long? AvatarVersion = null,
    string AccentColor = "blue",
    bool OnboardingCompleted = false,
    bool EmailConfirmed = false);