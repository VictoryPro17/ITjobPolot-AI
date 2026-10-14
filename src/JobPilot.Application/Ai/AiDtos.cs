using JobPilot.Domain.Enums;

namespace JobPilot.Application.Ai;

/// <summary>Request zum Generieren eines Anschreibens.</summary>
public record GenerateCoverLetterRequest(
    string Title,
    WritingStyle Style = WritingStyle.Professional,
    bool IsDraft = true);

/// <summary>Zustand der KI-Anbindung fuer die Oberflaeche.</summary>
public record AiStatusDto(bool Enabled, string Provider, string? Model, bool Available);

/// <summary>Einzelner, gewichteter Faktor des Match-Scores.</summary>
public record MatchFactorDto(
    string Key,
    string Label,
    int Score,
    int Weight,
    string Explanation);

/// <summary>Ergebnis einer KI-Analyse.</summary>
public record AiAnalysisDto(
    Guid Id,
    Guid JobApplicationId,
    int MatchScore,
    string Summary,
    IReadOnlyList<string> RequiredSkills,
    IReadOnlyList<string> MatchedSkills,
    IReadOnlyList<string> MissingSkills,
    IReadOnlyList<string> Recommendations,
    IReadOnlyList<string> SuggestedLearningTopics,
    string? Provider,
    string? Model,
    DateTimeOffset CreatedAt,
    IReadOnlyList<MatchFactorDto> Factors,
    IReadOnlyList<string> ProfileHints);

/// <summary>Generiertes Anschreiben.</summary>
public record GeneratedCoverLetterDto(
    Guid Id,
    Guid JobApplicationId,
    string Title,
    string Content,
    string? CompanyName,
    string? JobTitle,
    WritingStyle Style,
    bool IsDraft,
    string? Provider,
    string? Model,
    DateTimeOffset CreatedAt);
