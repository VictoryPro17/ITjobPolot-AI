using System.Reflection;
using System.Security.Claims;

using JobPilot.Api.Authorization;
using JobPilot.Api.Controllers;
using JobPilot.Domain.Entities;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace JobPilot.Tests.Api;

public class EmailConfirmationPolicyTests
{
    private static IAuthorizationService CreateAuthorizationService() =>
        new ServiceCollection()
            .AddLogging()
            .AddAuthorization(EmailConfirmation.Configure)
            .BuildServiceProvider()
            .GetRequiredService<IAuthorizationService>();

    private static ClaimsPrincipal SignedIn(string? confirmed)
    {
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) };
        if (confirmed is not null)
        {
            claims.Add(new Claim(EmailConfirmation.ClaimType, confirmed));
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Test"));
    }

    [Theory]
    [InlineData("true", true)]
    [InlineData("false", false)]
    [InlineData(null, false)] // Cookie aus der Zeit vor der Bestaetigungspflicht
    public async Task DefaultPolicy_RequiresConfirmedEmail(string? claim, bool expected)
    {
        var service = CreateAuthorizationService();
        var options = new AuthorizationOptions();
        EmailConfirmation.Configure(options);

        var result = await service.AuthorizeAsync(SignedIn(claim), resource: null, options.DefaultPolicy);

        Assert.Equal(expected, result.Succeeded);
    }

    [Fact]
    public async Task AllowUnconfirmedPolicy_OnlyRequiresSignIn()
    {
        var service = CreateAuthorizationService();

        Assert.True((await service.AuthorizeAsync(SignedIn("false"), null, EmailConfirmation.AllowUnconfirmedPolicy)).Succeeded);
        Assert.False((await service.AuthorizeAsync(new ClaimsPrincipal(new ClaimsIdentity()), null, EmailConfirmation.AllowUnconfirmedPolicy)).Succeeded);
    }

    [Fact]
    public void OnlyTheIntendedEndpointsAreReachableWithoutConfirmation()
    {
        var exceptions = typeof(AuthController).Assembly.GetTypes()
            .Where(type => typeof(ControllerBase).IsAssignableFrom(type))
            .SelectMany(type => type.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            .Where(method => method.GetCustomAttributes<AuthorizeAttribute>().Any(attribute => attribute.Policy == EmailConfirmation.AllowUnconfirmedPolicy))
            .Select(method => $"{method.DeclaringType!.Name}.{method.Name}")
            .Order()
            .ToList();

        Assert.Equal(
            ["AuthController.DeleteAccount", "AuthController.Export", "AuthController.Logout", "AuthController.Me", "AuthController.ResendConfirmation"],
            exceptions);
    }

    [Theory]
    [InlineData(true, "true", false)]
    [InlineData(true, "false", true)]
    [InlineData(false, "false", false)]
    [InlineData(true, null, true)]
    public void IsStale_DetectsOutdatedCookie(bool confirmedInDatabase, string? claim, bool expected)
    {
        var user = new ApplicationUser { EmailConfirmed = confirmedInDatabase };
        Assert.Equal(expected, EmailConfirmation.IsStale(SignedIn(claim), user));
    }
}
