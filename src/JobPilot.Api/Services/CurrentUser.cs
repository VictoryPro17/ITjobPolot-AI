using System.Security.Claims;
using JobPilot.Application.Abstractions;

namespace JobPilot.Api.Services;

/// <summary>
/// Liest die Identitaet ausschliesslich aus den validierten Claims des
/// Authentifizierungs-Cookies – niemals aus Nutzereingaben.
/// </summary>
public class CurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => httpContextAccessor.HttpContext?.User;

    public Guid? UserId =>
        Guid.TryParse(Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            ? id
            : null;

    public string? Email => Principal?.FindFirstValue(ClaimTypes.Email);

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public Guid RequireUserId() =>
        UserId ?? throw new UnauthorizedAccessException("Es ist kein Benutzer angemeldet.");
}
