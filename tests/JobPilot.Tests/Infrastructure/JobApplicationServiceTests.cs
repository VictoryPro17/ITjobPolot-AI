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

    private static JobApplicationService CreateService(JobPilotDbContext context, Guid userId) =>
        new(context, new TestCurrentUser(userId), NullLogger<JobApplicationService>.Instance);

    private sealed class TestCurrentUser(Guid userId) : ICurrentUser
    {
        public Guid? UserId => userId;
        public string? Email => "test@example.com";
        public bool IsAuthenticated => true;
        public Guid RequireUserId() => userId;
    }
}
