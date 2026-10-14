using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;
using JobPilot.Application.Reminders;
using JobPilot.Domain.Enums;
using JobPilot.Infrastructure.Persistence;
using JobPilot.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;

namespace JobPilot.Tests.Infrastructure;

public class ReminderServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 14, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Create_Update_Complete_Delete_RoundTrip()
    {
        await using var context = CreateContext();
        var service = CreateService(context, Guid.CreateVersion7());

        var created = await service.CreateAsync(new SaveReminderRequest("  Nachfassen  ", " ", Now.AddDays(2), ReminderType.FollowUp, null));
        Assert.Equal("Nachfassen", created.Title);
        Assert.Null(created.Description);
        Assert.False(created.IsOverdue);

        var updated = await service.UpdateAsync(created.Id, new SaveReminderRequest("Gespräch", "Raum 3", Now.AddDays(1), ReminderType.Interview, null));
        Assert.Equal("Gespräch", updated.Title);
        Assert.Equal(ReminderType.Interview, updated.ReminderType);

        var completed = await service.SetCompletedAsync(created.Id, true);
        Assert.True(completed.IsCompleted);
        Assert.Equal(Now, completed.CompletedAt);

        var reopened = await service.SetCompletedAsync(created.Id, false);
        Assert.False(reopened.IsCompleted);
        Assert.Null(reopened.CompletedAt);

        await service.DeleteAsync(created.Id);
        Assert.Empty(await service.GetAllAsync(ReminderFilter.All));
    }

    [Fact]
    public async Task GetAll_FlagsOverdueAndSortsOpenByDueDate()
    {
        await using var context = CreateContext();
        var service = CreateService(context, Guid.CreateVersion7());

        await service.CreateAsync(new SaveReminderRequest("Später", null, Now.AddDays(5), ReminderType.Custom, null));
        await service.CreateAsync(new SaveReminderRequest("Überfällig", null, Now.AddHours(-1), ReminderType.Deadline, null));
        var done = await service.CreateAsync(new SaveReminderRequest("Erledigt", null, Now.AddDays(1), ReminderType.Custom, null));
        await service.SetCompletedAsync(done.Id, true);

        var open = await service.GetAllAsync(ReminderFilter.Open);

        Assert.Equal(["Überfällig", "Später"], open.Select(r => r.Title));
        Assert.True(open[0].IsOverdue);
        Assert.Equal(["Erledigt"], (await service.GetAllAsync(ReminderFilter.Completed)).Select(r => r.Title));
        Assert.Equal(2, (await service.GetUpcomingAsync(5)).Count);
    }

    [Fact]
    public async Task OtherUsersCannotAccessReminder()
    {
        await using var context = CreateContext();
        var reminder = await CreateService(context, Guid.CreateVersion7())
            .CreateAsync(new SaveReminderRequest("Privat", null, Now.AddDays(1), ReminderType.Custom, null));

        var intruder = CreateService(context, Guid.CreateVersion7());

        Assert.Empty(await intruder.GetAllAsync(ReminderFilter.All));
        await Assert.ThrowsAsync<NotFoundException>(() => intruder.SetCompletedAsync(reminder.Id, true));
        await Assert.ThrowsAsync<NotFoundException>(() => intruder.DeleteAsync(reminder.Id));
    }

    [Fact]
    public async Task GetAll_FiltersByApplication()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        var application = new JobPilot.Domain.Entities.JobApplication { UserId = userId, CompanyName = "Contoso", JobTitle = "Entwickler" };
        context.JobApplications.Add(application);
        await context.SaveChangesAsync();
        var service = CreateService(context, userId);

        await service.CreateAsync(new SaveReminderRequest("Zur Bewerbung", null, Now.AddDays(1), ReminderType.FollowUp, application.Id));
        await service.CreateAsync(new SaveReminderRequest("Allgemein", null, Now.AddDays(2), ReminderType.Custom, null));

        var filtered = await service.GetAllAsync(ReminderFilter.All, application.Id);

        Assert.Equal(["Zur Bewerbung"], filtered.Select(r => r.Title));
        Assert.Equal(2, (await service.GetAllAsync(ReminderFilter.All)).Count);
    }

    [Fact]
    public async Task Create_StoresDueDateInUtc()
    {
        // PostgreSQL (timestamptz) akzeptiert ueber Npgsql nur DateTimeOffset mit Offset 0.
        await using var context = CreateContext();
        var service = CreateService(context, Guid.CreateVersion7());
        var localDue = new DateTimeOffset(2026, 10, 20, 9, 0, 0, TimeSpan.FromHours(2));

        var reminder = await service.CreateAsync(new SaveReminderRequest("Termin", null, localDue, ReminderType.Interview, null));

        Assert.Equal(TimeSpan.Zero, reminder.DueAt.Offset);
        Assert.Equal(localDue.UtcDateTime, reminder.DueAt.UtcDateTime);
    }

    [Fact]
    public void Validator_RequiresTitleAndDueDate()
    {
        var result = new SaveReminderRequestValidator().Validate(
            new SaveReminderRequest("", null, default, ReminderType.Custom, null));

        Assert.Contains(result.Errors, e => e.PropertyName == nameof(SaveReminderRequest.Title));
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(SaveReminderRequest.DueAt));
    }

    private static JobPilotDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<JobPilotDbContext>()
            .UseInMemoryDatabase(Guid.CreateVersion7().ToString())
            .Options);

    private static ReminderService CreateService(JobPilotDbContext context, Guid userId) =>
        new(context, new TestCurrentUser(userId), new FixedTimeProvider(Now));

    private sealed class TestCurrentUser(Guid userId) : ICurrentUser
    {
        public Guid? UserId => userId;
        public string? Email => "test@example.com";
        public bool IsAuthenticated => true;
        public Guid RequireUserId() => userId;
    }
}
