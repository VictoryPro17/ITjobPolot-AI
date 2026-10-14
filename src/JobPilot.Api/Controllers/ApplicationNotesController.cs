using JobPilot.Application.Abstractions;
using JobPilot.Application.Notes;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPilot.Api.Controllers;

/// <summary>Chronologische Notizen zu einer Bewerbung.</summary>
[ApiController]
[Authorize]
[Route("api/job-applications/{jobApplicationId:guid}/notes")]
[Produces("application/json")]
public class ApplicationNotesController(IApplicationNoteService noteService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ApplicationNoteDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<ApplicationNoteDto>>> GetAll(Guid jobApplicationId, CancellationToken cancellationToken)
        => Ok(await noteService.GetAllAsync(jobApplicationId, cancellationToken));

    [HttpPost]
    [ProducesResponseType<ApplicationNoteDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApplicationNoteDto>> Create(
        Guid jobApplicationId,
        CreateApplicationNoteRequest request,
        CancellationToken cancellationToken)
    {
        var note = await noteService.CreateAsync(jobApplicationId, request, cancellationToken);
        return Created($"/api/job-applications/{jobApplicationId}/notes/{note.Id}", note);
    }

    [HttpDelete("{noteId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid jobApplicationId, Guid noteId, CancellationToken cancellationToken)
    {
        await noteService.DeleteAsync(jobApplicationId, noteId, cancellationToken);
        return NoContent();
    }
}
