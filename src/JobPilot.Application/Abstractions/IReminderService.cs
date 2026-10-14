using JobPilot.Application.Reminders;

namespace JobPilot.Application.Abstractions;

/// <summary>Erinnerungen des angemeldeten Benutzers.</summary>
public interface IReminderService
{
    Task<IReadOnlyList<ReminderDto>> GetAllAsync(ReminderFilter filter, CancellationToken cancellationToken = default);

    /// <summary>Offene Erinnerungen inklusive ueberfaelliger, nach Faelligkeit sortiert.</summary>
    Task<IReadOnlyList<ReminderDto>> GetUpcomingAsync(int take, CancellationToken cancellationToken = default);

    Task<ReminderDto> CreateAsync(SaveReminderRequest request, CancellationToken cancellationToken = default);

    Task<ReminderDto> UpdateAsync(Guid id, SaveReminderRequest request, CancellationToken cancellationToken = default);

    Task<ReminderDto> SetCompletedAsync(Guid id, bool isCompleted, CancellationToken cancellationToken = default);

    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
