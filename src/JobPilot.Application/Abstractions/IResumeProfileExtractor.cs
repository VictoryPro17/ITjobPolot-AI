using JobPilot.Application.Profile;

namespace JobPilot.Application.Abstractions;

/// <summary>Leitet aus Lebenslauf-Text einen Profilvorschlag ab (heuristisch oder per KI-Anbieter).</summary>
public interface IResumeProfileExtractor
{
    Task<ResumeProfileSuggestion> ExtractAsync(string resumeText, CancellationToken cancellationToken = default);
}
