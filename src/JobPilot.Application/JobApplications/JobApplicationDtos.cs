using JobPilot.Domain.Enums;

namespace JobPilot.Application.JobApplications;

/// <summary>Kompakte Darstellung fuer Listen, Tabellen und das Kanban-Board.</summary>
public record JobApplicationListItemDto(
    Guid Id,
    string CompanyName,
    string JobTitle,
    string? Location,
    EmploymentType EmploymentType,
    WorkModel WorkModel,
    ApplicationStatus Status,
    DateOnly? AppliedOn,
    DateTimeOffset? InterviewAt,
    IReadOnlyList<string> Technologies,
    bool IsOpen,
    DateTimeOffset UpdatedAt);

/// <summary>Vollstaendige Darstellung einer Bewerbung.</summary>
public record JobApplicationDetailDto(
    Guid Id,
    string CompanyName,
    string JobTitle,
    string? Location,
    EmploymentType EmploymentType,
    WorkModel WorkModel,
    string? Salary,
    string? JobPostingUrl,
    DateOnly? AppliedOn,
    ApplicationStatus Status,
    string? JobDescription,
    IReadOnlyList<string> Technologies,
    string? Notes,
    string? ContactName,
    string? ContactEmail,
    string? ContactPhone,
    DateTimeOffset? InterviewAt,
    string? InterviewLocation,
    bool IsOpen,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<StatusHistoryEntryDto> StatusHistory);

/// <summary>Einzelner Eintrag des Statusverlaufs.</summary>
public record StatusHistoryEntryDto(
    Guid Id,
    ApplicationStatus? FromStatus,
    ApplicationStatus ToStatus,
    DateTimeOffset ChangedAt,
    string? Comment);

/// <summary>Eingabedaten beim Anlegen einer Bewerbung.</summary>
public record CreateJobApplicationRequest(
    string CompanyName,
    string JobTitle,
    string? Location,
    EmploymentType EmploymentType = EmploymentType.Unspecified,
    WorkModel WorkModel = WorkModel.Unspecified,
    string? Salary = null,
    string? JobPostingUrl = null,
    DateOnly? AppliedOn = null,
    ApplicationStatus Status = ApplicationStatus.Draft,
    string? JobDescription = null,
    IReadOnlyList<string>? Technologies = null,
    string? Notes = null,
    string? ContactName = null,
    string? ContactEmail = null,
    string? ContactPhone = null,
    DateTimeOffset? InterviewAt = null,
    string? InterviewLocation = null);

/// <summary>Eingabedaten beim Bearbeiten einer Bewerbung.</summary>
public record UpdateJobApplicationRequest(
    string CompanyName,
    string JobTitle,
    string? Location,
    EmploymentType EmploymentType,
    WorkModel WorkModel,
    string? Salary,
    string? JobPostingUrl,
    DateOnly? AppliedOn,
    ApplicationStatus Status,
    string? JobDescription,
    IReadOnlyList<string>? Technologies,
    string? Notes,
    string? ContactName,
    string? ContactEmail,
    string? ContactPhone,
    DateTimeOffset? InterviewAt,
    string? InterviewLocation);

/// <summary>Statuswechsel, etwa per Kanban-Board.</summary>
public record ChangeStatusRequest(ApplicationStatus Status, string? Comment);

/// <summary>Sortierkriterien der Bewerbungsliste.</summary>
public enum JobApplicationSortField
{
    UpdatedAt = 0,
    CreatedAt = 1,
    AppliedOn = 2,
    CompanyName = 3,
    JobTitle = 4,
    Status = 5
}

/// <summary>Such-, Filter-, Sortier- und Seitenparameter der Bewerbungsliste.</summary>
public record JobApplicationQuery
{
    public const int MaxPageSize = 100;

    /// <summary>Freitextsuche über Firma, Jobtitel, Ort und Technologien.</summary>
    public string? Search { get; init; }

    /// <summary>Mehrfachauswahl von Status; leer bedeutet alle.</summary>
    public IReadOnlyList<ApplicationStatus>? Status { get; init; }

    public EmploymentType? EmploymentType { get; init; }

    public WorkModel? WorkModel { get; init; }

    /// <summary>Nur offene (true) bzw. nur abgeschlossene (false) Bewerbungen.</summary>
    public bool? IsOpen { get; init; }

    public DateOnly? AppliedFrom { get; init; }

    public DateOnly? AppliedTo { get; init; }

    public JobApplicationSortField SortBy { get; init; } = JobApplicationSortField.UpdatedAt;

    public bool SortDescending { get; init; } = true;

    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = 20;
}

/// <summary>Kennzahlen fuer Dashboard-Karten.</summary>
public record JobApplicationSummaryDto(
    int Total,
    int ThisMonth,
    int Open,
    int Interviews,
    int Accepted,
    int Rejected,
    IReadOnlyDictionary<ApplicationStatus, int> ByStatus);