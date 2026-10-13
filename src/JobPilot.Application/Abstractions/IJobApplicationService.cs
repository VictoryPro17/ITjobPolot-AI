using JobPilot.Application.Common;
using JobPilot.Application.JobApplications;

namespace JobPilot.Application.Abstractions;

/// <summary>
/// Fachlogik der Bewerbungsverwaltung. Alle Methoden arbeiten ausschliesslich
/// auf den Daten des angemeldeten Benutzers.
/// </summary>
public interface IJobApplicationService
{
    Task<PagedResult<JobApplicationListItemDto>> GetPagedAsync(
        JobApplicationQuery query,
        CancellationToken cancellationToken = default);

    Task<JobApplicationDetailDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<JobApplicationDetailDto> CreateAsync(
        CreateJobApplicationRequest request,
        CancellationToken cancellationToken = default);

    Task<JobApplicationDetailDto> UpdateAsync(
        Guid id,
        UpdateJobApplicationRequest request,
        CancellationToken cancellationToken = default);

    Task<JobApplicationDetailDto> ChangeStatusAsync(
        Guid id,
        ChangeStatusRequest request,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    Task<JobApplicationSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);

    Task<StatisticsDto> GetStatisticsAsync(CancellationToken cancellationToken = default);
}