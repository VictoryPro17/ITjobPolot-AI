using JobPilot.Domain.Common;
using JobPilot.Domain.Enums;

namespace JobPilot.Domain.Entities;

/// <summary>Zentrale Entitaet: eine einzelne Bewerbung des Benutzers.</summary>
public class JobApplication : OwnedEntityBase
{
    /// <summary>Firmenname als Freitext - bleibt erhalten, auch ohne verknuepfte Company.</summary>
    public required string CompanyName { get; set; }

    public required string JobTitle { get; set; }

    public string? Location { get; set; }

    public EmploymentType EmploymentType { get; set; } = EmploymentType.Unspecified;

    public WorkModel WorkModel { get; set; } = WorkModel.Unspecified;

    /// <summary>Gehaltsangabe als Freitext, da Angaben sehr unterschiedlich formuliert sind.</summary>
    public string? Salary { get; set; }

    public string? JobPostingUrl { get; set; }

    /// <summary>Datum der Bewerbung. Null, solange der Status Draft ist.</summary>
    public DateOnly? AppliedOn { get; set; }

    public ApplicationStatus Status { get; set; } = ApplicationStatus.Draft;

    /// <summary>Volltext der Stellenanzeige, Grundlage fuer die KI-Analyse.</summary>
    public string? JobDescription { get; set; }

    /// <summary>Im Inserat geforderte bzw. eingesetzte Technologien.</summary>
    public List<string> Technologies { get; set; } = [];

    public string? Notes { get; set; }

    public string? ContactName { get; set; }

    public string? ContactEmail { get; set; }

    public string? ContactPhone { get; set; }

    /// <summary>Optionaler Termin fuer das Vorstellungsgespraech.</summary>
    public DateTimeOffset? InterviewAt { get; set; }

    public string? InterviewLocation { get; set; }

    public Guid? CompanyId { get; set; }

    public Company? Company { get; set; }

    public ApplicationUser? User { get; set; }

    public ICollection<ApplicationNote> ApplicationNotes { get; set; } = [];

    public ICollection<ApplicationStatusHistory> StatusHistory { get; set; } = [];

    public ICollection<AiAnalysis> AiAnalyses { get; set; } = [];

    public ICollection<GeneratedCoverLetter> CoverLetters { get; set; } = [];

    public ICollection<Reminder> Reminders { get; set; } = [];

    /// <summary>Bewerbung ist noch in Bearbeitung (weder Zusage noch Absage).</summary>
    public bool IsOpen => Status is not (ApplicationStatus.Accepted or ApplicationStatus.Rejected);
}