using System.Net;
using System.Text;
using System.Text.Json;

using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;
using JobPilot.Application.Matching;
using JobPilot.Domain.Entities;
using JobPilot.Infrastructure;
using JobPilot.Infrastructure.Ai;
using JobPilot.Infrastructure.Persistence;
using JobPilot.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace JobPilot.Tests.Infrastructure;

public class OllamaIntegrationTests
{
    private const string Resume = """
        Lena Fischer
        Senior Fullstack Developer .NET
        Hauptstraße 12, 50667 Köln

        Kenntnisse
        C#, ASP.NET Core, Azure, React
        """;

    private static readonly AiOptions Options = new()
    {
        Enabled = true,
        Provider = "ollama",
        Model = "qwen2.5:3b",
        BaseUrl = "http://ollama.test",
        DailyRequestLimitPerUser = 2
    };

    // ---------- Lebenslauf ----------

    [Fact]
    public async Task Extractor_UsesAiFieldsAndDropsInventedSkills()
    {
        var handler = FakeOllama.Returning(new
        {
            firstName = "Lena",
            lastName = "Fischer",
            targetJobTitle = "Senior Fullstack Developer .NET",
            location = "Köln",
            profileSummary = "Erfahrene Entwicklerin.",
            experienceSummary = (string?)null,
            educationSummary = (string?)null,
            skills = new[] { "C#", "React", "Kubernetes" } // Kubernetes steht nicht im Lebenslauf
        });

        var result = await CreateExtractor(handler).ExtractAsync(Resume);

        Assert.Equal("Köln", result.Location);
        Assert.Equal("Erfahrene Entwicklerin.", result.ProfileSummary);
        Assert.Contains("React", result.Skills);
        Assert.Contains("ASP.NET Core", result.Skills); // aus der regelbasierten Erkennung ergaenzt
        Assert.DoesNotContain("Kubernetes", result.Skills);
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task Extractor_FillsEmptyAiFieldsFromHeuristic()
    {
        var handler = FakeOllama.Returning(new
        {
            firstName = (string?)null,
            lastName = (string?)null,
            targetJobTitle = "null",
            location = (string?)null,
            profileSummary = (string?)null,
            experienceSummary = (string?)null,
            educationSummary = (string?)null,
            skills = Array.Empty<string>()
        });

        var result = await CreateExtractor(handler).ExtractAsync(Resume);

        Assert.Equal("Lena", result.FirstName);
        Assert.Equal("Senior Fullstack Developer .NET", result.TargetJobTitle);
        Assert.Equal("Köln", result.Location);
    }

    [Theory]
    [InlineData(FakeOllama.Mode.ServerError)]
    [InlineData(FakeOllama.Mode.Timeout)]
    [InlineData(FakeOllama.Mode.InvalidJson)]
    public async Task Extractor_FallsBackToHeuristicOnFailure(FakeOllama.Mode mode)
    {
        var result = await CreateExtractor(FakeOllama.Failing(mode)).ExtractAsync(Resume);

        Assert.Equal("Lena", result.FirstName);
        Assert.Contains("C#", result.Skills);
    }

    // ---------- Match-Analyse ----------

    private static readonly JobMatchInput MatchInput = new(
        "Backend Developer",
        "Contoso",
        "Wir suchen Erfahrung mit C# und Kubernetes. Du kennst OpenTelemetry und bist teamfähig.",
        [],
        "Backend Developer",
        ["C#"],
        null,
        "Monitoring mit OpenTelemetry aufgebaut.",
        null,
        Resume);

    [Fact]
    public async Task Analyzer_SplitsEnumeratedRequirementsIntoSingleSkills()
    {
        await using var context = CreateContext();
        var handler = FakeOllama.Returning(new
        {
            summary = "Du passt gut zur Stelle.",
            recommendations = Array.Empty<string>(),
            learningTopics = Array.Empty<string>(),
            // Tatsaechlich beobachtet: die KI liefert eine ganze Aufzaehlung als eine Anforderung.
            additionalRequirements = new[] { "Kenntnisse in Kubernetes, Terraform und Ansible" }
        });
        var input = MatchInput with { JobDescription = "Wir suchen C#. Kenntnisse in Kubernetes, Terraform und Ansible sind von Vorteil." };

        var result = await CreateAnalyzer(context, handler).AnalyzeAsync(input);

        Assert.DoesNotContain(result.RequiredSkills, skill => skill.Contains(',') || skill.Contains(" und "));
        Assert.Contains("Terraform", result.RequiredSkills, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("Ansible", result.RequiredSkills, StringComparer.OrdinalIgnoreCase);
        Assert.Equal(result.RequiredSkills.Count, result.RequiredSkills.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }

    [Fact]
    public async Task Analyzer_KeepsRuleBasedFactorsAndUsesAiTexts()
    {
        await using var context = CreateContext();
        var handler = FakeOllama.Returning(new
        {
            summary = "Du passt gut zur Stelle.",
            recommendations = new[] { "Hebe dein C#-Projekt hervor." },
            learningTopics = new[] { "Kubernetes-Grundlagen" },
            additionalRequirements = new[] { "OpenTelemetry", "teamfähig", "Rust" }
        });

        var result = await CreateAnalyzer(context, handler).AnalyzeAsync(MatchInput);

        Assert.Equal("Du passt gut zur Stelle.", result.Summary);
        // Die KI-Empfehlung steht vorn; bei weniger als zwei Eintraegen ergaenzt eine regelbasierte.
        Assert.Equal("Hebe dein C#-Projekt hervor.", result.Recommendations[0]);
        Assert.Equal(2, result.Recommendations.Count);
        Assert.Equal("ollama", result.Provider);

        // OpenTelemetry steht woertlich in der Stelle und im Profil; "teamfähig" ist generisch, "Rust" erfunden.
        Assert.Equal(["C#", "Kubernetes", "OpenTelemetry"], result.RequiredSkills);
        Assert.Contains("OpenTelemetry", result.MatchedSkills);
        Assert.Equal(["Kubernetes"], result.MissingSkills);

        var skillsFactor = result.Factors.Single(f => f.Key == "skills");
        Assert.Equal(67, skillsFactor.Score);
        Assert.Equal(HeuristicJobMatchAnalyzer.ComputeScore(result.Factors), result.MatchScore);
    }

    [Theory]
    [InlineData("Du bringst C# mit, hast aber keine Erfahrung mit C# im Backend.")] // abgedeckter Skill als fehlend
    [InlineData("Lena bringt C# mit und sollte Kubernetes lernen.")] // dritte Person mit Namen
    public async Task Analyzer_RejectsInconsistentSummary(string aiSummary)
    {
        await using var context = CreateContext();
        var handler = FakeOllama.Returning(new
        {
            summary = aiSummary,
            recommendations = Array.Empty<string>(),
            learningTopics = Array.Empty<string>(),
            additionalRequirements = Array.Empty<string>()
        });

        var result = await CreateAnalyzer(context, handler).AnalyzeAsync(MatchInput with { CandidateName = "Lena Fischer" });

        Assert.NotEqual(aiSummary, result.Summary);
        Assert.StartsWith("Für Backend Developer bei Contoso", result.Summary);
    }

    [Fact]
    public async Task Analyzer_DropsMisleadingAndSoftSkillRecommendations()
    {
        await using var context = CreateContext();
        var handler = FakeOllama.Returning(new
        {
            summary = "Du bringst C# mit, dir fehlt noch Kubernetes.",
            recommendations = new[]
            {
                "Erwähne deine Kubernetes-Kenntnisse in der Bewerbung.",
                "Betone deine Kommunikationsstärke.",
                "Setze ein kleines Kubernetes-Projekt mit einem Helm-Chart um."
            },
            learningTopics = Array.Empty<string>(),
            additionalRequirements = Array.Empty<string>()
        });

        var result = await CreateAnalyzer(context, handler).AnalyzeAsync(MatchInput);

        Assert.Equal("Du bringst C# mit, dir fehlt noch Kubernetes.", result.Summary);
        Assert.Equal("Setze ein kleines Kubernetes-Projekt mit einem Helm-Chart um.", result.Recommendations[0]);
        Assert.DoesNotContain(result.Recommendations, text => text.StartsWith("Erwähne") || text.Contains("Kommunikation"));
    }

    [Fact]
    public async Task Analyzer_StripsFillerWordsFromAdditionalRequirements()
    {
        await using var context = CreateContext();
        var handler = FakeOllama.Returning(new
        {
            summary = "Du passt gut.",
            recommendations = Array.Empty<string>(),
            learningTopics = Array.Empty<string>(),
            additionalRequirements = new[] { "Erfahrung mit OpenTelemetry", "Teamfähigkeit" }
        });

        var result = await CreateAnalyzer(context, handler).AnalyzeAsync(MatchInput);

        Assert.Contains("OpenTelemetry", result.RequiredSkills);
        Assert.DoesNotContain(result.RequiredSkills, skill => skill.Contains("Team", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Analyzer_SkipsAiWhenDailyLimitReached()
    {
        await using var context = CreateContext();
        context.AiAnalyses.AddRange(
            new AiAnalysis { UserId = UserId, JobDescription = "x", Provider = "ollama" },
            new AiAnalysis { UserId = UserId, JobDescription = "x", Provider = "ollama" });
        await context.SaveChangesAsync();
        var handler = FakeOllama.Returning(new { summary = "unbenutzt" });

        var result = await CreateAnalyzer(context, handler).AnalyzeAsync(MatchInput);

        Assert.Equal(0, handler.Calls);
        Assert.Equal("local", result.Provider);
        Assert.Contains(result.ProfileHints, hint => hint.Contains("Tageslimit", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Analyzer_FallsBackToHeuristicOnFailure()
    {
        await using var context = CreateContext();

        var result = await CreateAnalyzer(context, FakeOllama.Failing(FakeOllama.Mode.ServerError)).AnalyzeAsync(MatchInput);

        Assert.Equal("local", result.Provider);
        Assert.Equal(["C#", "Kubernetes"], result.RequiredSkills);
    }

    [Theory]
    [InlineData(true, "ollama", true)]
    [InlineData(false, "ollama", false)]
    [InlineData(true, "openai", false)]
    public void UsesOllama_OnlyWhenEnabledAndSelected(bool enabled, string provider, bool expected)
    {
        Assert.Equal(expected, DependencyInjection.UsesOllama(new AiOptions { Enabled = enabled, Provider = provider }));
    }

    // ---------- Hilfen ----------

    private static readonly Guid UserId = Guid.CreateVersion7();

    private static OllamaClient CreateClient(HttpMessageHandler handler) =>
        new(new HttpClient(handler) { BaseAddress = new Uri(Options.BaseUrl) }, Microsoft.Extensions.Options.Options.Create(Options));

    private static OllamaResumeProfileExtractor CreateExtractor(HttpMessageHandler handler) =>
        new(CreateClient(handler), new HeuristicResumeProfileExtractor(), NullLogger<OllamaResumeProfileExtractor>.Instance);

    private static OllamaJobMatchAnalyzer CreateAnalyzer(JobPilotDbContext context, HttpMessageHandler handler) =>
        new(
            CreateClient(handler),
            new HeuristicJobMatchAnalyzer(TimeProvider.System),
            context,
            new TestCurrentUser(UserId),
            TimeProvider.System,
            Microsoft.Extensions.Options.Options.Create(Options),
            NullLogger<OllamaJobMatchAnalyzer>.Instance);

    private static JobPilotDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<JobPilotDbContext>()
            .UseInMemoryDatabase(Guid.CreateVersion7().ToString())
            .Options);

    private sealed class TestCurrentUser(Guid userId) : ICurrentUser
    {
        public Guid? UserId => userId;
        public string? Email => "test@example.com";
        public bool IsAuthenticated => true;
        public Guid RequireUserId() => userId;
    }

    /// <summary>Simuliert die Ollama-Chat-API.</summary>
    public sealed class FakeOllama : HttpMessageHandler
    {
        public enum Mode { Success, ServerError, Timeout, InvalidJson }

        private readonly Mode _mode;
        private readonly string _content;

        private FakeOllama(Mode mode, string content)
        {
            _mode = mode;
            _content = content;
        }

        public int Calls { get; private set; }

        public static FakeOllama Returning(object payload) => new(Mode.Success, JsonSerializer.Serialize(payload));

        public static FakeOllama Failing(Mode mode) => new(mode, "kein json {");

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;

            return _mode switch
            {
                Mode.ServerError => Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError)),
                Mode.Timeout => throw new TaskCanceledException("Zeitüberschreitung"),
                _ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        JsonSerializer.Serialize(new { message = new { role = "assistant", content = _content } }),
                        Encoding.UTF8,
                        "application/json")
                })
            };
        }
    }
}
