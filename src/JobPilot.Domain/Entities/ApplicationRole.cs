using Microsoft.AspNetCore.Identity;

namespace JobPilot.Domain.Entities;

/// <summary>
/// Rolle fuer spaetere Erweiterungen (z. B. Admin-Bereich, Team-Funktionen).
/// Eigene Klasse, damit zusaetzliche Felder ohne Migration des Identity-Kerns moeglich sind.
/// </summary>
public class ApplicationRole : IdentityRole<Guid>
{
    public ApplicationRole() { }

    public ApplicationRole(string roleName) : base(roleName) { }

    public string? Description { get; set; }
}
