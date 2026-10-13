namespace JobPilot.Application.Profile;

/// <summary>Aus einem Lebenslauf abgeleiteter Profilvorschlag. Wird nicht automatisch gespeichert.</summary>
public record ResumeProfileSuggestion(
    string ResumeText,
    string? FirstName,
    string? LastName,
    string? TargetJobTitle,
    string? Location,
    string? ProfileSummary,
    string? ExperienceSummary,
    string? EducationSummary,
    IReadOnlyList<string> Skills);

/// <summary>Profilvorschlag aus eingefuegtem Lebenslauf-Text erzeugen.</summary>
public record ExtractResumeProfileRequest(string ResumeText);
