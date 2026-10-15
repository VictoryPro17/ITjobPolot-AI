using FluentValidation;

namespace JobPilot.Application.Auth;

/// <summary>
/// Passwortregeln spiegeln die Identity-Konfiguration wider, damit Benutzer die
/// Anforderungen bereits vor dem Serveraufruf nachvollziehen koennen.
/// </summary>
public static class PasswordRules
{
    public const int MinimumLength = 10;

    public static IRuleBuilderOptions<T, string> Password<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Bitte gib ein Passwort ein.")
            .MinimumLength(MinimumLength)
            .WithMessage($"Das Passwort muss mindestens {MinimumLength} Zeichen lang sein.")
            .MaximumLength(128).WithMessage("Das Passwort darf höchstens 128 Zeichen lang sein.")
            .Matches("[A-Z]").WithMessage("Das Passwort muss mindestens einen Großbuchstaben enthalten.")
            .Matches("[a-z]").WithMessage("Das Passwort muss mindestens einen Kleinbuchstaben enthalten.")
            .Matches("[0-9]").WithMessage("Das Passwort muss mindestens eine Ziffer enthalten.");
}

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Bitte gib eine E-Mail-Adresse ein.")
            .EmailAddress().WithMessage("Bitte gib eine gültige E-Mail-Adresse ein.")
            .MaximumLength(256).WithMessage("Die E-Mail-Adresse darf höchstens 256 Zeichen lang sein.");

        RuleFor(x => x.Password).Password();

        RuleFor(x => x.FirstName)
            .MaximumLength(100).WithMessage("Der Vorname darf höchstens 100 Zeichen lang sein.");

        RuleFor(x => x.LastName)
            .MaximumLength(100).WithMessage("Der Nachname darf höchstens 100 Zeichen lang sein.");
    }
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Bitte gib eine E-Mail-Adresse ein.")
            .EmailAddress().WithMessage("Bitte gib eine gültige E-Mail-Adresse ein.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Bitte gib dein Passwort ein.");
    }
}

public class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Bitte gib eine E-Mail-Adresse ein.")
            .EmailAddress().WithMessage("Bitte gib eine gültige E-Mail-Adresse ein.")
            .MaximumLength(256).WithMessage("Die E-Mail-Adresse darf höchstens 256 Zeichen lang sein.");
    }
}

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Bitte gib eine E-Mail-Adresse ein.")
            .EmailAddress().WithMessage("Bitte gib eine gültige E-Mail-Adresse ein.");

        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Der Link ist unvollständig. Bitte fordere einen neuen an.")
            .MaximumLength(2048).WithMessage("Der Link ist ungültig. Bitte fordere einen neuen an.");

        RuleFor(x => x.NewPassword).Password();
    }
}

public class ConfirmEmailRequestValidator : AbstractValidator<ConfirmEmailRequest>
{
    public ConfirmEmailRequestValidator()
    {
        RuleFor(x => x.UserId).NotEmpty().WithMessage("Der Bestätigungslink ist unvollständig.");

        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Der Bestätigungslink ist unvollständig.")
            .MaximumLength(2048).WithMessage("Der Bestätigungslink ist ungültig.");
    }
}

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Bitte gib dein aktuelles Passwort ein.");

        RuleFor(x => x.NewPassword).Password();

        RuleFor(x => x.NewPassword)
            .NotEqual(x => x.CurrentPassword)
            .WithMessage("Das neue Passwort muss sich vom bisherigen unterscheiden.");
    }
}

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    private static readonly string[] AllowedThemes = ["light", "dark", "system"];
    private static readonly string[] AllowedAccentColors = ["blue", "green", "purple"];

    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.FirstName)
            .MaximumLength(100).WithMessage("Der Vorname darf höchstens 100 Zeichen lang sein.");

        RuleFor(x => x.LastName)
            .MaximumLength(100).WithMessage("Der Nachname darf höchstens 100 Zeichen lang sein.");

        RuleFor(x => x.TargetJobTitle)
            .MaximumLength(150).WithMessage("Die Wunschposition darf höchstens 150 Zeichen lang sein.");

        RuleFor(x => x.Location)
            .MaximumLength(150).WithMessage("Der Ort darf höchstens 150 Zeichen lang sein.");

        RuleFor(x => x.ProfileSummary)
            .MaximumLength(2000).WithMessage("Die Profilzusammenfassung darf höchstens 2000 Zeichen lang sein.");

        RuleFor(x => x.ExperienceSummary)
            .MaximumLength(2000).WithMessage("Die Berufserfahrung darf höchstens 2000 Zeichen lang sein.");

        RuleFor(x => x.EducationSummary)
            .MaximumLength(2000).WithMessage("Die Ausbildung darf höchstens 2000 Zeichen lang sein.");

        RuleFor(x => x.ResumeText)
            .MaximumLength(100_000).WithMessage("Der Lebenslauf-Text darf höchstens 100.000 Zeichen lang sein.");

        RuleFor(x => x.Skills)
            .Must(skills => skills is null || skills.Count <= 100).WithMessage("Es sind höchstens 100 Skills erlaubt.");

        RuleForEach(x => x.Skills)
            .MaximumLength(100).WithMessage("Ein Skill darf höchstens 100 Zeichen lang sein.");

        RuleFor(x => x.ThemePreference)
            .Must(theme => theme is null || AllowedThemes.Contains(theme))
            .WithMessage("Erlaubte Werte sind light, dark oder system.");

        RuleFor(x => x.AccentColor)
            .Must(color => color is null || AllowedAccentColors.Contains(color))
            .WithMessage("Erlaubte Akzentfarben sind blue, green oder purple.");
    }
}