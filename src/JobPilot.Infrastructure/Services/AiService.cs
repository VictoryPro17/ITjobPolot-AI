using JobPilot.Application.Abstractions;
using JobPilot.Application.Ai;
using JobPilot.Application.Common;
using JobPilot.Domain.Entities;
using JobPilot.Domain.Enums;
using JobPilot.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace JobPilot.Infrastructure.Services;

/// <summary>
/// Einfache, lokale KI-Implementierung fuer Phase 4. Sie nutzt Keywords aus der
/// Stellenbeschreibung und erzeugt damit konsistente, nachvollziehbare Ergebnisse
/// ohne externe Abhaengigkeiten.
/// </summary>
public class AiService(
    JobPilotDbContext db,
    ICurrentUser currentUser,
    IOptions<AiOptions> options,
    ILogger<AiService> logger) : IAiService
{
    private readonly AiOptions _aiOptions = options.Value;

    private static readonly string[] KnownSkills =
    [
        "c#",
        "dotnet",
        "asp.net core",
        "aspnet",
        "postgresql",
        "sql",
        "sqlserver",
        "mysql",
        "azure",
        "aws",
        "docker",
        "kubernetes",
        "react",
        "typescript",
        "javascript",
        "node",
        "html",
        "css",
        "rest",
        "api",
        "microservices",
        "entity framework",
        "ef core",
        "pytest",
        "xunit",
        "jest",
        "testing",
        "ci",
        "cd",
        "agile",
        "scrum",
        "cloud",
        "devops",
        "python",
        "java",
        "go",
        "rust",
        "tailwind",
        "clean architecture"
    ];

    public async Task<AiAnalysisDto> AnalyzeApplicationAsync(Guid applicationId, CancellationToken cancellationToken = default)
    {
        EnsureEnabled();

        var userId = currentUser.RequireUserId();

        var application = await db.JobApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId && a.UserId == userId, cancellationToken)
            ?? throw NotFoundException.For("Bewerbung", applicationId);

        var requiredSkills = ExtractSkills(application.JobDescription ?? string.Empty)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var matchedSkills = requiredSkills
            .Where(skill => application.Technologies.Any(t => string.Equals(t, skill, StringComparison.OrdinalIgnoreCase)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var missingSkills = requiredSkills
            .Except(matchedSkills, StringComparer.OrdinalIgnoreCase)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var matchScore = requiredSkills.Count == 0
            ? 60
            : (int)Math.Clamp((double)matchedSkills.Count / requiredSkills.Count * 100, 0, 100);

        var summary = BuildSummary(application, matchedSkills, missingSkills);

        var analysis = new AiAnalysis
        {
            UserId = userId,
            JobApplicationId = application.Id,
            JobDescription = application.JobDescription ?? string.Empty,
            MatchScore = matchScore,
            Summary = summary,
            RequiredSkills = requiredSkills,
            MatchedSkills = matchedSkills,
            MissingSkills = missingSkills,
            Recommendations = missingSkills.Count == 0
                ? ["Du deckst die wichtigsten Anforderungen bereits gut ab. Halte die Bewerbung mit konkreten Projektergebnissen und Kennzahlen noch praxistauglich."]
                : [.. missingSkills.Select(skill => $"Baue in deinem Profil oder in einem Praxisprojekt mehr Erfahrung mit {skill} ein.")],
            SuggestedLearningTopics = missingSkills.Count == 0
                ? ["Vertiefe deine Expertise in den Kerntechnologien weiter, damit du im nächsten Schritt noch gezielter überzeugen kannst."]
                : [.. missingSkills.Select(skill => $"Lerne {skill} gezielt in einem kleinen Praxisprojekt oder anhand eines Projekts mit realem Use Case.")],
            Provider = _aiOptions.Provider,
            Model = _aiOptions.Model,
            JobApplication = application
        };

        db.AiAnalyses.Add(analysis);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "KI-Analyse fuer Bewerbung {ApplicationId} mit MatchScore {MatchScore} erstellt.",
            application.Id,
            matchScore);

        return new AiAnalysisDto(
            analysis.Id,
            analysis.JobApplicationId ?? application.Id,
            analysis.MatchScore,
            analysis.Summary ?? summary,
            analysis.RequiredSkills,
            analysis.MatchedSkills,
            analysis.MissingSkills,
            analysis.Recommendations,
            analysis.SuggestedLearningTopics,
            analysis.Provider,
            analysis.Model,
            analysis.CreatedAt);
    }

    public async Task<GeneratedCoverLetterDto> GenerateCoverLetterAsync(
        Guid applicationId,
        GenerateCoverLetterRequest request,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();

        var userId = currentUser.RequireUserId();

        var application = await db.JobApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId && a.UserId == userId, cancellationToken)
            ?? throw NotFoundException.For("Bewerbung", applicationId);

        var content = BuildCoverLetter(application, request);

        var letter = new GeneratedCoverLetter
        {
            UserId = userId,
            JobApplicationId = application.Id,
            Title = request.Title,
            Content = content,
            CompanyName = application.CompanyName,
            JobTitle = application.JobTitle,
            Style = request.Style,
            IsDraft = request.IsDraft,
            Provider = _aiOptions.Provider,
            Model = _aiOptions.Model,
            JobApplication = application
        };

        db.GeneratedCoverLetters.Add(letter);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Anschreiben {CoverLetterId} fuer Bewerbung {ApplicationId} erstellt.",
            letter.Id,
            application.Id);

        return new GeneratedCoverLetterDto(
            letter.Id,
            letter.JobApplicationId ?? application.Id,
            letter.Title,
            letter.Content,
            letter.CompanyName,
            letter.JobTitle,
            letter.Style,
            letter.IsDraft,
            letter.Provider,
            letter.Model,
            letter.CreatedAt);
    }

    private static string BuildSummary(JobApplication application, IReadOnlyCollection<string> matchedSkills, IReadOnlyCollection<string> missingSkills)
    {
        var topMatches = matchedSkills.Count == 0 ? "keine klaren Überlappungen" : string.Join(", ", matchedSkills.Take(3));
        var missingText = missingSkills.Count == 0 ? "keine signifikanten Lücken" : string.Join(", ", missingSkills.Take(3));

        return $"Für {application.JobTitle} bei {application.CompanyName} passen {topMatches} gut zum Profil. Die wichtigsten Lücken liegen in {missingText}.";
    }

    private static string BuildCoverLetter(JobApplication application, GenerateCoverLetterRequest request)
    {
        var tone = request.Style switch
        {
            WritingStyle.Formal => "formell und klar",
            WritingStyle.Modern => "modern und motiviert",
            WritingStyle.Concise => "konkret und zielgerichtet",
            WritingStyle.Enthusiastic => "begeistert und überzeugend",
            _ => "professionell und überzeugend"
        };

        var skills = application.Technologies.Count == 0
            ? "deine technische Kompetenz"
            : string.Join(", ", application.Technologies.Take(5));

        return $"Sehr geehrte Damen und Herren,\n\n" +
               $"ich bewerbe mich sehr gerne für die Position {application.JobTitle} bei {application.CompanyName}. " +
               $"Ich freue mich über die Möglichkeit, meine Erfahrungen in {skills} in einem {tone} Umfeld einzubringen. " +
               $"Insbesondere meine Fähigkeit, mit klaren Prozessen, verlässlicher Umsetzung und Fokus auf Ergebnisse zu arbeiten, passt gut zu Ihrer Stellenbeschreibung.\n\n" +
               $"Ich möchte zu Ihrer Organisation beitragen, indem ich meine fachliche Expertise, meine Lernbereitschaft und mein Engagement für qualitativ hochwertige Ergebnisse einbringe. " +
               $"Gerade im Bereich der Bewerbungs- und Projektarbeit sehe ich die Möglichkeit, mit meinem Hintergrund einen echten Mehrwert zu schaffen.\n\n" +
               $"Ich freue mich auf die Gelegenheit, meine Bewerbung persönlich zu besprechen und zu zeigen, wie ich zu Ihrem Team beitragen kann.\n\n" +
               $"Mit freundlichen Grüßen\n" +
               $"[Ihr Name]";
    }

    private static List<string> ExtractSkills(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return [];
        }

        var normalized = text.ToLowerInvariant();
        var matches = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var skill in KnownSkills)
        {
            if (normalized.Contains(skill, StringComparison.OrdinalIgnoreCase))
            {
                matches.Add(skill);
            }
        }

        foreach (var token in normalized
                     .Replace("-", " ")
                     .Replace("/", " ")
                     .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (token.Length > 3 && token.Length < 25 && char.IsLetter(token[0]))
            {
                matches.Add(token);
            }
        }

        return matches
            .OrderBy(skill => skill)
            .ToList();
    }

    private void EnsureEnabled()
    {
        if (!_aiOptions.Enabled)
        {
            throw new ValidationFailedException("Ai", "Die KI-Funktionen sind derzeit deaktiviert.");
        }
    }
}
