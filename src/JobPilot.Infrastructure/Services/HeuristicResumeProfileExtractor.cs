using System.Text.RegularExpressions;

using JobPilot.Application.Abstractions;
using JobPilot.Application.Matching;
using JobPilot.Application.Profile;

namespace JobPilot.Infrastructure.Services;

/// <summary>
/// Regelbasierte Lebenslauf-Extraktion ohne externe KI. Erkennt Name, Wunschposition,
/// Ort, typische Abschnitte und bekannte Technologien anhand der Zeilenstruktur.
/// </summary>
public class HeuristicResumeProfileExtractor : IResumeProfileExtractor
{
    private const int SummaryMaxLength = 2000;
    private const int ShortFieldMaxLength = 150;
    private const int ResumeMaxLength = 100_000;

    private enum Section { None, Summary, Experience, Education, Skills, Other }

    private static readonly (Section Section, Regex Pattern)[] Headings =
    [
        (Section.Summary, new Regex(@"^(profil|kurzprofil|zusammenfassung|summary|profile|about me|über mich)$", RegexOptions.IgnoreCase)),
        (Section.Experience, new Regex(@"^(berufserfahrung|erfahrung|experience|work experience|beruflicher werdegang|werdegang|employment|berufliche stationen)$", RegexOptions.IgnoreCase)),
        (Section.Education, new Regex(@"^(ausbildung|bildung|bildungsweg|education|studium|schulbildung|weiterbildung|zertifikate|certifications)$", RegexOptions.IgnoreCase)),
        (Section.Skills, new Regex(@"^(skills|kenntnisse|fähigkeiten|technologien|tech stack|it-kenntnisse|kompetenzen)$", RegexOptions.IgnoreCase)),
        (Section.Other, new Regex(@"^(sprachen|languages|projekte|projects|interessen|hobbys|referenzen)$", RegexOptions.IgnoreCase))
    ];

    private static readonly Regex ContactPrefix = new(
        @"^(telefon|tel|phone|e-mail|email|linkedin|github|xing|portfolio)", RegexOptions.IgnoreCase);

    private static readonly Regex PhoneLike = new(@"\d(?:[\s+/\-]*\d){5,}");

    private static readonly Regex NameWord = new(@"^[A-ZÄÖÜ][\p{L}\-']*$");

    private static readonly Regex JobTitlePattern = new(
        @"developer|entwickler|engineer|ingenieur|architect|architekt|consultant|berater|analyst|specialist|manager|lead|designer|administrator",
        RegexOptions.IgnoreCase);

    private static readonly Regex LocationLabel = new(
        @"^(wohnort|standort|location|adresse|ort)\s*:\s*(.+)$", RegexOptions.IgnoreCase);

    private static readonly Regex PostalCity = new(
        @"\b\d{5}\s+([A-ZÄÖÜ][\p{L}\-]+(?:\s[A-ZÄÖÜ][\p{L}\-]+)?)");

    public Task<ResumeProfileSuggestion> ExtractAsync(string resumeText, CancellationToken cancellationToken = default)
    {
        var text = resumeText.Length > ResumeMaxLength ? resumeText[..ResumeMaxLength] : resumeText;

        var lines = text
            .Split('\n')
            .Select(line => line.Trim())
            .Where(line => line.Length > 0)
            .ToList();

        var sections = ReadSections(lines);

        var nameLine = lines
            .Take(5)
            .FirstOrDefault(line => GetHeading(line) is null && !IsContactLine(line) && IsNameLine(line));

        string? firstName = null;
        string? lastName = null;
        if (nameLine is not null)
        {
            var words = nameLine.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            lastName = words[^1];
            firstName = string.Join(' ', words[..^1]);
        }

        var targetJobTitle = lines
            .Take(12)
            .FirstOrDefault(line =>
                line != nameLine &&
                GetHeading(line) is null &&
                !IsContactLine(line) &&
                line.Length <= ShortFieldMaxLength &&
                JobTitlePattern.IsMatch(line));

        var suggestion = new ResumeProfileSuggestion(
            text,
            firstName,
            lastName,
            targetJobTitle,
            FindLocation(lines),
            JoinSection(sections, Section.Summary, " "),
            JoinSection(sections, Section.Experience, "\n"),
            JoinSection(sections, Section.Education, "\n"),
            SkillCatalog.Extract(text));

        return Task.FromResult(suggestion);
    }

    private static Dictionary<Section, List<string>> ReadSections(IEnumerable<string> lines)
    {
        var sections = new Dictionary<Section, List<string>>();
        var current = Section.None;

        foreach (var line in lines)
        {
            var heading = GetHeading(line);
            if (heading is not null)
            {
                current = heading.Value;
                continue;
            }

            if (current is Section.None or Section.Other)
            {
                continue;
            }

            if (!sections.TryGetValue(current, out var content))
            {
                content = [];
                sections[current] = content;
            }

            content.Add(line);
        }

        return sections;
    }

    private static Section? GetHeading(string line)
    {
        if (line.Length > 40)
        {
            return null;
        }

        var candidate = line.Replace(":", string.Empty).Trim();

        foreach (var (section, pattern) in Headings)
        {
            if (pattern.IsMatch(candidate))
            {
                return section;
            }
        }

        return null;
    }

    private static bool IsContactLine(string line) =>
        line.Contains('@') ||
        line.Contains("http", StringComparison.OrdinalIgnoreCase) ||
        PhoneLike.IsMatch(line) ||
        ContactPrefix.IsMatch(line);

    private static bool IsNameLine(string line)
    {
        if (line.Length > 60 || line.Any(char.IsDigit))
        {
            return false;
        }

        var words = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return words.Length is >= 2 and <= 4 && words.All(word => NameWord.IsMatch(word));
    }

    private static string? FindLocation(IEnumerable<string> lines)
    {
        string? fromPostalCode = null;

        foreach (var line in lines)
        {
            var label = LocationLabel.Match(line);
            if (label.Success)
            {
                return TruncateShort(label.Groups[2].Value.Trim());
            }

            if (fromPostalCode is null)
            {
                var postal = PostalCity.Match(line);
                if (postal.Success)
                {
                    fromPostalCode = postal.Groups[1].Value.Trim();
                }
            }
        }

        return fromPostalCode is null ? null : TruncateShort(fromPostalCode);
    }

    private static string? JoinSection(Dictionary<Section, List<string>> sections, Section section, string separator) =>
        sections.TryGetValue(section, out var content) && content.Count > 0
            ? Truncate(string.Join(separator, content), SummaryMaxLength)
            : null;

    private static string TruncateShort(string value) =>
        value.Length <= ShortFieldMaxLength ? value : value[..ShortFieldMaxLength].TrimEnd();

    internal static string Truncate(string value, int maxLength)
    {
        if (value.Length <= maxLength)
        {
            return value;
        }

        var cut = value[..(maxLength - 1)];
        var lastSpace = cut.LastIndexOfAny([' ', '\n']);
        if (lastSpace > 0)
        {
            cut = cut[..lastSpace];
        }

        return cut.TrimEnd() + "…";
    }
}
