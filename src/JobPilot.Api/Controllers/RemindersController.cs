using JobPilot.Application.Abstractions;
using JobPilot.Application.Reminders;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPilot.Api.Controllers;

/// <summary>Erinnerungen fuer Termine, Fristen und Nachfassaktionen.</summary>
[ApiController]
[Authorize]
[Route("api/reminders")]
[Produces("application/json")]
public class RemindersController(IReminderService reminderService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ReminderDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ReminderDto>>> GetAll(
        [FromQuery] ReminderFilter filter = ReminderFilter.Open,
        CancellationToken cancellationToken = default)
        => Ok(await reminderService.GetAllAsync(filter, cancellationToken));

    [HttpGet("upcoming")]
    [ProducesResponseType<IReadOnlyList<ReminderDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ReminderDto>>> GetUpcoming(
        [FromQuery] int take = 5,
        CancellationToken cancellationToken = default)
        => Ok(await reminderService.GetUpcomingAsync(take, cancellationToken));

    [HttpPost]
    [ProducesResponseType<ReminderDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ReminderDto>> Create(SaveReminderRequest request, CancellationToken cancellationToken)
    {
        var reminder = await reminderService.CreateAsync(request, cancellationToken);
        return Created($"/api/reminders/{reminder.Id}", reminder);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<ReminderDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ReminderDto>> Update(Guid id, SaveReminderRequest request, CancellationToken cancellationToken)
        => Ok(await reminderService.UpdateAsync(id, request, cancellationToken));

    [HttpPost("{id:guid}/complete")]
    [ProducesResponseType<ReminderDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ReminderDto>> Complete(Guid id, CancellationToken cancellationToken)
        => Ok(await reminderService.SetCompletedAsync(id, true, cancellationToken));

    [HttpPost("{id:guid}/reopen")]
    [ProducesResponseType<ReminderDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ReminderDto>> Reopen(Guid id, CancellationToken cancellationToken)
        => Ok(await reminderService.SetCompletedAsync(id, false, cancellationToken));

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await reminderService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
