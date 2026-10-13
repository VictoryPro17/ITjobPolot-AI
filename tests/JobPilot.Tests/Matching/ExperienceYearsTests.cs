using JobPilot.Application.Matching;

namespace JobPilot.Tests.Matching;

public class ExperienceYearsTests
{
    [Fact]
    public void ExtractStated_ReadsPlusNotation()
    {
        Assert.Equal(5, ExperienceYears.ExtractStated("Sie bringen mindestens 5+ Jahre Erfahrung mit."));
    }

    [Fact]
    public void ExtractFromRanges_TreatsHeuteAsCurrentYear()
    {
        Assert.Equal(8, ExperienceYears.ExtractFromRanges("Softwareentwickler, 2018 – heute", 2026));
    }

    [Fact]
    public void ExtractCandidateYears_ReturnsNullWithoutHints()
    {
        Assert.Null(ExperienceYears.ExtractCandidateYears("Teamplayer", "Ohne Zeitangaben", 2026));
    }
}
