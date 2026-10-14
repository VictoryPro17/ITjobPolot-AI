using JobPilot.Application.Abstractions;
using JobPilot.Application.JobApplications;
using JobPilot.Domain.Entities;
using JobPilot.Domain.Enums;
using JobPilot.Infrastructure.Persistence;
using JobPilot.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace JobPilot.Tests.Infrastructure;

public class JobApplicationServiceTests
{
    [Fact]
    public async Task Create_AssignsOwnerAndWritesInitialHistory()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        var service = CreateService(context, userId);

        var result = await service.CreateAsync(
            new CreateJobApplicationRequest("Contoso", "Developer", "Berlin"));

        var stored = await context.JobApplications
            .Include(application => application.StatusHistory)
            .SingleAsync();

        Assert.Equal(userId, stored.UserId);
        Assert.Equal("Contoso", result.CompanyName);
        Assert.Single(stored.StatusHistory);
        Assert.Equal(ApplicationStatus.Draft, stored.StatusHistory.Single().ToStatus);

        // Ohne UserId verletzt der Eintrag in PostgreSQL den Fremdschluessel auf AspNetUsers.
        Assert.Equal(userId, stored.StatusHistory.Single().UserId);
    }

    [Fact]
    public async Task GetPaged_DoesNotReturnAnotherUsersApplications()
    {
        await using var context = CreateContext();
        var ownerId = Guid.CreateVersion7();
        context.JobApplications.AddRange(
            new() { UserId = ownerId, CompanyName = "Owner", JobTitle = "Developer" },
            new() { UserId = Guid.CreateVersion7(), CompanyName = "Other", JobTitle = "Developer" });
        await context.SaveChangesAsync();

        var result = await CreateService(context, ownerId).GetPagedAsync(new JobApplicationQuery());

        var item = Assert.Single(result.Items);
        Assert.Equal("Owner", item.CompanyName);
    }

    [Fact]
    public async Task ChangeStatus_FromDraftSetsAppliedDateAndHistory()
    {
        var databaseName = Guid.CreateVersion7().ToString();
        var userId = Guid.CreateVersion7();
        var application = new JobPilot.Domain.Entities.JobApplication
        {
            UserId = userId,
            CompanyName = "Contoso",
            JobTitle = "Developer"
        };
        await using (var seedContext = CreateContext(databaseName))
        {
            seedContext.JobApplications.Add(application);
            await seedContext.SaveChangesAsync();
        }

        await using var context = CreateContext(databaseName);
        var result = await CreateService(context, userId).ChangeStatusAsync(
            application.Id,
            new ChangeStatusRequest(ApplicationStatus.Applied, "Abgeschickt"));

        Assert.Equal(ApplicationStatus.Applied, result.Status);
        Assert.NotNull(result.AppliedOn);
        Assert.Contains(result.StatusHistory, history => history.ToStatus == ApplicationStatus.Applied);
        Assert.All(
            await context.ApplicationStatusHistories.ToListAsync(),
            history => Assert.Equal(userId, history.UserId));
    }

    [Fact]
    public async Task Update_WithChangedStatus_WritesHistoryForCurrentUser()
    {
        var databaseName = Guid.CreateVersion7().ToString();
        var userId = Guid.CreateVersion7();
        var application = new JobPilot.Domain.Entities.JobApplication
        {
            UserId = userId,
            CompanyName = "Contoso",
            JobTitle = "Developer"
        };

        await using (var seedContext = CreateContext(databaseName))
        {
            seedContext.JobApplications.Add(application);
            await seedContext.SaveChangesAsync();
        }

        await using var context = CreateContext(databaseName);
        await CreateService(context, userId).UpdateAsync(
            application.Id,
            new UpdateJobApplicationRequest(
                CompanyName: "Contoso",
                JobTitle: "Developer",
                Location: "Berlin",
                EmploymentType: EmploymentType.FullTime,
                WorkModel: WorkModel.Hybrid,
                Salary: null,
                JobPostingUrl: null,
                AppliedOn: null,
                Status: ApplicationStatus.Interview,
                JobDescription: null,
                Technologies: null,
                Notes: null,
                ContactName: null,
                ContactEmail: null,
                ContactPhone: null,
                InterviewAt: null,
                InterviewLocation: null));

        var history = Assert.Single(await context.ApplicationStatusHistories.ToListAsync());
        Assert.Equal(userId, history.UserId);
        Assert.Equal(ApplicationStatus.Interview, history.ToStatus);
    }

    [Fact]
    public async Task GetStatistics_CountsDirectRejectionAsUnsuccessful()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        var appliedOn = new DateOnly(2026, 8, 2);

        // Direkte Absage ohne Gespraech: darf weder Einladungs- noch Angebotsquote erhoehen.
        var rejected = new JobPilot.Domain.Entities.JobApplication
        {
            UserId = userId,
            CompanyName = "Fabrikam",
            JobTitle = "Developer",
            AppliedOn = appliedOn,
            Status = ApplicationStatus.Rejected
        };

        // Absage erst nach dem Gespraech: zaehlt als Einladung, aber nicht als Angebot.
        var rejectedAfterInterview = new JobPilot.Domain.Entities.JobApplication
        {
            UserId = userId,
            CompanyName = "Contoso",
            JobTitle = "Developer",
            AppliedOn = appliedOn,
            Status = ApplicationStatus.Rejected
        };

        context.JobApplications.AddRange(rejected, rejectedAfterInterview);
        context.ApplicationStatusHistories.AddRange(
            new ApplicationStatusHistory
            {
                UserId = userId,
                JobApplicationId = rejected.Id,
                ToStatus = ApplicationStatus.Rejected,
                ChangedAt = DateTimeOffset.UtcNow
            },
            new ApplicationStatusHistory
            {
                UserId = userId,
                JobApplicationId = rejectedAfterInterview.Id,
                ToStatus = ApplicationStatus.Interview,
                ChangedAt = DateTimeOffset.UtcNow
            },
            new ApplicationStatusHistory
            {
                UserId = userId,
                JobApplicationId = rejectedAfterInterview.Id,
                FromStatus = ApplicationStatus.Interview,
                ToStatus = ApplicationStatus.Rejected,
                ChangedAt = DateTimeOffset.UtcNow
            });
        await context.SaveChangesAsync();

        var statistics = await CreateService(context, userId).GetStatisticsAsync();

        Assert.Equal(2, statistics.TotalApplications);
        Assert.Equal(2, statistics.TotalRejected);
        Assert.Equal(1, statistics.TotalInterviews);
        Assert.Equal(0, statistics.TotalOffers);
        Assert.Equal(0, statistics.TotalAccepted);
        Assert.Equal(50d, statistics.InterviewRate);
        Assert.Equal(0d, statistics.OfferRate);

        var month = Assert.Single(statistics.MonthlyData);
        Assert.Equal(2026, month.Year);
        Assert.Equal(8, month.Month);
        Assert.Equal(2, month.Applied);
        Assert.Equal(1, month.Interviews);
        Assert.Equal(2, month.Rejected);
    }

    private static JobPilotDbContext CreateContext(string? databaseName = null) =>
        new(new DbContextOptionsBuilder<JobPilotDbContext>()
            .UseInMemoryDatabase(databaseName ?? Guid.CreateVersion7().ToString())
            .Options);

    [Fact]
    public async Task Create_StoresInterviewTimeInUtc()
    {
        // PostgreSQL (timestamptz) akzeptiert ueber Npgsql nur DateTimeOffset mit Offset 0.
        await using var context = CreateContext();
        var localInterview = new DateTimeOffset(2026, 10, 20, 14, 30, 0, TimeSpan.FromHours(2));

        var created = await CreateService(context, Guid.CreateVersion7()).CreateAsync(
            new CreateJobApplicationRequest("Contoso", "Developer", null, InterviewAt: localInterview));

        Assert.Equal(TimeSpan.Zero, created.InterviewAt!.Value.Offset);
        Assert.Equal(localInterview.UtcDateTime, created.InterviewAt.Value.UtcDateTime);
    }

    [Fact]
    public async Task GetStatistics_ReturnsExtendedMetrics()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        var today = new DateOnly(2026, 10, 14); // Mittwoch
        var clock = new FixedTimeProvider(new DateTimeOffset(2026, 10, 14, 12, 0, 0, TimeSpan.Zero));

        var answered = new JobPilot.Domain.Entities.JobApplication
        {
            UserId = userId,
            CompanyName = "Contoso",
            JobTitle = "Developer",
            AppliedOn = today.AddDays(-10),
            Status = ApplicationStatus.Interview
        };
        var waiting = new JobPilot.Domain.Entities.JobApplication
        {
            UserId = userId,
            CompanyName = "Fabrikam",
            JobTitle = "Developer",
            AppliedOn = today.AddDays(-40),
            Status = ApplicationStatus.Applied
        };
        var draft = new JobPilot.Domain.Entities.JobApplication
        {
            UserId = userId,
            CompanyName = "Northwind",
            JobTitle = "Developer"
        };

        context.JobApplications.AddRange(answered, waiting, draft);
        context.ApplicationStatusHistories.Add(new ApplicationStatusHistory
        {
            UserId = userId,
            JobApplicationId = answered.Id,
            FromStatus = ApplicationStatus.Applied,
            ToStatus = ApplicationStatus.Interview,
            ChangedAt = new DateTimeOffset(2026, 10, 8, 9, 0, 0, TimeSpan.Zero)
        });
        // CreatedAt setzt der DbContext beim Speichern; getrennte Saves erzwingen die Reihenfolge.
        context.AiAnalyses.Add(new AiAnalysis { UserId = userId, JobApplicationId = answered.Id, JobDescription = "x", MatchScore = 40 });
        await context.SaveChangesAsync();
        await Task.Delay(5);
        context.AiAnalyses.AddRange(
            new AiAnalysis { UserId = userId, JobApplicationId = answered.Id, JobDescription = "x", MatchScore = 80 },
            new AiAnalysis { UserId = userId, JobApplicationId = waiting.Id, JobDescription = "x", MatchScore = 60 });
        await context.SaveChangesAsync();

        var statistics = await CreateService(context, userId, clock).GetStatisticsAsync();

        Assert.Equal(1, statistics.StatusDistribution.Single(s => s.Status == ApplicationStatus.Draft).Count);
        Assert.Equal(1, statistics.StatusDistribution.Single(s => s.Status == ApplicationStatus.Interview).Count);
        Assert.Equal(4d, statistics.AverageDaysToResponse);
        Assert.Equal(70d, statistics.AverageMatchScore);
        Assert.Equal(1, statistics.ApplicationsLast30Days);
        Assert.Equal(12, statistics.WeeklyActivity.Count);
        Assert.Equal(new DateOnly(2026, 10, 12), statistics.WeeklyActivity[^1].WeekStart);
        Assert.Equal(1, statistics.WeeklyActivity.Single(w => w.WeekStart == new DateOnly(2026, 9, 28)).Applied);
    }

    private static JobApplicationService CreateService(JobPilotDbContext context, Guid userId, TimeProvider? timeProvider = null) =>
        new(context, new TestCurrentUser(userId), timeProvider ?? TimeProvider.System, NullLogger<JobApplicationService>.Instance);

    private sealed class TestCurrentUser(Guid userId) : ICurrentUser
    {
        public Guid? UserId => userId;
        public string? Email => "test@example.com";
        public bool IsAuthenticated => true;
        public Guid RequireUserId() => userId;
    }
}
