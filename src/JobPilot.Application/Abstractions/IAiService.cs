using JobPilot.Application.Ai;

namespace JobPilot.Application.Abstractions;

/// <summary>
/// Lieferant von KI-Analysen und generierten Anschreiben fuer eine Bewerbung.
/// </summary>
public interface IAiService
{
    Task<AiAnalysisDto> AnalyzeApplicationAsync(Guid applicationId, CancellationToken cancellationToken = default);

    Task<GeneratedCoverLetterDto> GenerateCoverLetterAsync(
        Guid applicationId,
        GenerateCoverLetterRequest request,
        CancellationToken cancellationToken = default);
}
