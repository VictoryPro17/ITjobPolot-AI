using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;
using JobPilot.Application.Notes;
using JobPilot.Domain.Entities;
using JobPilot.Infrastructure.Persistence;
using JobPilot.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;

namespace JobPilot.Tests.Infrastructure;

public class ApplicationNoteServiceTests
{
    [Fact]
    public async Task Create_List_Delete_RoundTrip()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        var applicationId = await AddApplicationAsync(context, userId);
        var service = CreateService(context, userId);

        var first = await service.CreateAsync(applicationId, new CreateApplicationNoteRequest("  Erstes Telefonat  "));
        var second = await service.CreateAsync(applicationId, new CreateApplicationNoteRequest("Rückmeldung bis Freitag"));
        Assert.Equal("Erstes Telefonat", first.Content);

        // Zeitstempel eindeutig machen, damit die Sortierung pruefbar ist.
        (await context.ApplicationNotes.SingleAsync(n => n.Id == first.Id)).CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-5);
        await context.SaveChangesAsync();

        var notes = await service.GetAllAsync(applicationId);
        Assert.Equal([second.Id, first.Id], notes.Select(n => n.Id));

        await service.DeleteAsync(applicationId, first.Id);
        Assert.Equal([second.Id], (await service.GetAllAsync(applicationId)).Select(n => n.Id));
    }

    [Fact]
    public async Task OtherUsersCannotReadWriteOrDeleteNotes()
    {
        await using var context = CreateContext();
        var ownerId = Guid.CreateVersion7();
        var applicationId = await AddApplicationAsync(context, ownerId);
        var note = await CreateService(context, ownerId).CreateAsync(applicationId, new CreateApplicationNoteRequest("Privat"));

        var intruder = CreateService(context, Guid.CreateVersion7());

        await Assert.ThrowsAsync<NotFoundException>(() => intruder.GetAllAsync(applicationId));
        await Assert.ThrowsAsync<NotFoundException>(() => intruder.CreateAsync(applicationId, new CreateApplicationNoteRequest("Fremd")));
        await Assert.ThrowsAsync<NotFoundException>(() => intruder.DeleteAsync(applicationId, note.Id));
        Assert.Equal(1, await context.ApplicationNotes.CountAsync());
    }

    [Fact]
    public async Task Delete_RequiresMatchingApplication()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        var applicationId = await AddApplicationAsync(context, userId);
        var otherApplicationId = await AddApplicationAsync(context, userId);
        var service = CreateService(context, userId);
        var note = await service.CreateAsync(applicationId, new CreateApplicationNoteRequest("Notiz"));

        await Assert.ThrowsAsync<NotFoundException>(() => service.DeleteAsync(otherApplicationId, note.Id));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validator_RejectsEmptyContent(string content)
    {
        var result = new CreateApplicationNoteRequestValidator().Validate(new CreateApplicationNoteRequest(content));
        Assert.False(result.IsValid);
    }

    [Fact]
    public void Validator_RejectsTooLongContent()
    {
        var content = new string('a', CreateApplicationNoteRequestValidator.MaxContentLength + 1);
        Assert.False(new CreateApplicationNoteRequestValidator().Validate(new CreateApplicationNoteRequest(content)).IsValid);
    }

    private static async Task<Guid> AddApplicationAsync(JobPilotDbContext context, Guid userId)
    {
        var application = new JobApplication { UserId = userId, CompanyName = "Contoso", JobTitle = "Entwickler" };
        context.JobApplications.Add(application);
        await context.SaveChangesAsync();
        return application.Id;
    }

    private static JobPilotDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<JobPilotDbContext>()
            .UseInMemoryDatabase(Guid.CreateVersion7().ToString())
            .Options);

    private static ApplicationNoteService CreateService(JobPilotDbContext context, Guid userId) =>
        new(context, new TestCurrentUser(userId));

    private sealed class TestCurrentUser(Guid userId) : ICurrentUser
    {
        public Guid? UserId => userId;
        public string? Email => "test@example.com";
        public bool IsAuthenticated => true;
        public Guid RequireUserId() => userId;
    }
}
