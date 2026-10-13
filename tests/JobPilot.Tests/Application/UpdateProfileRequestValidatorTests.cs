using JobPilot.Application.Auth;

namespace JobPilot.Tests.Application;

public class UpdateProfileRequestValidatorTests
{
    [Theory]
    [InlineData(2000, true)]
    [InlineData(2001, false)]
    public void ExperienceSummary_IsLimitedTo2000Characters(int length, bool expectedValid)
    {
        var request = new UpdateProfileRequest(
            null, null, null, null, null, new string('a', length), null, null, null, null);

        var result = new UpdateProfileRequestValidator().Validate(request);

        Assert.Equal(expectedValid, result.IsValid);
    }
}
