using JobPilot.Application.Abstractions;
using JobPilot.Application.Ai;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPilot.Api.Controllers;

/// <summary>KI-Funktionen für Stellenanalyse und Anschreibergenerierung.</summary>
[ApiController]
[Authorize]
[Route("api/ai")]
[Produces("application/json")]
public class AiController(IAiService aiService) : ControllerBase
{
    [HttpPost("job-applications/{jobApplicationId:guid}/analyze")]
    [ProducesResponseType<AiAnalysisDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AiAnalysisDto>> AnalyzeApplication(
        Guid jobApplicationId,
        CancellationToken cancellationToken)
        => Ok(await aiService.AnalyzeApplicationAsync(jobApplicationId, cancellationToken));

    [HttpPost("job-applications/{jobApplicationId:guid}/cover-letters")]
    [ProducesResponseType<GeneratedCoverLetterDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GeneratedCoverLetterDto>> GenerateCoverLetter(
        Guid jobApplicationId,
        [FromBody] GenerateCoverLetterRequest request,
        CancellationToken cancellationToken)
        => Ok(await aiService.GenerateCoverLetterAsync(jobApplicationId, request, cancellationToken));
}
