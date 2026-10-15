using JobPilot.Application.Abstractions;
using JobPilot.Application.Auth;
using JobPilot.Application.Common;
using JobPilot.Domain.Entities;
using JobPilot.Infrastructure.Persistence;

using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JobPilot.Infrastructure.Services;

/// <summary>
/// Datenexport und Kontoloeschung. Der Export enthaelt bewusst nur fachliche Felder,
/// keine Passwort-Hashes, Sicherheitsstempel oder interne Speicherpfade.
/// </summary>
public class AccountService(
    JobPilotDbContext db,
    ICurrentUser currentUser,
    UserManager<ApplicationUser> userManager,
    IFileStorage fileStorage,
    TimeProvider timeProvider,
    ILogger<AccountService> logger) : IAccountService
{
    public async Task<AccountExport> ExportAsync(CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var profile = await db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.Email,
                u.FirstName,
                u.LastName,
                u.TargetJobTitle,
                u.Location,
                u.ProfileSummary,
                u.ExperienceSummary,
                u.EducationSummary,
                u.Skills,
                u.ResumeText,
                u.ThemePreference,
                u.AccentColor,
                u.OnboardingCompletedAt,
                HasAvatar = u.AvatarStoragePath != null,
                u.CreatedAt
            })
            .SingleAsync(cancellationToken);

        var applications = await db.JobApplications
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderBy(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.CompanyName,
                a.JobTitle,
                a.Location,
                a.EmploymentType,
                a.WorkModel,
                a.Salary,
                a.JobPostingUrl,
                a.AppliedOn,
                a.Status,
                a.JobDescription,
                a.Technologies,
                a.Notes,
                a.ContactName,
                a.ContactEmail,
                a.ContactPhone,
                a.InterviewAt,
                a.InterviewLocation,
                a.CreatedAt,
                a.UpdatedAt,
                ApplicationNotes = a.ApplicationNotes.OrderBy(n => n.CreatedAt).Select(n => new { n.Content, n.CreatedAt }).ToList(),
                StatusHistory = a.StatusHistory.OrderBy(h => h.ChangedAt).Select(h => new { h.FromStatus, h.ToStatus, h.ChangedAt, h.Comment }).ToList()
            })
            .ToListAsync(cancellationToken);

        var reminders = await db.Reminders
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .OrderBy(r => r.DueAt)
            .Select(r => new { r.Title, r.Description, r.DueAt, r.ReminderType, r.IsCompleted, r.CompletedAt, r.JobApplicationId, r.CreatedAt })
            .ToListAsync(cancellationToken);

        var documents = await db.UserDocuments
            .AsNoTracking()
            .Where(d => d.UserId == userId)
            .OrderBy(d => d.CreatedAt)
            .Select(d => new { d.FileName, d.ContentType, d.SizeInBytes, d.DocumentType, d.Sha256, d.JobApplicationId, d.CreatedAt })
            .ToListAsync(cancellationToken);

        var analyses = await db.AiAnalyses
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderBy(a => a.CreatedAt)
            .Select(a => new
            {
                a.JobApplicationId,
                a.MatchScore,
                a.Summary,
                a.RequiredSkills,
                a.MatchedSkills,
                a.MissingSkills,
                a.Recommendations,
                a.SuggestedLearningTopics,
                a.Provider,
                a.Model,
                a.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var coverLetters = await db.GeneratedCoverLetters
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new { c.JobApplicationId, c.Title, c.Content, c.CompanyName, c.JobTitle, c.Style, c.IsDraft, c.CreatedAt })
            .ToListAsync(cancellationToken);

        return new AccountExport(timeProvider.GetUtcNow(), profile, applications, reminders, documents, analyses, coverLetters);
    }

    public async Task DeleteAccountAsync(CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var user = await userManager.FindByIdAsync(userId.ToString())
            ?? throw new UnauthorizedAccessException("Es ist kein Benutzer angemeldet.");

        var storagePaths = await db.UserDocuments
            .Where(d => d.UserId == userId)
            .Select(d => d.StoragePath)
            .ToListAsync(cancellationToken);

        if (user.AvatarStoragePath is not null)
        {
            storagePaths.Add(user.AvatarStoragePath);
        }

        // Bei aktivierten Wiederholungsversuchen muss eine eigene Transaktion
        // innerhalb der Execution-Strategy laufen.
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

            // Notizen und Statusverlauf verweisen mit NoAction auf den Benutzer und
            // muessen daher vor dem Benutzer selbst entfernt werden.
            await db.ApplicationNotes.Where(n => n.UserId == userId).ExecuteDeleteAsync(cancellationToken);
            await db.ApplicationStatusHistories.Where(h => h.UserId == userId).ExecuteDeleteAsync(cancellationToken);

            var result = await userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                throw new ValidationFailedException("account", "Das Konto konnte nicht gelöscht werden.");
            }

            await transaction.CommitAsync(cancellationToken);
        });

        // Dateien erst nach erfolgreichem Commit entfernen, damit ein Fehler keine Daten verwaist.
        foreach (var path in storagePaths)
        {
            try
            {
                fileStorage.Delete(path);
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ForbiddenException)
            {
                logger.LogWarning(ex, "Datei {StoragePath} konnte nach Kontoloeschung nicht entfernt werden.", path);
            }
        }

        logger.LogInformation("Benutzerkonto {UserId} und {FileCount} Dateien geloescht.", userId, storagePaths.Count);
    }
}
