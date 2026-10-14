using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;
using JobPilot.Application.JobApplications;
using JobPilot.Domain.Entities;
using JobPilot.Domain.Enums;
using JobPilot.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JobPilot.Infrastructure.Services;

/// <summary>
/// Implementierung der Bewerbungsverwaltung. Jede Abfrage filtert zwingend ueber
/// die UserId des angemeldeten Benutzers; die Id aus der Route allein reicht nie aus.
/// </summary>
public class JobApplicationService(
    JobPilotDbContext db,
    ICurrentUser currentUser,
    TimeProvider timeProvider,
    ILogger<JobApplicationService> logger) : IJobApplicationService
{
    /// <summary>Status, die als "offen" gelten.</summary>
    private static readonly ApplicationStatus[] OpenStatuses =
    [
        ApplicationStatus.Draft,
        ApplicationStatus.Applied,
        ApplicationStatus.Interview,
        ApplicationStatus.Offer
    ];

    public async Task<PagedResult<JobApplicationListItemDto>> GetPagedAsync(
        JobApplicationQuery query,
        CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var source = db.JobApplications
            .AsNoTracking()
            .Where(a => a.UserId == userId);

        source = ApplyFilters(source, query);

        var totalCount = await source.CountAsync(cancellationToken);
        if (totalCount == 0)
        {
            return PagedResult<JobApplicationListItemDto>.Empty(query.Page, query.PageSize);
        }

        var items = await ApplySorting(source, query)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(a => new JobApplicationListItemDto(
                a.Id,
                a.CompanyName,
                a.JobTitle,
                a.Location,
                a.EmploymentType,
                a.WorkModel,
                a.Status,
                a.AppliedOn,
                a.InterviewAt,
                a.Technologies,
                a.Status != ApplicationStatus.Accepted && a.Status != ApplicationStatus.Rejected,
                a.UpdatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<JobApplicationListItemDto>(items, query.Page, query.PageSize, totalCount);
    }

    public async Task<JobApplicationDetailDto> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var entity = await db.JobApplications
            .AsNoTracking()
            .Include(a => a.StatusHistory)
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, cancellationToken)
            ?? throw NotFoundException.For("Bewerbung", id);

        return ToDetail(entity);
    }

    public async Task<JobApplicationDetailDto> CreateAsync(
        CreateJobApplicationRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var entity = new JobApplication
        {
            UserId = userId,
            CompanyName = request.CompanyName.Trim(),
            JobTitle = request.JobTitle.Trim(),
            Location = Normalize(request.Location),
            EmploymentType = request.EmploymentType,
            WorkModel = request.WorkModel,
            Salary = Normalize(request.Salary),
            JobPostingUrl = Normalize(request.JobPostingUrl),
            AppliedOn = request.AppliedOn,
            Status = request.Status,
            JobDescription = Normalize(request.JobDescription),
            Technologies = NormalizeTechnologies(request.Technologies),
            Notes = Normalize(request.Notes),
            ContactName = Normalize(request.ContactName),
            ContactEmail = Normalize(request.ContactEmail),
            ContactPhone = Normalize(request.ContactPhone),
            InterviewAt = request.InterviewAt?.ToUniversalTime(),
            InterviewLocation = Normalize(request.InterviewLocation)
        };

        // Wer direkt mit "Beworben" anlegt, bekommt das heutige Datum, falls keines angegeben wurde.
        if (entity.Status != ApplicationStatus.Draft && entity.AppliedOn is null)
        {
            entity.AppliedOn = DateOnly.FromDateTime(DateTime.UtcNow);
        }

        db.ApplicationStatusHistories.Add(new ApplicationStatusHistory
        {
            UserId = userId,
            JobApplicationId = entity.Id,
            FromStatus = null,
            ToStatus = entity.Status,
            ChangedAt = DateTimeOffset.UtcNow,
            Comment = "Bewerbung angelegt."
        });

        db.JobApplications.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Bewerbung {ApplicationId} fuer Benutzer {UserId} angelegt.", entity.Id, userId);

        return ToDetail(entity);
    }

    public async Task<JobApplicationDetailDto> UpdateAsync(
        Guid id,
        UpdateJobApplicationRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var entity = await db.JobApplications
            .Include(a => a.StatusHistory)
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, cancellationToken)
            ?? throw NotFoundException.For("Bewerbung", id);

        var previousStatus = entity.Status;

        entity.CompanyName = request.CompanyName.Trim();
        entity.JobTitle = request.JobTitle.Trim();
        entity.Location = Normalize(request.Location);
        entity.EmploymentType = request.EmploymentType;
        entity.WorkModel = request.WorkModel;
        entity.Salary = Normalize(request.Salary);
        entity.JobPostingUrl = Normalize(request.JobPostingUrl);
        entity.AppliedOn = request.AppliedOn;
        entity.Status = request.Status;
        entity.JobDescription = Normalize(request.JobDescription);
        entity.Technologies = NormalizeTechnologies(request.Technologies);
        entity.Notes = Normalize(request.Notes);
        entity.ContactName = Normalize(request.ContactName);
        entity.ContactEmail = Normalize(request.ContactEmail);
        entity.ContactPhone = Normalize(request.ContactPhone);
        entity.InterviewAt = request.InterviewAt?.ToUniversalTime();
        entity.InterviewLocation = Normalize(request.InterviewLocation);

        if (entity.Status != ApplicationStatus.Draft && entity.AppliedOn is null)
        {
            entity.AppliedOn = DateOnly.FromDateTime(DateTime.UtcNow);
        }

        if (previousStatus != entity.Status)
        {
            db.ApplicationStatusHistories.Add(new ApplicationStatusHistory
            {
                UserId = userId,
                JobApplicationId = entity.Id,
                FromStatus = previousStatus,
                ToStatus = entity.Status,
                ChangedAt = DateTimeOffset.UtcNow,
                Comment = "Status beim Bearbeiten geändert."
            });
        }

        await db.SaveChangesAsync(cancellationToken);

        return ToDetail(entity);
    }

    public async Task<JobApplicationDetailDto> ChangeStatusAsync(
        Guid id,
        ChangeStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var entity = await db.JobApplications
            .Include(a => a.StatusHistory)
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, cancellationToken)
            ?? throw NotFoundException.For("Bewerbung", id);

        if (entity.Status == request.Status)
        {
            return ToDetail(entity);
        }

        var previousStatus = entity.Status;
        entity.Status = request.Status;

        // Der Wechsel weg vom Entwurf markiert fachlich den Zeitpunkt der Bewerbung.
        if (previousStatus == ApplicationStatus.Draft
            && request.Status != ApplicationStatus.Draft
            && entity.AppliedOn is null)
        {
            entity.AppliedOn = DateOnly.FromDateTime(DateTime.UtcNow);
        }

        db.ApplicationStatusHistories.Add(new ApplicationStatusHistory
        {
            UserId = userId,
            JobApplicationId = entity.Id,
            FromStatus = previousStatus,
            ToStatus = request.Status,
            ChangedAt = DateTimeOffset.UtcNow,
            Comment = Normalize(request.Comment)
        });

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Bewerbung {ApplicationId} wechselte von {FromStatus} nach {ToStatus}.",
            entity.Id,
            previousStatus,
            request.Status);

        return ToDetail(entity);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var entity = await db.JobApplications
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, cancellationToken)
            ?? throw NotFoundException.For("Bewerbung", id);

        db.JobApplications.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Bewerbung {ApplicationId} wurde gelöscht.", id);
    }

    public async Task<JobApplicationSummaryDto> GetSummaryAsync(
        CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var counts = await db.JobApplications
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var byStatus = Enum.GetValues<ApplicationStatus>()
            .ToDictionary(status => status, status => counts.FirstOrDefault(c => c.Status == status)?.Count ?? 0);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateOnly(today.Year, today.Month, 1);

        var thisMonth = await db.JobApplications
            .AsNoTracking()
            .CountAsync(
                a => a.UserId == userId && a.AppliedOn != null && a.AppliedOn >= monthStart,
                cancellationToken);

        return new JobApplicationSummaryDto(
            Total: byStatus.Values.Sum(),
            ThisMonth: thisMonth,
            Open: OpenStatuses.Sum(status => byStatus[status]),
            Interviews: byStatus[ApplicationStatus.Interview],
            Accepted: byStatus[ApplicationStatus.Accepted],
            Rejected: byStatus[ApplicationStatus.Rejected],
            ByStatus: byStatus);
    }

    public async Task<StatisticsDto> GetStatisticsAsync(CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var rows = await db.JobApplications
            .AsNoTracking()
            .Where(a => a.UserId == userId && a.AppliedOn != null)
            .Select(a => new
            {
                AppliedOn = a.AppliedOn!.Value,
                a.Status,
                ReachedStatuses = a.StatusHistory.Select(history => history.ToStatus).ToList(),
                FirstResponseAt = a.StatusHistory
                    .Where(history => history.ToStatus != ApplicationStatus.Draft && history.ToStatus != ApplicationStatus.Applied)
                    .OrderBy(history => history.ChangedAt)
                    .Select(history => (DateTimeOffset?)history.ChangedAt)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        // "Rejected" hat den hoechsten Enum-Wert und taugt deshalb nicht als Fortschrittsmass.
        // Massgeblich ist die weiteste tatsaechlich erreichte Stufe aus Status und Historie:
        // Eine Absage nach dem Gespraech zaehlt als Gespraech, eine Direktabsage nicht.
        var applications = rows
            .Select(row => new
            {
                row.AppliedOn,
                IsRejected = row.Status == ApplicationStatus.Rejected,
                FurthestStage = row.ReachedStatuses.Append(row.Status).Max(StageOf)
            })
            .ToList();

        var total = applications.Count;
        var interviews = applications.Count(a => a.FurthestStage >= InterviewStage);
        var offers = applications.Count(a => a.FurthestStage >= OfferStage);
        var accepted = applications.Count(a => a.FurthestStage >= AcceptedStage);
        var rejected = applications.Count(a => a.IsRejected);

        var rate = (int value) => total > 0 ? (double)value / total * 100 : 0;

        var monthlyData = applications
            .GroupBy(a => new { a.AppliedOn.Year, a.AppliedOn.Month })
            .OrderBy(group => group.Key.Year).ThenBy(group => group.Key.Month)
            .Select(group => new MonthlyStatDto(
                group.Key.Year,
                group.Key.Month,
                group.Count(),
                group.Count(a => a.FurthestStage >= InterviewStage),
                group.Count(a => a.FurthestStage >= OfferStage),
                group.Count(a => a.FurthestStage >= AcceptedStage),
                group.Count(a => a.IsRejected)))
            .ToList();

        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);

        // Statusverteilung ueber alle Bewerbungen, auch Entwuerfe ohne Bewerbungsdatum.
        var statusCounts = await db.JobApplications
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .GroupBy(a => a.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        var statusDistribution = Enum.GetValues<ApplicationStatus>()
            .Select(status => new StatusCountDto(status, statusCounts.FirstOrDefault(s => s.Status == status)?.Count ?? 0))
            .ToList();

        var responseDays = rows
            .Where(row => row.FirstResponseAt is not null)
            .Select(row => Math.Max(0, DateOnly.FromDateTime(row.FirstResponseAt!.Value.UtcDateTime).DayNumber - row.AppliedOn.DayNumber))
            .ToList();

        // Je Bewerbung zaehlt nur die juengste Analyse.
        var analyses = await db.AiAnalyses
            .AsNoTracking()
            .Where(a => a.UserId == userId && a.JobApplicationId != null)
            .Select(a => new { a.JobApplicationId, a.MatchScore, a.CreatedAt })
            .ToListAsync(cancellationToken);

        var latestScores = analyses
            .GroupBy(a => a.JobApplicationId)
            .Select(group => group.OrderByDescending(a => a.CreatedAt).First().MatchScore)
            .ToList();

        var currentWeekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var weeklyActivity = Enumerable.Range(0, 12)
            .Select(offset => currentWeekStart.AddDays(-7 * (11 - offset)))
            .Select(weekStart => new WeeklyStatDto(
                weekStart,
                applications.Count(a => a.AppliedOn >= weekStart && a.AppliedOn < weekStart.AddDays(7))))
            .ToList();

        return new StatisticsDto(
            total,
            interviews,
            offers,
            accepted,
            rejected,
            rate(interviews),
            rate(offers),
            rate(accepted),
            monthlyData,
            statusDistribution,
            responseDays.Count == 0 ? null : Math.Round(responseDays.Average(), 1),
            latestScores.Count == 0 ? null : Math.Round(latestScores.Average(), 1),
            applications.Count(a => a.AppliedOn >= today.AddDays(-30)),
            weeklyActivity);
    }

    private const int InterviewStage = 2;
    private const int OfferStage = 3;
    private const int AcceptedStage = 4;

    /// <summary>Ordnet einem Status seine Stufe im Bewerbungstrichter zu.</summary>
    private static int StageOf(ApplicationStatus status) => status switch
    {
        ApplicationStatus.Applied => 1,
        ApplicationStatus.Interview => InterviewStage,
        ApplicationStatus.Offer => OfferStage,
        ApplicationStatus.Accepted => AcceptedStage,
        _ => 0
    };

    private static IQueryable<JobApplication> ApplyFilters(
        IQueryable<JobApplication> source,
        JobApplicationQuery query)
    {
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = $"%{query.Search.Trim()}%";

            source = source.Where(a =>
                EF.Functions.ILike(a.CompanyName, term)
                || EF.Functions.ILike(a.JobTitle, term)
                || (a.Location != null && EF.Functions.ILike(a.Location, term))
                || a.Technologies.Any(t => EF.Functions.ILike(t, term)));
        }

        if (query.Status is { Count: > 0 })
        {
            var statuses = query.Status.ToArray();
            source = source.Where(a => statuses.Contains(a.Status));
        }

        if (query.EmploymentType.HasValue)
        {
            source = source.Where(a => a.EmploymentType == query.EmploymentType.Value);
        }

        if (query.WorkModel.HasValue)
        {
            source = source.Where(a => a.WorkModel == query.WorkModel.Value);
        }

        if (query.IsOpen.HasValue)
        {
            source = query.IsOpen.Value
                ? source.Where(a => OpenStatuses.Contains(a.Status))
                : source.Where(a => !OpenStatuses.Contains(a.Status));
        }

        if (query.AppliedFrom.HasValue)
        {
            source = source.Where(a => a.AppliedOn != null && a.AppliedOn >= query.AppliedFrom.Value);
        }

        if (query.AppliedTo.HasValue)
        {
            source = source.Where(a => a.AppliedOn != null && a.AppliedOn <= query.AppliedTo.Value);
        }

        return source;
    }

    private static IQueryable<JobApplication> ApplySorting(
        IQueryable<JobApplication> source,
        JobApplicationQuery query)
    {
        var descending = query.SortDescending;

        IOrderedQueryable<JobApplication> ordered = query.SortBy switch
        {
            JobApplicationSortField.CreatedAt => descending
                ? source.OrderByDescending(a => a.CreatedAt)
                : source.OrderBy(a => a.CreatedAt),
            JobApplicationSortField.AppliedOn => descending
                ? source.OrderByDescending(a => a.AppliedOn)
                : source.OrderBy(a => a.AppliedOn),
            JobApplicationSortField.CompanyName => descending
                ? source.OrderByDescending(a => a.CompanyName)
                : source.OrderBy(a => a.CompanyName),
            JobApplicationSortField.JobTitle => descending
                ? source.OrderByDescending(a => a.JobTitle)
                : source.OrderBy(a => a.JobTitle),
            JobApplicationSortField.Status => descending
                ? source.OrderByDescending(a => a.Status)
                : source.OrderBy(a => a.Status),
            _ => descending
                ? source.OrderByDescending(a => a.UpdatedAt)
                : source.OrderBy(a => a.UpdatedAt)
        };

        // Stabile Sortierung: ohne eindeutigen Zweitschluessel kann Paging Datensaetze doppeln.
        return ordered.ThenByDescending(a => a.Id);
    }

    private static JobApplicationDetailDto ToDetail(JobApplication a) => new(
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
        a.IsOpen,
        a.CreatedAt,
        a.UpdatedAt,
        [.. a.StatusHistory
            .OrderByDescending(h => h.ChangedAt)
            .Select(h => new StatusHistoryEntryDto(h.Id, h.FromStatus, h.ToStatus, h.ChangedAt, h.Comment))]);

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static List<string> NormalizeTechnologies(IReadOnlyList<string>? technologies)
    {
        if (technologies is null || technologies.Count == 0)
        {
            return [];
        }

        return [.. technologies
            .Select(t => t.Trim())
            .Where(t => t.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)];
    }
}