namespace JobPilot.Application.Abstractions;

/// <summary>
/// Zugriff auf den aktuell authentifizierten Benutzer. Dient als Grundlage fuer
/// die serverseitige Mandantentrennung – Services duerfen die UserId niemals
/// aus einem Request-Body uebernehmen.
/// </summary>
public interface ICurrentUser
{
    Guid? UserId { get; }

    string? Email { get; }

    bool IsAuthenticated { get; }

    /// <summary>Liefert die UserId oder wirft, wenn kein Benutzer angemeldet ist.</summary>
    Guid RequireUserId();
}
