using FluentValidation.TestHelper;
using JobPilot.Application.Auth;

namespace JobPilot.Tests.Application;

public class AuthValidatorTests
{
    [Fact]
    public void Register_RejectsWeakPassword()
    {
        var result = new RegisterRequestValidator().TestValidate(
            new RegisterRequest("person@example.com", "short", "Ada", "Lovelace"));

        result.ShouldHaveValidationErrorFor(request => request.Password);
    }

    [Fact]
    public void Register_AcceptsValidRequest()
    {
        var result = new RegisterRequestValidator().TestValidate(
            new RegisterRequest("person@example.com", "SecurePass123", "Ada", "Lovelace"));

        result.ShouldNotHaveAnyValidationErrors();
    }
}
