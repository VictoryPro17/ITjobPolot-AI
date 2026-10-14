using JobPilot.Application.Abstractions;
using JobPilot.Application.Ai;
using JobPilot.Application.Common;
using JobPilot.Application.Matching;
using JobPilot.Domain.Entities;
using JobPilot.Domain.Enums;
using JobPilot.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JobPilot.Infrastructure.Services;

/// <summary>
/// Stellenanalyse und Anschreiben. Der eigentliche Abgleich laeuft ueber
/// <see cref="IJobMatchAnalyzer"/>, sodass ein externer KI-Anbieter spaeter
/// ohne Aenderung an dieser Klasse eingesetzt werden kann.
/// </summary>
public class AiService(
    JobPilotDbContext db,
    ICurrentUser currentUser,
    IJobMatchAnalyzer matchAnalyzer,
    ILogger<AiService> logger) : IAiService
{
    private const string CoverLetterProvider = "local";
    private const string CoverLetterModel = "template-v1";

    public async Task<AiAnalysisDto> AnalyzeApplicationAsync(Guid applicationId, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var application = await db.JobApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId && a.UserId == userId, cancellationToken)
            ?? throw NotFoundException.For("Bewerbung", applicationId);

        var profileUser = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        var input = new JobMatchInput(
            application.JobTitle,
            application.CompanyName,
            application.JobDescription,
            application.Technologies,
            profileUser?.TargetJobTitle,
            profileUser?.Skills ?? [],
            profileUser?.ProfileSummary,
            profileUser?.ExperienceSummary,
            profileUser?.EducationSummary,
            profileUser?.ResumeText,
            string.IsNullOrWhiteSpace(profileUser?.FirstName) && string.IsNullOrWhiteSpace(profileUser?.LastName)
                ? null
                : profileUser!.DisplayName);

        var result = await matchAnalyzer.AnalyzeAsync(input, cancellationToken);

        var analysis = new AiAnalysis
        {
            UserId = userId,
            JobApplicationId = application.Id,
            JobDescription = application.JobDescription ?? string.Empty,
            MatchScore = result.MatchScore,
            Summary = result.Summary,
            RequiredSkills = [.. result.RequiredSkills],
            MatchedSkills = [.. result.MatchedSkills],
            MissingSkills = [.. result.MissingSkills],
            Recommendations = [.. result.Recommendations],
            SuggestedLearningTopics = [.. result.SuggestedLearningTopics],
            Provider = result.Provider,
            Model = result.Model,
            JobApplication = application
        };

        db.AiAnalyses.Add(analysis);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "KI-Analyse fuer Bewerbung {ApplicationId} mit MatchScore {MatchScore} erstellt.",
            application.Id,
            result.MatchScore);

        return new AiAnalysisDto(
            analysis.Id,
            analysis.JobApplicationId ?? application.Id,
            analysis.MatchScore,
            analysis.Summary ?? result.Summary,
            analysis.RequiredSkills,
            analysis.MatchedSkills,
            analysis.MissingSkills,
            analysis.Recommendations,
            analysis.SuggestedLearningTopics,
            analysis.Provider,
            analysis.Model,
            analysis.CreatedAt,
            result.Factors,
            result.ProfileHints);
    }

    public async Task<GeneratedCoverLetterDto> GenerateCoverLetterAsync(
        Guid applicationId,
        GenerateCoverLetterRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var application = await db.JobApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId && a.UserId == userId, cancellationToken)
            ?? throw NotFoundException.For("Bewerbung", applicationId);

        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        var content = BuildCoverLetter(application, request, user);

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
            Provider = CoverLetterProvider,
            Model = CoverLetterModel,
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

    private static string BuildCoverLetter(JobApplication application, GenerateCoverLetterRequest request, ApplicationUser? user)
    {
        var tone = request.Style switch
        {
            WritingStyle.Formal => "formell und klar",
            WritingStyle.Modern => "modern und motiviert",
            WritingStyle.Concise => "konkret und zielgerichtet",
            WritingStyle.Enthusiastic => "begeistert und überzeugend",
            _ => "professionell und überzeugend"
        };

        var skillList = application.Technologies.Count > 0
            ? application.Technologies.Take(5).ToList()
            : GetProfileSkillsMentionedInJob(application, user);

        var skills = skillList.Count == 0
            ? "deine technische Kompetenz"
            : string.Join(", ", skillList);

        var signature = user?.DisplayName ?? "[Ihr Name]";

        return $"Sehr geehrte Damen und Herren,\n\n" +
               $"ich bewerbe mich sehr gerne für die Position {application.JobTitle} bei {application.CompanyName}. " +
               $"Ich freue mich über die Möglichkeit, meine Erfahrungen in {skills} in einem {tone} Umfeld einzubringen. " +
               $"Insbesondere meine Fähigkeit, mit klaren Prozessen, verlässlicher Umsetzung und Fokus auf Ergebnisse zu arbeiten, passt gut zu Ihrer Stellenbeschreibung.\n\n" +
               $"Ich möchte zu Ihrer Organisation beitragen, indem ich meine fachliche Expertise, meine Lernbereitschaft und mein Engagement für qualitativ hochwertige Ergebnisse einbringe. " +
               $"Gerade im Bereich der Bewerbungs- und Projektarbeit sehe ich die Möglichkeit, mit meinem Hintergrund einen echten Mehrwert zu schaffen.\n\n" +
               $"Ich freue mich auf die Gelegenheit, meine Bewerbung persönlich zu besprechen und zu zeigen, wie ich zu Ihrem Team beitragen kann.\n\n" +
               $"Mit freundlichen Grüßen\n" +
               signature;
    }

    private static List<string> GetProfileSkillsMentionedInJob(JobApplication application, ApplicationUser? user)
    {
        if (user is null)
        {
            return [];
        }

        var jobSkills = SkillCatalog.Extract(application.JobDescription);
        var profileSkills = user.Skills.Select(SkillCatalog.Canonicalize).ToHashSet(StringComparer.OrdinalIgnoreCase);

        return [.. jobSkills.Where(profileSkills.Contains).Take(5)];
    }
}
