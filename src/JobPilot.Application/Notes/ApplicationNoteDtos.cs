using FluentValidation;

namespace JobPilot.Application.Notes;

/// <summary>Chronologische Notiz zu einer Bewerbung.</summary>
public record ApplicationNoteDto(Guid Id, Guid JobApplicationId, string Content, DateTimeOffset CreatedAt);

/// <summary>Neue Notiz zu einer Bewerbung.</summary>
public record CreateApplicationNoteRequest(string Content);

public class CreateApplicationNoteRequestValidator : AbstractValidator<CreateApplicationNoteRequest>
{
    public const int MaxContentLength = 4000;

    public CreateApplicationNoteRequestValidator()
    {
        RuleFor(x => x.Content)
            .Must(content => !string.IsNullOrWhiteSpace(content)).WithMessage("Bitte gib einen Text für die Notiz ein.")
            .MaximumLength(MaxContentLength).WithMessage("Eine Notiz darf höchstens 4.000 Zeichen lang sein.");
    }
}
