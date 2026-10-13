using FluentValidation;

namespace JobPilot.Application.Profile;

public class ExtractResumeProfileRequestValidator : AbstractValidator<ExtractResumeProfileRequest>
{
    public ExtractResumeProfileRequestValidator()
    {
        RuleFor(x => x.ResumeText)
            .NotEmpty().WithMessage("Bitte zuerst einen Lebenslauf-Text eingeben.")
            .MaximumLength(100_000).WithMessage("Der Lebenslauf-Text darf höchstens 100.000 Zeichen lang sein.");
    }
}
