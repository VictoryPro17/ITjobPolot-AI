using JobPilot.Application.Abstractions;
using JobPilot.Application.Ai;
using JobPilot.Application.Common;
using JobPilot.Domain.Entities;
using JobPilot.Domain.Enums;
using JobPilot.Infrastructure.Persistence;
using JobPilot.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace JobPilot.Tests.Infrastructure;

public class AiServiceTests
{
    [Fact]
    public async Task AnalyzeApplication_GeneratesMatchScoreAndPersistsResult()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        var application = new JobApplication
        {
            UserId = userId,
            CompanyName = "Contoso",
            JobTitle = "Senior C# Developer",
            JobDescription = "Wir suchen einen Senior C# Developer mit ASP.NET Core, PostgreSQL und Azure-Erfahrung.",
            Technologies = ["C#", ".NET", "ASP.NET Core", "PostgreSQL"]
        };

        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var service = CreateService(context, userId, new AiOptions { Enabled = true, Provider = "local", Model = "heuristic" });

        var result = await service.AnalyzeApplicationAsync(application.Id);

        Assert.Equal(application.Id, result.JobApplicationId);
        Assert.InRange(result.MatchScore, 0, 100);
        Assert.False(string.IsNullOrWhiteSpace(result.Summary));
        Assert.Equal(userId, (await context.AiAnalyses.SingleAsync()).UserId);
    }

    [Fact]
    public async Task GenerateCoverLetter_CreatesDraftForApplication()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        var application = new JobApplication
        {
            UserId = userId,
            CompanyName = "Contoso",
            JobTitle = "Senior C# Developer",
            JobDescription = "Wir suchen einen C#-Entwickler mit .NET und Cloud-Erfahrung.",
            Technologies = ["C#", ".NET", "Azure"]
        };

        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var service = CreateService(context, userId, new AiOptions { Enabled = true, Provider = "local", Model = "heuristic" });

        var result = await service.GenerateCoverLetterAsync(
            application.Id,
            new GenerateCoverLetterRequest("Professionelles Anschreiben", WritingStyle.Professional, true));

        Assert.Equal(application.Id, result.JobApplicationId);
        Assert.Contains("Contoso", result.Content, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(userId, (await context.GeneratedCoverLetters.SingleAsync()).UserId);
    }

    private static JobPilotDbContext CreateContext(string? databaseName = null) =>
        new(new DbContextOptionsBuilder<JobPilotDbContext>()
            .UseInMemoryDatabase(databaseName ?? Guid.CreateVersion7().ToString())
            .Options);

    private static AiService CreateService(JobPilotDbContext context, Guid userId, AiOptions options) =>
        new(
            context,
            new TestCurrentUser(userId),
            Options.Create(options),
            NullLogger<AiService>.Instance);

    private sealed class TestCurrentUser(Guid userId) : ICurrentUser
    {
        public Guid? UserId => userId;
        public string? Email => "test@example.com";
        public bool IsAuthenticated => true;
        public Guid RequireUserId() => userId;
    }
}
