using System.Text.RegularExpressions;

namespace JobPilot.Infrastructure.Ai;

/// <summary>
/// Bereinigt Empfehlungen und Lernthemen eines Sprachmodells: entfernt Fuellfloskeln, verwirft
/// Saetze mit Wortwiederholungen und Fast-Duplikate und sorgt fuer Themenvielfalt
/// (hoechstens <see cref="MaxPerSkill"/> Eintraege je Skill). Deterministisch und ohne KI.
/// </summary>
internal static partial class RecommendationCleaner
{
    public const int MaxItems = 5;
    public const int MaxPerSkill = 2;

    /// <summary>Ab diesem Anteil gemeinsamer Inhaltswoerter gelten zwei Saetze als Duplikat.</summary>
    private const double DuplicateThreshold = 0.5;

    private const int MinLength = 12;

    // Allgemeine Zwecksaetze am Ende ohne eigenen Inhalt, z. B. ", um deine Fähigkeiten zu erweitern".
    [GeneratedRegex(
        @",?\s*um\s+(dich|deine?n?|die|das)\b[^,.;]{0,60}?\s+(zu\s+)?(erweitern|vertiefen|verbessern|stärken|ausbauen|erhöhen|steigern|festigen|weiterzuentwickeln|weiterentwickeln|vorzubereiten|vorbereiten|zu\s+verbessern)\s*[.!]?\s*$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex FillerTail();

    // "Azure-Tools und -Tools", "Tools und Tools" oder "die die": Wiederholung desselben Wortes.
    [GeneratedRegex(@"\b(\p{L}{3,})\s+(und|oder|sowie)\s+-?\1\b|\b(\p{L}+)\s+\3\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex RepeatedWord();

    [GeneratedRegex(@"[\p{L}\p{N}#+]+")]
    private static partial Regex Word();

    [GeneratedRegex(@"\s{2,}")]
    private static partial Regex Whitespace();

    // Woerter ohne Bedeutung fuer den Duplikatvergleich.
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "du", "dich", "dir", "dein", "deine", "deinen", "deinem", "deiner", "der", "die", "das", "den", "dem", "des",
        "ein", "eine", "einen", "einem", "einer", "und", "oder", "sowie", "mit", "zu", "zum", "zur", "in", "im", "um",
        "für", "auf", "an", "am", "von", "vom", "bei", "über", "deren", "dessen", "es", "sich", "noch", "auch",
        "solltest", "könntest", "kannst", "sollst", "sollte", "könnte", "kann", "wirst", "machen", "betracht", "ziehen",
        "vertraut", "auseinandersetzen", "beschäftigen", "dabei", "diesem", "dieser", "diese", "bereich", "mehr",
        "fähigkeiten", "kenntnisse", "wissen", "erweitern", "vertiefen", "verbessern",
    };

    /// <summary>
    /// Bereinigt <paramref name="items"/> und fuellt bei Bedarf mit <paramref name="fallback"/> auf,
    /// bis mindestens <paramref name="minItems"/> Eintraege vorliegen.
    /// </summary>
    public static List<string> Clean(
        IEnumerable<string?>? items,
        IReadOnlyCollection<string> skills,
        IEnumerable<string>? fallback = null,
        int maxItems = MaxItems,
        int minItems = 2,
        bool sentences = true)
    {
        var result = new List<string>();
        // Je Eintrag: Inhaltswoerter (ohne Skill-Namen) und die erwaehnten Skills.
        var kept = new List<(HashSet<string> Words, string SkillKey)>();
        var perSkill = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        void Consider(string? raw)
        {
            if (result.Count >= maxItems)
            {
                return;
            }

            var text = Normalize(raw, sentences);
            if (text is null || RepeatedWord().IsMatch(text))
            {
                return;
            }

            var mentioned = skills.Where(skill => MentionsSkill(text, skill)).ToList();
            var skillKey = string.Join("|", mentioned.Select(skill => skill.ToLowerInvariant()).Order());
            var words = ContentWords(RemoveSkills(text, mentioned));

            // Duplikat nur unter Saetzen zu denselben Skills: "Lerne Docker" und "Lerne Kubernetes" bleiben beide.
            if (kept.Any(other => other.SkillKey == skillKey && Similarity(words, other.Words) >= DuplicateThreshold))
            {
                return;
            }

            if (mentioned.Count > 0 && mentioned.All(skill => perSkill.GetValueOrDefault(skill) >= MaxPerSkill))
            {
                return;
            }

            result.Add(text);
            kept.Add((words, skillKey));
            foreach (var skill in mentioned)
            {
                perSkill[skill] = perSkill.GetValueOrDefault(skill) + 1;
            }
        }

        foreach (var item in items ?? [])
        {
            Consider(item);
        }

        if (result.Count < minItems)
        {
            foreach (var item in fallback ?? [])
            {
                Consider(item);
            }
        }

        return result;
    }

    /// <summary>
    /// Trimmt, entfernt Fuellfloskeln am Satzende und schliesst Saetze mit Punkt ab.
    /// Stichworte (<paramref name="sentence"/> = false) bleiben ohne Schlusspunkt.
    /// </summary>
    internal static string? Normalize(string? raw, bool sentence = true)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var text = Whitespace().Replace(raw.Trim(), " ");
        text = FillerTail().Replace(text, string.Empty).TrimEnd(' ', ',', ';');

        if (!sentence)
        {
            text = text.TrimEnd('.', ' ');
            return text.Length < 2 ? null : char.ToUpperInvariant(text[0]) + text[1..];
        }

        if (text.Length < MinLength)
        {
            return null;
        }

        if (!text.EndsWith('.') && !text.EndsWith('!') && !text.EndsWith('?'))
        {
            text += ".";
        }

        return char.ToUpperInvariant(text[0]) + text[1..];
    }

    private static string RemoveSkills(string text, IEnumerable<string> skills) =>
        skills.Aggregate(text, (current, skill) => SkillPattern(skill).Replace(current, " "));

    private static HashSet<string> ContentWords(string text) =>
        Word().Matches(text)
            .Select(match => match.Value.ToLowerInvariant())
            .Where(word => word.Length > 1 && !StopWords.Contains(word))
            .ToHashSet();

    /// <summary>Anteil gemeinsamer Inhaltswoerter, bezogen auf den kuerzeren Satz.</summary>
    private static double Similarity(HashSet<string> first, HashSet<string> second)
    {
        var smaller = Math.Min(first.Count, second.Count);
        return smaller == 0 ? 0 : (double)first.Count(second.Contains) / smaller;
    }

    /// <summary>Erwaehnt der Text den Skill als eigenes Wort ("Azure-Dienste" ja, "Googleplay" nicht fuer "Go")?</summary>
    internal static bool MentionsSkill(string text, string skill) =>
        !string.IsNullOrWhiteSpace(skill) && SkillPattern(skill).IsMatch(text);

    private static Regex SkillPattern(string skill) =>
        new($@"(?<![\p{{L}}\p{{N}}]){Regex.Escape(skill.Trim())}(?![\p{{L}}\p{{N}}#+])", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
}
