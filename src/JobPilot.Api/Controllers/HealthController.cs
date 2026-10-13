using JobPilot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JobPilot.Api.Controllers;

/// <summary>
/// Diagnose-Endpunkte. Dienen in Phase 1 dem Verbindungstest zwischen
/// Frontend, API und Datenbank.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/health")]
public class HealthController(JobPilotDbContext context) : ControllerBase
{
    /// <summary>Prueft, ob die API erreichbar ist.</summary>
    [HttpGet]
    public ActionResult<HealthResponse> Get() =>
        Ok(new HealthResponse("ok", "JobPilot AI API", DateTimeOffset.UtcNow, null));

    /// <summary>Prueft zusaetzlich die Verbindung zur PostgreSQL-Datenbank.</summary>
    [HttpGet("database")]
    public async Task<ActionResult<HealthResponse>> GetDatabase(CancellationToken cancellationToken)
    {
        var canConnect = await context.Database.CanConnectAsync(cancellationToken);

        var response = new HealthResponse(
            canConnect ? "ok" : "unavailable",
            "JobPilot AI API",
            DateTimeOffset.UtcNow,
            canConnect);

        return canConnect ? Ok(response) : StatusCode(StatusCodes.Status503ServiceUnavailable, response);
    }

    public record HealthResponse(string Status, string Service, DateTimeOffset Timestamp, bool? DatabaseConnected);
}
