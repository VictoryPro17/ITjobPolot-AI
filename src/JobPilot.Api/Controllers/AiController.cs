using JobPilot.Application.Abstractions;
using JobPilot.Application.Ai;
using JobPilot.Application.Common;
using JobPilot.Infrastructure;
using JobPilot.Infrastructure.Ai;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JobPilot.Api.Controllers;

/// <summary>KI-Funktionen für Stellenanalyse und Anschreibergenerierung.</summary>
[ApiController]
[Authorize]
[Route("api/ai")]
[Produces("application/json")]
public class AiController(
    IAiService aiService,
    OllamaClient ollamaClient,
    IOptions<AiOptions> aiOptions) : ControllerBase
{
    /// <summary>Zeigt, ob eine KI aktiv und erreichbar ist; sonst wird regelbasiert analysiert.</summary>
    [HttpGet("status")]
    [ProducesResponseType<AiStatusDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AiStatusDto>> GetStatus(CancellationToken cancellationToken)
    {
        var options = aiOptions.Value;
        var usesOllama = DependencyInjection.UsesOllama(options);
        var available = usesOllama && await ollamaClient.IsAvailableAsync(cancellationToken);

        return Ok(new AiStatusDto(options.Enabled, options.Provider, options.Model, available));
    }

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
