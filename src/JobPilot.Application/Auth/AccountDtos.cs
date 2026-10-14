using FluentValidation;

namespace JobPilot.Application.Auth;

/// <summary>Endgueltiges Loeschen des eigenen Kontos; erfordert das aktuelle Passwort.</summary>
public record DeleteAccountRequest(string Password);

/// <summary>Datenexport des Benutzers (DSGVO Art. 15/20). Dateien selbst sind nicht enthalten.</summary>
public record AccountExport(
    DateTimeOffset ExportedAt,
    object Profile,
    object Applications,
    object Reminders,
    object Documents,
    object Analyses,
    object CoverLetters);

public class DeleteAccountRequestValidator : AbstractValidator<DeleteAccountRequest>
{
    public DeleteAccountRequestValidator()
    {
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Bitte das aktuelle Passwort eingeben.");
    }
}
