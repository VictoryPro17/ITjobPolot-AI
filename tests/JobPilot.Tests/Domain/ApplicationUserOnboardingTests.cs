using JobPilot.Domain.Entities;

namespace JobPilot.Tests.Domain;

public class ApplicationUserOnboardingTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 15, 9, 0, 0, TimeSpan.Zero);

    [Fact]
    public void NewUser_HasNotCompletedOnboarding()
    {
        var user = new ApplicationUser();

        Assert.False(user.TryCompleteOnboarding(Now));
        Assert.Null(user.OnboardingCompletedAt);
    }

    [Theory]
    [InlineData("Backend Developer", new string[0])]
    [InlineData("  ", new[] { "C#" })]
    [InlineData(null, new[] { "C#" })]
    [InlineData("Backend Developer", new[] { " " })]
    public void IncompleteProfile_DoesNotCompleteOnboarding(string? targetJobTitle, string[] skills)
    {
        var user = new ApplicationUser { TargetJobTitle = targetJobTitle, Skills = [.. skills] };

        Assert.False(user.TryCompleteOnboarding(Now));
        Assert.Null(user.OnboardingCompletedAt);
    }

    [Fact]
    public void TargetJobTitleAndSkill_CompleteOnboarding()
    {
        var user = new ApplicationUser { TargetJobTitle = "Backend Developer", Skills = ["C#"] };

        Assert.True(user.TryCompleteOnboarding(Now));
        Assert.Equal(Now, user.OnboardingCompletedAt);
    }

    [Fact]
    public void CompletedOnboarding_StaysCompletedWhenProfileIsClearedLater()
    {
        var user = new ApplicationUser { TargetJobTitle = "Backend Developer", Skills = ["C#"] };
        user.TryCompleteOnboarding(Now);

        user.TargetJobTitle = null;
        user.Skills = [];

        Assert.True(user.TryCompleteOnboarding(Now.AddDays(1)));
        Assert.Equal(Now, user.OnboardingCompletedAt);
    }
}
