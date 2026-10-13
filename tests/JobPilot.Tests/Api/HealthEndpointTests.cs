using System.Net;
using System.Net.Http.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace JobPilot.Tests.Api;

/// <summary>
/// Smoke-Test der API-Komposition. Prueft, dass der Host startet und der
/// anonyme Health-Endpunkt antwortet - auch ohne erreichbare Datenbank.
/// </summary>
public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthEndpointTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task GetHealth_ReturnsOk()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<HealthPayload>();

        Assert.NotNull(payload);
        Assert.Equal("ok", payload.Status);
        Assert.Equal("JobPilot AI API", payload.Service);
    }

    [Fact]
    public async Task GetApplicationsWithoutAuthentication_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/job-applications");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private sealed record HealthPayload(string Status, string Service, DateTimeOffset Timestamp, bool? DatabaseConnected);
}