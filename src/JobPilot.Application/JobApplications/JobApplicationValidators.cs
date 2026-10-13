using FluentValidation;

using JobPilot.Domain.Enums;

namespace JobPilot.Application.JobApplications;

/// <summary>Gemeinsame Grenzwerte fuer Anlegen und Bearbeiten.</summary>
internal static class JobApplicationRules
{
    public const int MaxTechnologies = 40;
}

public class CreateJobApplicationRequestValidator : AbstractValidator<CreateJobApplicationRequest>
{
    public CreateJobApplicationRequestValidator()
    {
        RuleFor(x => x.CompanyName)
            .NotEmpty().WithMessage("Bitte geben Sie den Firmennamen ein.")
            .MaximumLength(200).WithMessage("Der Firmenname darf höchstens 200 Zeichen lang sein.");

        RuleFor(x => x.JobTitle)
            .NotEmpty().WithMessage("Bitte geben Sie den Jobtitel ein.")
            .MaximumLength(200).WithMessage("Der Jobtitel darf höchstens 200 Zeichen lang sein.");

        RuleFor(x => x.Location)
            .MaximumLength(200).WithMessage("Der Ort darf höchstens 200 Zeichen lang sein.");

        RuleFor(x => x.Salary)
            .MaximumLength(100).WithMessage("Die Gehaltsangabe darf höchstens 100 Zeichen lang sein.");

        RuleFor(x => x.JobPostingUrl)
            .MaximumLength(1000).WithMessage("Der Link darf höchstens 1000 Zeichen lang sein.")
            .Must(BeAValidUrl).WithMessage("Bitte geben Sie einen gültigen Link an (http oder https).");

        RuleFor(x => x.JobDescription)
            .MaximumLength(20000).WithMessage("Die Stellenbeschreibung darf höchstens 20.000 Zeichen lang sein.");

        RuleFor(x => x.Notes)
            .MaximumLength(8000).WithMessage("Die Notizen dürfen höchstens 8.000 Zeichen lang sein.");

        RuleFor(x => x.ContactName)
            .MaximumLength(150).WithMessage("Der Name der Kontaktperson darf höchstens 150 Zeichen lang sein.");

        RuleFor(x => x.ContactEmail)
            .MaximumLength(256).WithMessage("Die E-Mail-Adresse darf höchstens 256 Zeichen lang sein.")
            .EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.ContactEmail))
            .WithMessage("Bitte geben Sie eine gültige E-Mail-Adresse ein.");

        RuleFor(x => x.ContactPhone)
            .MaximumLength(50).WithMessage("Die Telefonnummer darf höchstens 50 Zeichen lang sein.");

        RuleFor(x => x.InterviewLocation)
            .MaximumLength(300).WithMessage("Der Ort des Gesprächs darf höchstens 300 Zeichen lang sein.");

        RuleFor(x => x.Status).IsInEnum().WithMessage("Der Bewerbungsstatus ist unbekannt.");
        RuleFor(x => x.EmploymentType).IsInEnum().WithMessage("Die Beschäftigungsart ist unbekannt.");
        RuleFor(x => x.WorkModel).IsInEnum().WithMessage("Das Arbeitsmodell ist unbekannt.");

        RuleFor(x => x.Technologies)
            .Must(list => list is null || list.Count <= JobApplicationRules.MaxTechnologies)
            .WithMessage($"Es sind höchstens {JobApplicationRules.MaxTechnologies} Technologien erlaubt.")
            .Must(list => list is null || list.All(item => item.Length <= 60))
            .WithMessage("Eine Technologie darf höchstens 60 Zeichen lang sein.");

        RuleFor(x => x.AppliedOn)
            .Must(date => date is null || date.Value <= DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)))
            .WithMessage("Das Bewerbungsdatum darf nicht in der Zukunft liegen.");

        RuleFor(x => x.AppliedOn)
            .NotNull()
            .When(x => x.Status != ApplicationStatus.Draft)
            .WithMessage("Ab dem Status \"Beworben\" wird ein Bewerbungsdatum benötigt.");
    }

    internal static bool BeAValidUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}

public class UpdateJobApplicationRequestValidator : AbstractValidator<UpdateJobApplicationRequest>
{
    public UpdateJobApplicationRequestValidator()
    {
        // Die Regeln sind bewusst identisch zum Anlegen: Ein Datensatz darf durch
        // eine Bearbeitung niemals in einen ungueltigen Zustand geraten.
        RuleFor(x => x.CompanyName)
            .NotEmpty().WithMessage("Bitte geben Sie den Firmennamen ein.")
            .MaximumLength(200).WithMessage("Der Firmenname darf höchstens 200 Zeichen lang sein.");

        RuleFor(x => x.JobTitle)
            .NotEmpty().WithMessage("Bitte geben Sie den Jobtitel ein.")
            .MaximumLength(200).WithMessage("Der Jobtitel darf höchstens 200 Zeichen lang sein.");

        RuleFor(x => x.Location)
            .MaximumLength(200).WithMessage("Der Ort darf höchstens 200 Zeichen lang sein.");

        RuleFor(x => x.Salary)
            .MaximumLength(100).WithMessage("Die Gehaltsangabe darf höchstens 100 Zeichen lang sein.");

        RuleFor(x => x.JobPostingUrl)
            .MaximumLength(1000).WithMessage("Der Link darf höchstens 1000 Zeichen lang sein.")
            .Must(CreateJobApplicationRequestValidator.BeAValidUrl)
            .WithMessage("Bitte geben Sie einen gültigen Link an (http oder https).");

        RuleFor(x => x.JobDescription)
            .MaximumLength(20000).WithMessage("Die Stellenbeschreibung darf höchstens 20.000 Zeichen lang sein.");

        RuleFor(x => x.Notes)
            .MaximumLength(8000).WithMessage("Die Notizen dürfen höchstens 8.000 Zeichen lang sein.");

        RuleFor(x => x.ContactName)
            .MaximumLength(150).WithMessage("Der Name der Kontaktperson darf höchstens 150 Zeichen lang sein.");

        RuleFor(x => x.ContactEmail)
            .MaximumLength(256).WithMessage("Die E-Mail-Adresse darf höchstens 256 Zeichen lang sein.")
            .EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.ContactEmail))
            .WithMessage("Bitte geben Sie eine gültige E-Mail-Adresse ein.");

        RuleFor(x => x.ContactPhone)
            .MaximumLength(50).WithMessage("Die Telefonnummer darf höchstens 50 Zeichen lang sein.");

        RuleFor(x => x.InterviewLocation)
            .MaximumLength(300).WithMessage("Der Ort des Gesprächs darf höchstens 300 Zeichen lang sein.");

        RuleFor(x => x.Status).IsInEnum().WithMessage("Der Bewerbungsstatus ist unbekannt.");
        RuleFor(x => x.EmploymentType).IsInEnum().WithMessage("Die Beschäftigungsart ist unbekannt.");
        RuleFor(x => x.WorkModel).IsInEnum().WithMessage("Das Arbeitsmodell ist unbekannt.");

        RuleFor(x => x.Technologies)
            .Must(list => list is null || list.Count <= JobApplicationRules.MaxTechnologies)
            .WithMessage($"Es sind höchstens {JobApplicationRules.MaxTechnologies} Technologien erlaubt.")
            .Must(list => list is null || list.All(item => item.Length <= 60))
            .WithMessage("Eine Technologie darf höchstens 60 Zeichen lang sein.");

        RuleFor(x => x.AppliedOn)
            .Must(date => date is null || date.Value <= DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)))
            .WithMessage("Das Bewerbungsdatum darf nicht in der Zukunft liegen.");

        RuleFor(x => x.AppliedOn)
            .NotNull()
            .When(x => x.Status != ApplicationStatus.Draft)
            .WithMessage("Ab dem Status \"Beworben\" wird ein Bewerbungsdatum benötigt.");
    }
}

public class ChangeStatusRequestValidator : AbstractValidator<ChangeStatusRequest>
{
    public ChangeStatusRequestValidator()
    {
        RuleFor(x => x.Status).IsInEnum().WithMessage("Der Bewerbungsstatus ist unbekannt.");

        RuleFor(x => x.Comment)
            .MaximumLength(1000).WithMessage("Der Kommentar darf höchstens 1.000 Zeichen lang sein.");
    }
}

public class JobApplicationQueryValidator : AbstractValidator<JobApplicationQuery>
{
    public JobApplicationQueryValidator()
    {
        RuleFor(x => x.Page)
            .GreaterThan(0).WithMessage("Die Seitenzahl muss mindestens 1 betragen.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, JobApplicationQuery.MaxPageSize)
            .WithMessage($"Die Seitengröße muss zwischen 1 und {JobApplicationQuery.MaxPageSize} liegen.");

        RuleFor(x => x.Search)
            .MaximumLength(200).WithMessage("Der Suchbegriff darf höchstens 200 Zeichen lang sein.");

        RuleFor(x => x.SortBy).IsInEnum().WithMessage("Das Sortierkriterium ist unbekannt.");

        RuleFor(x => x.AppliedTo)
            .GreaterThanOrEqualTo(x => x.AppliedFrom!.Value)
            .When(x => x.AppliedFrom.HasValue && x.AppliedTo.HasValue)
            .WithMessage("Das Enddatum darf nicht vor dem Startdatum liegen.");
    }
}