using System.Net;
using System.Net.Http.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace JobPilot.Tests.Api;

/// <summary>Die Grenzen des Missbrauchsschutzes kommen aus der Konfiguration.</summary>
public class RateLimitTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task AuthLimit_IsReadFromConfiguration()
    {
        using var limited = factory.WithWebHostBuilder(builder => builder.UseSetting("RateLimiting:AuthPermitLimit", "2"));
        using var client = limited.CreateClient();

        var statusCodes = new List<HttpStatusCode>();
        for (var i = 0; i < 3; i++)
        {
            // Leere Eingaben scheitern an der Validierung (400), zaehlen aber fuer das Limit.
            var response = await client.PostAsJsonAsync("/api/auth/login", new { email = "", password = "" });
            statusCodes.Add(response.StatusCode);
        }

        Assert.Equal([HttpStatusCode.BadRequest, HttpStatusCode.BadRequest, HttpStatusCode.TooManyRequests], statusCodes);
    }
}
