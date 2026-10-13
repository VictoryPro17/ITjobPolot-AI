using JobPilot.Domain.Common;

namespace JobPilot.Domain.Entities;

/// <summary>
/// Ergebnis einer KI-gestuetzten Abgleichsanalyse zwischen Stellenanzeige und
/// Lebenslauf. MatchScore ist ausdruecklich nur eine Orientierung und keine
/// Einstellungswahrscheinlichkeit.
/// </summary>
public class AiAnalysis : OwnedEntityBase
{
    public Guid? JobApplicationId { get; set; }

    public Guid? ResumeDocumentId { get; set; }

    /// <summary>Analysierter Anzeigentext (Snapshot zum Zeitpunkt der Analyse).</summary>
    public required string JobDescription { get; set; }

    /// <summary>Orientierungswert 0-100.</summary>
    public int MatchScore { get; set; }

    public string? Summary { get; set; }

    public List<string> RequiredSkills { get; set; } = [];

    public List<string> MatchedSkills { get; set; } = [];

    public List<string> MissingSkills { get; set; } = [];

    public List<string> Recommendations { get; set; } = [];

    public List<string> SuggestedLearningTopics { get; set; } = [];

    /// <summary>Verwendeter Anbieter, z. B. "openai" oder "anthropic".</summary>
    public string? Provider { get; set; }

    public string? Model { get; set; }

    public int? PromptTokens { get; set; }

    public int? CompletionTokens { get; set; }

    public JobApplication? JobApplication { get; set; }

    public UserDocument? ResumeDocument { get; set; }

    public ApplicationUser? User { get; set; }
}