using JobPilot.Infrastructure.Services;

namespace JobPilot.Tests.Infrastructure;

public class HeuristicResumeProfileExtractorTests
{
    private const string SampleResume = """
        Max Mustermann
        Senior Softwareentwickler .NET
        Musterstraße 1, 10115 Berlin
        max.mustermann@example.com
        +49 170 1234567

        Profil
        Erfahrener Backend-Entwickler mit Fokus auf C# und Azure.

        Berufserfahrung
        2019 – heute: Senior Developer bei Contoso GmbH
        2016 – 2019: Developer bei Fabrikam AG

        Ausbildung
        B.Sc. Informatik, TU Berlin

        Kenntnisse
        C#, ASP.NET Core, Azure, React, PostgreSQL, Docker
        """;

    [Fact]
    public async Task ExtractAsync_RecognizesGermanResumeStructure()
    {
        var extractor = new HeuristicResumeProfileExtractor();

        var result = await extractor.ExtractAsync(SampleResume);

        Assert.Equal("Max", result.FirstName);
        Assert.Equal("Mustermann", result.LastName);
        Assert.Equal("Senior Softwareentwickler .NET", result.TargetJobTitle);
        Assert.Equal("Berlin", result.Location);
        Assert.Equal("Erfahrener Backend-Entwickler mit Fokus auf C# und Azure.", result.ProfileSummary);
        Assert.Equal("2019 – heute: Senior Developer bei Contoso GmbH\n2016 – 2019: Developer bei Fabrikam AG", result.ExperienceSummary);
        Assert.Equal("B.Sc. Informatik, TU Berlin", result.EducationSummary);
        Assert.Contains("ASP.NET Core", result.Skills);
        Assert.Contains("PostgreSQL", result.Skills);
    }

    [Fact]
    public async Task ExtractAsync_TruncatesLongSectionsTo2000Characters()
    {
        var longText = "Berufserfahrung\n" + string.Join(' ', Enumerable.Repeat("Projektarbeit", 400));
        var extractor = new HeuristicResumeProfileExtractor();

        var result = await extractor.ExtractAsync(longText);

        Assert.NotNull(result.ExperienceSummary);
        Assert.True(result.ExperienceSummary.Length <= 2000);
        Assert.EndsWith("…", result.ExperienceSummary);
    }

    [Fact]
    public async Task ExtractAsync_ReturnsNullSummariesWithoutHeadings()
    {
        var extractor = new HeuristicResumeProfileExtractor();

        var result = await extractor.ExtractAsync("Ein einzelner Absatz ohne erkennbare Abschnitte, aber mit C#.");

        Assert.Null(result.ProfileSummary);
        Assert.Null(result.ExperienceSummary);
        Assert.Null(result.EducationSummary);
        Assert.Equal(["C#"], result.Skills);
    }
}
