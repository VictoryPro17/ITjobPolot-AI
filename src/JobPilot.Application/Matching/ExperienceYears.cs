using System.Globalization;
using System.Text.RegularExpressions;

namespace JobPilot.Application.Matching;

/// <summary>Ermittelt Berufserfahrung in Jahren aus Freitext.</summary>
public static class ExperienceYears
{
    private static readonly Regex StatedPattern = new(
        @"(\d{1,2})\s*\+?\s*(jahre|jahren|years|yrs)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex RangePattern = new(
        @"((?:19|20)\d{2})\s*[-–]\s*((?:19|20)\d{2}|heute|today|present|now|aktuell|jetzt)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>Explizite Angaben wie "5+ Jahre" oder "3 years".</summary>
    public static int? ExtractStated(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var values = StatedPattern.Matches(text)
            .Select(match => int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture))
            .Where(value => value is >= 1 and <= 50)
            .ToList();

        return values.Count == 0 ? null : values.Max();
    }

    /// <summary>Zeitspanne aus Jahresbereichen wie "2018 – heute".</summary>
    public static int? ExtractFromRanges(string? text, int currentYear)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var ranges = RangePattern.Matches(text)
            .Select(match => (
                Start: int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture),
                End: int.TryParse(match.Groups[2].Value, out var end) ? end : currentYear))
            .ToList();

        if (ranges.Count == 0)
        {
            return null;
        }

        return Math.Clamp(ranges.Max(r => r.End) - ranges.Min(r => r.Start), 0, 50);
    }

    /// <summary>Kandidatenerfahrung: explizite Angaben vor Jahresbereichen, Profil vor Lebenslauf.</summary>
    public static int? ExtractCandidateYears(string? experienceText, string? resumeText, int currentYear) =>
        ExtractStated(experienceText)
        ?? ExtractStated(resumeText)
        ?? ExtractFromRanges(experienceText, currentYear)
        ?? ExtractFromRanges(resumeText, currentYear);
}
