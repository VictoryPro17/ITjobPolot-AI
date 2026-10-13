using System.Text.RegularExpressions;

using JobPilot.Application.Abstractions;
using JobPilot.Application.Ai;
using JobPilot.Application.Matching;

namespace JobPilot.Infrastructure.Services;

/// <summary>
/// Regelbasierter Abgleich zwischen Stelle und Kandidat. Der Score setzt sich aus
/// gewichteten Faktoren zusammen; Faktoren ohne ausreichende Daten werden nicht gewertet.
/// </summary>
public class HeuristicJobMatchAnalyzer(TimeProvider timeProvider) : IJobMatchAnalyzer
{
    public const string ProviderName = "local";
    public const string ModelName = "heuristic-v1";

    private const int SkillsWeight = 70;
    private const int ExperienceWeight = 15;
    private const int PositionWeight = 15;

    private static readonly HashSet<string> TitleStopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "m", "w", "d", "f", "x", "und", "and", "in", "für", "for", "the", "der", "die", "das", "mit", "with"
    };

    public Task<JobMatchResult> AnalyzeAsync(JobMatchInput input, CancellationToken cancellationToken = default)
    {
        var requiredSkills = SkillCatalog.Extract(input.JobDescription)
            .Concat(input.JobTechnologies.Where(t => !string.IsNullOrWhiteSpace(t)).Select(SkillCatalog.Canonicalize))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var profileText = string.Join("\n", new[]
        {
            input.ProfileSummary,
            input.ExperienceSummary,
            input.EducationSummary,
            input.ResumeText
        }.Where(value => !string.IsNullOrWhiteSpace(value)));

        var candidateSkills = input.ProfileSkills
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(SkillCatalog.Canonicalize)
            .Concat(SkillCatalog.Extract(profileText))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var matchedSkills = requiredSkills.Where(candidateSkills.Contains).ToList();
        var missingSkills = requiredSkills.Where(skill => !candidateSkills.Contains(skill)).ToList();

        var factors = new List<MatchFactorDto>();

        if (requiredSkills.Count > 0)
        {
            factors.Add(new MatchFactorDto(
                "skills",
                "Technologien",
                (int)Math.Round((double)matchedSkills.Count / requiredSkills.Count * 100),
                SkillsWeight,
                $"{matchedSkills.Count} von {requiredSkills.Count} geforderten Technologien sind in deinem Profil oder Lebenslauf belegt."));
        }

        var requiredYears = ExperienceYears.ExtractStated(input.JobDescription);
        int? candidateYears = null;
        MatchFactorDto? experienceFactor = null;
        if (requiredYears is not null)
        {
            candidateYears = ExperienceYears.ExtractCandidateYears(
                input.ExperienceSummary, input.ResumeText, timeProvider.GetUtcNow().Year);

            experienceFactor = candidateYears is null
                ? new MatchFactorDto(
                    "experience",
                    "Berufserfahrung",
                    50,
                    ExperienceWeight,
                    $"Gefordert sind {requiredYears} Jahre; aus deinem Profil ließ sich keine Berufserfahrung ermitteln.")
                : new MatchFactorDto(
                    "experience",
                    "Berufserfahrung",
                    Math.Min(100, (int)Math.Round((double)candidateYears.Value / requiredYears.Value * 100)),
                    ExperienceWeight,
                    $"Gefordert: {requiredYears} Jahre, erkannt: {candidateYears} Jahre.");

            factors.Add(experienceFactor);
        }

        if (!string.IsNullOrWhiteSpace(input.TargetJobTitle))
        {
            var jobTokens = TokenizeTitle(input.JobTitle);
            var targetTokens = TokenizeTitle(input.TargetJobTitle).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var overlap = jobTokens.Count == 0
                ? 0
                : (int)Math.Round((double)jobTokens.Count(targetTokens.Contains) / jobTokens.Count * 100);

            factors.Add(new MatchFactorDto(
                "position",
                "Wunschposition",
                overlap,
                PositionWeight,
                $"Deine Wunschposition „{input.TargetJobTitle.Trim()}“ überschneidet sich zu {overlap} % mit „{input.JobTitle}“."));
        }

        var totalWeight = factors.Sum(f => f.Weight);
        var matchScore = totalWeight == 0
            ? 0
            : Math.Clamp((int)Math.Round((double)factors.Sum(f => f.Score * f.Weight) / totalWeight), 0, 100);

        var profileHints = new List<string>();
        if (!input.ProfileSkills.Any(s => !string.IsNullOrWhiteSpace(s)))
        {
            profileHints.Add("Hinterlege Skills in deinem Profil, damit der Abgleich genauer wird.");
        }

        if (string.IsNullOrWhiteSpace(input.ResumeText))
        {
            profileHints.Add("Lade deinen Lebenslauf hoch, um Erfahrung und Technologien automatisch zu berücksichtigen.");
        }

        if (string.IsNullOrWhiteSpace(input.TargetJobTitle))
        {
            profileHints.Add("Gib eine Wunschposition an, um die Passung zur Stelle zu bewerten.");
        }

        if (requiredSkills.Count == 0)
        {
            profileHints.Add("In der Stellenbeschreibung wurden keine konkreten Technologien erkannt. Ergänze die Beschreibung oder die Technologien der Bewerbung.");
        }

        var recommendations = missingSkills
            .Take(5)
            .Select(skill => $"Baue in deinem Profil oder in einem Praxisprojekt mehr Erfahrung mit {skill} ein.")
            .ToList();

        var hasExperienceGap = experienceFactor is not null && candidateYears is not null && experienceFactor.Score < 100;
        if (hasExperienceGap)
        {
            recommendations.Add($"Hebe konkrete Projekte und Verantwortung hervor, um die geforderten {requiredYears} Jahre Erfahrung zu untermauern.");
        }

        if (recommendations.Count == 0)
        {
            recommendations.Add("Du deckst die wichtigsten Anforderungen bereits gut ab. Halte die Bewerbung mit konkreten Projektergebnissen und Kennzahlen noch praxistauglich.");
        }

        IReadOnlyList<string> learningTopics = missingSkills.Count == 0
            ? ["Vertiefe deine Expertise in den Kerntechnologien weiter, damit du im nächsten Schritt noch gezielter überzeugen kannst."]
            : [.. missingSkills
                .Take(5)
                .Select(skill => $"Lerne {skill} gezielt in einem kleinen Praxisprojekt oder anhand eines Projekts mit realem Use Case.")];

        var result = new JobMatchResult(
            matchScore,
            BuildSummary(input, requiredSkills, matchedSkills, missingSkills),
            requiredSkills,
            matchedSkills,
            missingSkills,
            recommendations,
            learningTopics,
            factors,
            profileHints,
            ProviderName,
            ModelName);

        return Task.FromResult(result);
    }

    private static string BuildSummary(
        JobMatchInput input,
        IReadOnlyCollection<string> requiredSkills,
        IReadOnlyCollection<string> matchedSkills,
        IReadOnlyCollection<string> missingSkills)
    {
        if (requiredSkills.Count == 0)
        {
            return $"Für {input.JobTitle} bei {input.CompanyName} konnten keine konkreten Technologien abgeglichen werden.";
        }

        var topMatches = matchedSkills.Count == 0 ? "keine" : string.Join(", ", matchedSkills.Take(3));
        var topGaps = missingSkills.Count == 0 ? "keine" : string.Join(", ", missingSkills.Take(3));

        return $"Für {input.JobTitle} bei {input.CompanyName} deckst du {matchedSkills.Count} von {requiredSkills.Count} geforderten Technologien ab ({topMatches}). Größte Lücken: {topGaps}.";
    }

    private static List<string> TokenizeTitle(string? title) =>
        string.IsNullOrWhiteSpace(title)
            ? []
            : [.. Regex.Split(title.ToLowerInvariant(), @"[^\p{L}\p{N}#+.]+")
                .Where(token => token.Length >= 2 && !TitleStopWords.Contains(token))
                .Distinct()];
}
