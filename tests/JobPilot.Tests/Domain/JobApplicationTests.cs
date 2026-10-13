using JobPilot.Domain.Entities;
using JobPilot.Domain.Enums;

namespace JobPilot.Tests.Domain;

public class JobApplicationTests
{
    [Theory]
    [InlineData(ApplicationStatus.Draft, true)]
    [InlineData(ApplicationStatus.Applied, true)]
    [InlineData(ApplicationStatus.Interview, true)]
    [InlineData(ApplicationStatus.Offer, true)]
    [InlineData(ApplicationStatus.Accepted, false)]
    [InlineData(ApplicationStatus.Rejected, false)]
    public void IsOpen_ReflectsStatus(ApplicationStatus status, bool expected)
    {
        var application = CreateApplication();
        application.Status = status;

        Assert.Equal(expected, application.IsOpen);
    }

    [Fact]
    public void NewApplication_StartsAsDraftWithGeneratedId()
    {
        var application = CreateApplication();

        Assert.Equal(ApplicationStatus.Draft, application.Status);
        Assert.NotEqual(Guid.Empty, application.Id);
        Assert.Empty(application.Technologies);
    }

    private static JobApplication CreateApplication() => new()
    {
        UserId = Guid.CreateVersion7(),
        CompanyName = "Contoso GmbH",
        JobTitle = "Softwareentwickler",
    };
}