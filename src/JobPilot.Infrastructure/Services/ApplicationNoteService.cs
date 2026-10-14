using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;
using JobPilot.Application.Notes;
using JobPilot.Domain.Entities;
using JobPilot.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

namespace JobPilot.Infrastructure.Services;

/// <summary>
/// Notizen zu Bewerbungen. Jeder Zugriff prueft zuerst, ob die Bewerbung dem
/// angemeldeten Benutzer gehoert; fremde Daten werden wie nicht vorhandene behandelt (404).
/// </summary>
public class ApplicationNoteService(JobPilotDbContext db, ICurrentUser currentUser) : IApplicationNoteService
{
    public async Task<IReadOnlyList<ApplicationNoteDto>> GetAllAsync(Guid jobApplicationId, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        await EnsureApplicationBelongsToUserAsync(jobApplicationId, userId, cancellationToken);

        return await db.ApplicationNotes
            .AsNoTracking()
            .Where(n => n.JobApplicationId == jobApplicationId && n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new ApplicationNoteDto(n.Id, n.JobApplicationId, n.Content, n.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<ApplicationNoteDto> CreateAsync(
        Guid jobApplicationId,
        CreateApplicationNoteRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        await EnsureApplicationBelongsToUserAsync(jobApplicationId, userId, cancellationToken);

        var note = new ApplicationNote
        {
            UserId = userId,
            JobApplicationId = jobApplicationId,
            Content = request.Content.Trim()
        };

        db.ApplicationNotes.Add(note);
        await db.SaveChangesAsync(cancellationToken);

        return new ApplicationNoteDto(note.Id, note.JobApplicationId, note.Content, note.CreatedAt);
    }

    public async Task DeleteAsync(Guid jobApplicationId, Guid noteId, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var note = await db.ApplicationNotes
            .FirstOrDefaultAsync(n => n.Id == noteId && n.JobApplicationId == jobApplicationId && n.UserId == userId, cancellationToken)
            ?? throw NotFoundException.For("Notiz", noteId);

        db.ApplicationNotes.Remove(note);
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureApplicationBelongsToUserAsync(Guid jobApplicationId, Guid userId, CancellationToken cancellationToken)
    {
        if (!await db.JobApplications.AnyAsync(a => a.Id == jobApplicationId && a.UserId == userId, cancellationToken))
        {
            throw NotFoundException.For("Bewerbung", jobApplicationId);
        }
    }
}
