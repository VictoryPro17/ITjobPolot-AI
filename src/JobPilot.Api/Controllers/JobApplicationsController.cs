using FluentValidation;

using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;
using JobPilot.Application.JobApplications;
using JobPilot.Domain.Enums;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPilot.Api.Controllers;

/// <summary>
/// Verwaltung der Bewerbungen des angemeldeten Benutzers.
/// Die Mandantentrennung erfolgt ausschliesslich serverseitig im Service.
/// </summary>
[ApiController]
[Authorize]
[Route("api/job-applications")]
[Produces("application/json")]
public class JobApplicationsController(
    IJobApplicationService service,
    IValidator<JobApplicationQuery> queryValidator) : ControllerBase
{
    /// <summary>Liefert die gefilterte, sortierte und seitenweise Bewerbungsliste.</summary>
    [HttpGet]
    [ProducesResponseType<PagedResult<JobApplicationListItemDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<JobApplicationListItemDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] ApplicationStatus[]? status,
        [FromQuery] EmploymentType? employmentType,
        [FromQuery] WorkModel? workModel,
        [FromQuery] bool? isOpen,
        [FromQuery] DateOnly? appliedFrom,
        [FromQuery] DateOnly? appliedTo,
        [FromQuery] JobApplicationSortField sortBy = JobApplicationSortField.UpdatedAt,
        [FromQuery] bool sortDescending = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new JobApplicationQuery
        {
            Search = search,
            Status = status,
            EmploymentType = employmentType,
            WorkModel = workModel,
            IsOpen = isOpen,
            AppliedFrom = appliedFrom,
            AppliedTo = appliedTo,
            SortBy = sortBy,
            SortDescending = sortDescending,
            Page = page,
            PageSize = pageSize
        };

        // Query-Parameter sind keine Action-Argumente vom Typ JobApplicationQuery,
        // daher greift der globale Validierungsfilter hier nicht automatisch.
        var validation = await queryValidator.ValidateAsync(query, cancellationToken);
        if (!validation.IsValid)
        {
            throw new ValidationFailedException(validation.Errors
                .GroupBy(failure => failure.PropertyName)
                .ToDictionary(
                    group => group.Key,
                    group => group.Select(failure => failure.ErrorMessage).ToArray()));
        }

        return Ok(await service.GetPagedAsync(query, cancellationToken));
    }

    /// <summary>Kennzahlen fuer Dashboard-Karten.</summary>
    [HttpGet("summary")]
    [ProducesResponseType<JobApplicationSummaryDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<JobApplicationSummaryDto>> GetSummary(
        CancellationToken cancellationToken)
        => Ok(await service.GetSummaryAsync(cancellationToken));

    /// <summary>Liefert eine einzelne Bewerbung inklusive Statusverlauf.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType<JobApplicationDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<JobApplicationDetailDto>> GetById(
        Guid id,
        CancellationToken cancellationToken)
        => Ok(await service.GetByIdAsync(id, cancellationToken));

    /// <summary>Legt eine neue Bewerbung an.</summary>
    [HttpPost]
    [ProducesResponseType<JobApplicationDetailDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<JobApplicationDetailDto>> Create(
        [FromBody] CreateJobApplicationRequest request,
        CancellationToken cancellationToken)
    {
        var created = await service.CreateAsync(request, cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>Aktualisiert eine bestehende Bewerbung vollstaendig.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType<JobApplicationDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<JobApplicationDetailDto>> Update(
        Guid id,
        [FromBody] UpdateJobApplicationRequest request,
        CancellationToken cancellationToken)
        => Ok(await service.UpdateAsync(id, request, cancellationToken));

    /// <summary>Aendert nur den Status, etwa per Drag-and-drop im Kanban-Board.</summary>
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType<JobApplicationDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<JobApplicationDetailDto>> ChangeStatus(
        Guid id,
        [FromBody] ChangeStatusRequest request,
        CancellationToken cancellationToken)
        => Ok(await service.ChangeStatusAsync(id, request, cancellationToken));

    /// <summary>Loescht eine Bewerbung unwiderruflich.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await service.DeleteAsync(id, cancellationToken);

        return NoContent();
    }

    /// <summary>Langfriststatistiken fuer das Statistik-Dashboard.</summary>
    [HttpGet("statistics")]
    [ProducesResponseType<StatisticsDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StatisticsDto>> GetStatistics(CancellationToken cancellationToken)
        => Ok(await service.GetStatisticsAsync(cancellationToken));
}