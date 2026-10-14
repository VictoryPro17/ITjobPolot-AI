using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;
using JobPilot.Application.Reminders;
using JobPilot.Domain.Entities;
using JobPilot.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace JobPilot.Infrastructure.Services;

/// <summary>Erinnerungen; "ueberfaellig" wird ueber <see cref="TimeProvider"/> bestimmt, damit es testbar bleibt.</summary>
public class ReminderService(
    JobPilotDbContext db,
    ICurrentUser currentUser,
    TimeProvider timeProvider) : IReminderService
{
    public async Task<IReadOnlyList<ReminderDto>> GetAllAsync(
        ReminderFilter filter,
        Guid? jobApplicationId = null,
        CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        var query = Query(userId);

        if (jobApplicationId.HasValue)
        {
            query = query.Where(r => r.JobApplicationId == jobApplicationId.Value);
        }

        query = filter switch
        {
            ReminderFilter.Open => query.Where(r => !r.IsCompleted),
            ReminderFilter.Completed => query.Where(r => r.IsCompleted),
            _ => query
        };

        var reminders = await query.ToListAsync(cancellationToken);

        // Offene nach Faelligkeit aufsteigend, erledigte nach Erledigungszeitpunkt absteigend.
        var ordered = reminders
            .Where(r => !r.IsCompleted)
            .OrderBy(r => r.DueAt)
            .Concat(reminders
                .Where(r => r.IsCompleted)
                .OrderByDescending(r => r.CompletedAt ?? r.DueAt));

        return [.. ordered.Select(ToDto)];
    }

    public async Task<IReadOnlyList<ReminderDto>> GetUpcomingAsync(int take, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var reminders = await Query(userId)
            .Where(r => !r.IsCompleted)
            .OrderBy(r => r.DueAt)
            .Take(Math.Clamp(take, 1, 20))
            .ToListAsync(cancellationToken);

        return [.. reminders.Select(ToDto)];
    }

    public async Task<ReminderDto> CreateAsync(SaveReminderRequest request, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        await EnsureApplicationBelongsToUserAsync(request.JobApplicationId, userId, cancellationToken);

        var reminder = new Reminder
        {
            UserId = userId,
            Title = request.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            DueAt = request.DueAt.ToUniversalTime(),
            ReminderType = request.ReminderType,
            JobApplicationId = request.JobApplicationId
        };

        db.Reminders.Add(reminder);
        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(reminder.Id, userId, cancellationToken);
    }

    public async Task<ReminderDto> UpdateAsync(Guid id, SaveReminderRequest request, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        var reminder = await FindAsync(id, userId, cancellationToken);
        await EnsureApplicationBelongsToUserAsync(request.JobApplicationId, userId, cancellationToken);

        reminder.Title = request.Title.Trim();
        reminder.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        reminder.DueAt = request.DueAt.ToUniversalTime();
        reminder.ReminderType = request.ReminderType;
        reminder.JobApplicationId = request.JobApplicationId;

        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(id, userId, cancellationToken);
    }

    public async Task<ReminderDto> SetCompletedAsync(Guid id, bool isCompleted, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        var reminder = await FindAsync(id, userId, cancellationToken);

        reminder.IsCompleted = isCompleted;
        reminder.CompletedAt = isCompleted ? timeProvider.GetUtcNow() : null;

        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(id, userId, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        var reminder = await FindAsync(id, userId, cancellationToken);

        db.Reminders.Remove(reminder);
        await db.SaveChangesAsync(cancellationToken);
    }

    private IQueryable<Reminder> Query(Guid userId) =>
        db.Reminders
            .AsNoTracking()
            .Include(r => r.JobApplication)
            .Where(r => r.UserId == userId);

    private async Task<Reminder> FindAsync(Guid id, Guid userId, CancellationToken cancellationToken) =>
        await db.Reminders.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId, cancellationToken)
        ?? throw NotFoundException.For("Erinnerung", id);

    private async Task<ReminderDto> GetDtoAsync(Guid id, Guid userId, CancellationToken cancellationToken) =>
        ToDto(await Query(userId).SingleAsync(r => r.Id == id, cancellationToken));

    private async Task EnsureApplicationBelongsToUserAsync(Guid? jobApplicationId, Guid userId, CancellationToken cancellationToken)
    {
        if (jobApplicationId is null)
        {
            return;
        }

        if (!await db.JobApplications.AnyAsync(a => a.Id == jobApplicationId && a.UserId == userId, cancellationToken))
        {
            throw NotFoundException.For("Bewerbung", jobApplicationId.Value);
        }
    }

    private ReminderDto ToDto(Reminder reminder) => new(
        reminder.Id,
        reminder.Title,
        reminder.Description,
        reminder.DueAt,
        reminder.ReminderType,
        reminder.IsCompleted,
        reminder.CompletedAt,
        !reminder.IsCompleted && reminder.DueAt < timeProvider.GetUtcNow(),
        reminder.JobApplicationId,
        reminder.JobApplication is null ? null : $"{reminder.JobApplication.CompanyName} · {reminder.JobApplication.JobTitle}",
        reminder.CreatedAt);
}
