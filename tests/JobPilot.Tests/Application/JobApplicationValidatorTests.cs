using FluentValidation.TestHelper;
using JobPilot.Application.JobApplications;
using JobPilot.Domain.Enums;

namespace JobPilot.Tests.Application;

public class JobApplicationValidatorTests
{
    [Fact]
    public void Create_RequiresAppliedDateForNonDraft()
    {
        var result = new CreateJobApplicationRequestValidator().TestValidate(
            new CreateJobApplicationRequest("Contoso", "Developer", null, Status: ApplicationStatus.Applied));

        result.ShouldHaveValidationErrorFor(request => request.AppliedOn);
    }

    [Fact]
    public void Create_RejectsInvalidJobPostingUrl()
    {
        var result = new CreateJobApplicationRequestValidator().TestValidate(
            new CreateJobApplicationRequest("Contoso", "Developer", null, JobPostingUrl: "not-a-url"));

        result.ShouldHaveValidationErrorFor(request => request.JobPostingUrl);
    }
}
