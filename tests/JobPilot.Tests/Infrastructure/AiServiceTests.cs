using JobPilot.Application.Abstractions;
using JobPilot.Application.Ai;
using JobPilot.Application.Auth;
using JobPilot.Application.Common;
using JobPilot.Domain.Entities;
using JobPilot.Domain.Enums;
using JobPilot.Infrastructure.Persistence;
using JobPilot.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace JobPilot.Tests.Infrastructure;

public class AiServiceTests
{
    [Fact]
    public void AiOptions_DefaultsToDisabled()
    {
        var options = new AiOptions();

        Assert.False(options.Enabled);
    }

    [Fact]
    public async Task AnalyzeApplication_UsesLocalHeuristicProvider()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        var application = new JobApplication
        {
            UserId = userId,
            CompanyName = "Contoso",
            JobTitle = "Backend Developer",
            JobDescription = "Wir suchen Erfahrung mit C# und PostgreSQL."
        };

        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var service = CreateService(context, userId);

        var result = await service.AnalyzeApplicationAsync(application.Id);

        Assert.Equal("local", result.Provider);
        Assert.Equal("heuristic-v1", result.Model);
    }

    [Fact]
    public async Task AnalyzeApplication_TreatsJobTechnologiesAsRequirementsNotMatches()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        var application = new JobApplication
        {
            UserId = userId,
            CompanyName = "Contoso",
            JobTitle = "Frontend Developer",
            JobDescription = "Spannende Aufgaben im Frontend.",
            Technologies = ["Angular"]
        };

        context.Users.Add(new ApplicationUser { Id = userId, UserName = "empty@example.com", Email = "empty@example.com" });
        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var service = CreateService(context, userId);

        var result = await service.AnalyzeApplicationAsync(application.Id);

        Assert.Contains("Angular", result.MissingSkills);
        Assert.DoesNotContain("Angular", result.MatchedSkills);
    }

    [Fact]
    public async Task AnalyzeApplication_ReturnsFactorsAndProfileHints()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        var user = new ApplicationUser
        {
            Id = userId,
            UserName = "factors@example.com",
            Email = "factors@example.com",
            TargetJobTitle = "Senior C# Developer",
            Skills = ["C#", "Azure"],
            ExperienceSummary = "6 Jahre Erfahrung in der .NET-Entwicklung."
        };
        var application = new JobApplication
        {
            UserId = userId,
            CompanyName = "Contoso",
            JobTitle = "C# Developer (m/w/d)",
            JobDescription = "Mindestens 5 Jahre Erfahrung mit C#, Azure und Kubernetes."
        };

        context.Users.Add(user);
        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var service = CreateService(context, userId);

        var result = await service.AnalyzeApplicationAsync(application.Id);

        Assert.Equal(["skills", "experience", "position"], result.Factors.Select(f => f.Key));
        Assert.Equal(100, result.Factors.Single(f => f.Key == "experience").Score);
        Assert.Equal(100, result.Factors.Single(f => f.Key == "position").Score);
        Assert.Contains("Kubernetes", result.MissingSkills);
        Assert.Contains(result.ProfileHints, hint => hint.Contains("Lebenslauf", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GenerateCoverLetter_UsesUserDisplayName()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        context.Users.Add(new ApplicationUser
        {
            Id = userId,
            UserName = "erika@example.com",
            Email = "erika@example.com",
            FirstName = "Erika",
            LastName = "Musterfrau"
        });
        var application = new JobApplication
        {
            UserId = userId,
            CompanyName = "Contoso",
            JobTitle = "Developer",
            Technologies = ["C#"]
        };
        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var service = CreateService(context, userId);

        var result = await service.GenerateCoverLetterAsync(application.Id, new GenerateCoverLetterRequest("Anschreiben"));

        Assert.EndsWith("Erika Musterfrau", result.Content);
        Assert.DoesNotContain("[Ihr Name]", result.Content);
    }

    [Fact]
    public async Task AnalyzeApplication_IgnoresGenericWordsFromJobDescription()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        var application = new JobApplication
        {
            UserId = userId,
            CompanyName = "Contoso",
            JobTitle = "Full Stack Developer",
            JobDescription = "Wir suchen einen Full Stack Developer mit Angular, .NET, C# und Azure. Erfahrung in Zusammenarbeit, Kommunikation und Teamwork ist wichtig.",
            Technologies = ["Angular", ".NET", "C#", "Azure"]
        };

        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var service = CreateService(context, userId);

        var result = await service.AnalyzeApplicationAsync(application.Id);

        Assert.Contains("angular", result.RequiredSkills, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("c#", result.RequiredSkills, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("teamwork", result.RequiredSkills, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("kommunikation", result.RequiredSkills, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("zusammenarbeit", result.RequiredSkills, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AnalyzeApplication_LimitsGenericSkillsAndRecommendations()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();
        var application = new JobApplication
        {
            UserId = userId,
            CompanyName = "Contoso",
            JobTitle = "Full Stack Developer",
            JobDescription = "Wir suchen einen Full Stack Developer mit Angular, ASP.NET Core, C# und Azure. CI/CD, API, Agile und Teamwork sind erwünscht.",
            Technologies = ["Angular", "ASP.NET Core", "C#", "Azure"]
        };

        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var service = CreateService(context, userId);

        var result = await service.AnalyzeApplicationAsync(application.Id);

        Assert.DoesNotContain("agile", result.RequiredSkills, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("api", result.RequiredSkills, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("teamwork", result.RequiredSkills, StringComparer.OrdinalIgnoreCase);
        Assert.True(result.Recommendations.Count <= 5);
        Assert.DoesNotContain(result.Recommendations, recommendation => recommendation.Contains("agile", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task AnalyzeApplication_UsesUserProfileSkillsForMatching()
    {
        await using var context = CreateContext();
        var userId = Guid.CreateVersion7();

        var user = new ApplicationUser
        {
            Id = userId,
            UserName = "profile-user@example.com",
            Email = "profile-user@example.com",
            TargetJobTitle = "Full Stack Developer",
            Skills = ["C#", "ASP.NET Core", "Azure", "Angular"],
            ProfileSummary = "Full Stack Developer mit Fokus auf ASP.NET Core, Azure und Angular.",
            ExperienceSummary = "2 Jahre als Full Stack Developer in Web- und API-Projekten."
        };

        var application = new JobApplication
        {
            UserId = userId,
            CompanyName = "Contoso",
            JobTitle = "Full Stack Developer",
            JobDescription = "Wir suchen einen Full Stack Developer mit Angular und Azure. Gute Kenntnisse in ASP.NET Core sind wichtig.",
            Technologies = []
        };

        context.Users.Add(user);
        context.JobApplications.Add(application);
        await context.SaveChangesAsync();

        var service = CreateService(context, userId);

        var result = await service.AnalyzeApplicationAsync(application.Id);

        Assert.Contains("angular", result.MatchedSkills, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("azure", result.MatchedSkills, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("asp.net core", result.MatchedSkills, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void CurrentUserResponse_ContainsResumeText()
    {
        var response = new CurrentUserResponse(
            Guid.NewGuid(),
            "user@example.com",
            "Max Mustermann",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            "Senior C# developer with ASP.NET Core and Azure experience.",
            [],
            "system",
            [],
            DateTimeOffset.UtcNow);

        Assert.Equal("Senior C# developer with ASP.NET Core and Azure experience.", response.ResumeText);
    }

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

        var service = CreateService(context, userId);

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

        var service = CreateService(context, userId);

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

    private static AiService CreateService(JobPilotDbContext context, Guid userId) =>
        new(
            context,
            new TestCurrentUser(userId),
            new HeuristicJobMatchAnalyzer(TimeProvider.System),
            NullLogger<AiService>.Instance);

    private sealed class TestCurrentUser(Guid userId) : ICurrentUser
    {
        public Guid? UserId => userId;
        public string? Email => "test@example.com";
        public bool IsAuthenticated => true;
        public Guid RequireUserId() => userId;
    }
}
