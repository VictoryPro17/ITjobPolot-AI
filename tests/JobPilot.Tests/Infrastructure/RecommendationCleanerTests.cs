using JobPilot.Infrastructure.Ai;

namespace JobPilot.Tests.Infrastructure;

public class RecommendationCleanerTests
{
    private static readonly string[] Skills = ["C#", "ASP.NET Core", "PostgreSQL", "Azure", "Docker"];

    [Fact]
    public void RealWorldAzureExample_IsReducedToTwoDistinctConcreteSteps()
    {
        // Tatsaechliche Ausgabe des lokalen Modells (qwen2.5:3b) zu einer Stelle mit fehlendem Azure.
        string[] input =
        [
            "Du solltest Lerneinheiten zu Azure in Betracht ziehen, um deine Fähigkeiten zu erweitern.",
            "Du könntest ein Praxisprojekt in Azure implementieren, um deine Kenntnisse zu vertiefen.",
            "Du solltest dich mit den Azure-Diensten und deren Verwendung in Azure-Szenarien auseinandersetzen.",
            "Du könntest dich mit Azure-Infrastruktur und -Verwaltung auseinandersetzen, um dich in diesem Bereich weiterzuentwickeln.",
            "Du solltest dich mit den Azure-Tools und -Tools vertraut machen, um dich in Azure-Projekten effektiver zu machen.",
        ];

        var result = RecommendationCleaner.Clean(input, Skills);

        Assert.Equal(
            [
                "Du solltest Lerneinheiten zu Azure in Betracht ziehen.",
                "Du könntest ein Praxisprojekt in Azure implementieren.",
            ],
            result);
    }

    [Theory]
    [InlineData("Mach dich mit den Azure-Tools und -Tools vertraut.")]
    [InlineData("Lerne die die Grundlagen von Docker.")]
    [InlineData("Übe Docker und Docker im Alltag.")]
    public void SentencesWithRepeatedWords_AreDropped(string sentence)
    {
        Assert.Empty(RecommendationCleaner.Clean([sentence], Skills, minItems: 0));
    }

    [Theory]
    [InlineData("Baue eine kleine API mit Docker, um deine Fähigkeiten zu erweitern.", "Baue eine kleine API mit Docker.")]
    [InlineData("Richte eine Pipeline ein, um dich in diesem Bereich weiterzuentwickeln.", "Richte eine Pipeline ein.")]
    [InlineData("  setze ein Projekt mit PostgreSQL um  ", "Setze ein Projekt mit PostgreSQL um.")]
    [InlineData("Lerne mehr über Azure, um dich besser für mögliche Azure-Projekte vorzubereiten.", "Lerne mehr über Azure.")]
    public void FillerTailsAreRemovedAndSentencesClosed(string input, string expected)
    {
        Assert.Equal([expected], RecommendationCleaner.Clean([input], Skills, minItems: 0));
    }

    [Fact]
    public void SameStepForDifferentSkills_IsKept()
    {
        var result = RecommendationCleaner.Clean(["Lerne die Grundlagen von Docker.", "Lerne die Grundlagen von Azure."], Skills);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void NearDuplicatesForTheSameSkill_AreRemoved()
    {
        var result = RecommendationCleaner.Clean(
            ["Baue ein kleines Projekt mit Docker Compose.", "Baue ein kleines Projekt mit Docker Compose auf."],
            Skills,
            minItems: 0);

        Assert.Single(result);
    }

    [Fact]
    public void AtMostTwoEntriesPerSkill()
    {
        var result = RecommendationCleaner.Clean(
            [
                "Absolviere die Zertifizierung AZ-900 für Azure.",
                "Deploye eine Web-App nach Azure.",
                "Richte Monitoring mit Azure Application Insights ein.",
                "Containerisiere eine Anwendung mit Docker.",
            ],
            Skills);

        Assert.Equal(3, result.Count);
        Assert.Equal(2, result.Count(text => text.Contains("Azure")));
        Assert.Contains(result, text => text.Contains("Docker"));
    }

    [Fact]
    public void TooFewResults_AreFilledFromFallbackWithoutDuplicates()
    {
        var result = RecommendationCleaner.Clean(
            ["Mach dich mit den Azure-Tools und -Tools vertraut."],
            Skills,
            fallback: ["Arbeite dich in Azure ein, z. B. mit einem kleinen Praxisprojekt.", "Arbeite dich in Azure ein, z. B. mit einem kleinen Praxisprojekt."]);

        Assert.Equal(["Arbeite dich in Azure ein, z. B. mit einem kleinen Praxisprojekt."], result);
    }

    [Fact]
    public void LearningTopics_StayKeywordsWithoutTrailingPeriod()
    {
        var result = RecommendationCleaner.Clean(["Azure-Infrastruktur.", "azure-infrastruktur", "Kubernetes-Grundlagen"], Skills, minItems: 0, sentences: false);

        Assert.Equal(["Azure-Infrastruktur", "Kubernetes-Grundlagen"], result);
    }

    [Theory]
    [InlineData("Lerne Go für Microservices.", "Go", true)]
    [InlineData("Nutze Google Cloud.", "Go", false)]
    [InlineData("Vertiefe C# mit einem Projekt.", "C#", true)]
    [InlineData("Lerne die Azure-Dienste kennen.", "Azure", true)]
    public void MentionsSkill_RespectsWordBoundaries(string text, string skill, bool expected)
    {
        Assert.Equal(expected, RecommendationCleaner.MentionsSkill(text, skill));
    }
}
