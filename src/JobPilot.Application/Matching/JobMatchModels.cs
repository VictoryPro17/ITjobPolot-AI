using JobPilot.Application.Ai;

namespace JobPilot.Application.Matching;

/// <summary>Eingabedaten fuer den Abgleich zwischen Stelle und Kandidat.</summary>
public record JobMatchInput(
    string JobTitle,
    string CompanyName,
    string? JobDescription,
    IReadOnlyList<string> JobTechnologies,
    string? TargetJobTitle,
    IReadOnlyList<string> ProfileSkills,
    string? ProfileSummary,
    string? ExperienceSummary,
    string? EducationSummary,
    string? ResumeText,
    string? CandidateName = null);

/// <summary>Ergebnis des Abgleichs inklusive Herkunft (Anbieter und Modell).</summary>
public record JobMatchResult(
    int MatchScore,
    string Summary,
    IReadOnlyList<string> RequiredSkills,
    IReadOnlyList<string> MatchedSkills,
    IReadOnlyList<string> MissingSkills,
    IReadOnlyList<string> Recommendations,
    IReadOnlyList<string> SuggestedLearningTopics,
    IReadOnlyList<MatchFactorDto> Factors,
    IReadOnlyList<string> ProfileHints,
    string Provider,
    string Model);
