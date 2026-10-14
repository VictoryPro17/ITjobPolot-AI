using FluentValidation;

using JobPilot.Domain.Enums;

namespace JobPilot.Application.Reminders;

/// <summary>Erinnerung fuer die Oberflaeche.</summary>
public record ReminderDto(
    Guid Id,
    string Title,
    string? Description,
    DateTimeOffset DueAt,
    ReminderType ReminderType,
    bool IsCompleted,
    DateTimeOffset? CompletedAt,
    bool IsOverdue,
    Guid? JobApplicationId,
    string? JobApplicationLabel,
    DateTimeOffset CreatedAt);

/// <summary>Anlegen oder Bearbeiten einer Erinnerung.</summary>
public record SaveReminderRequest(
    string Title,
    string? Description,
    DateTimeOffset DueAt,
    ReminderType ReminderType,
    Guid? JobApplicationId);

/// <summary>Filter fuer die Erinnerungsliste.</summary>
public enum ReminderFilter
{
    Open = 0,
    Completed = 1,
    All = 2
}

public class SaveReminderRequestValidator : AbstractValidator<SaveReminderRequest>
{
    public SaveReminderRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Bitte einen Titel angeben.")
            .MaximumLength(200).WithMessage("Der Titel darf höchstens 200 Zeichen lang sein.");

        RuleFor(x => x.Description)
            .MaximumLength(4000).WithMessage("Die Beschreibung darf höchstens 4000 Zeichen lang sein.");

        RuleFor(x => x.ReminderType)
            .IsInEnum().WithMessage("Ungültiger Erinnerungstyp.");

        RuleFor(x => x.DueAt)
            .NotEqual(default(DateTimeOffset)).WithMessage("Bitte ein Fälligkeitsdatum angeben.");
    }
}
