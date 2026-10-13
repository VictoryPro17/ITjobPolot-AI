using JobPilot.Application.Matching;

namespace JobPilot.Application.Abstractions;

/// <summary>Bewertet, wie gut ein Kandidatenprofil zu einer Stelle passt (heuristisch oder per KI-Anbieter).</summary>
public interface IJobMatchAnalyzer
{
    Task<JobMatchResult> AnalyzeAsync(JobMatchInput input, CancellationToken cancellationToken = default);
}
