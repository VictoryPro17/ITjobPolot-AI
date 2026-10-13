using JobPilot.Domain.Common;

namespace JobPilot.Domain.Entities;

/// <summary>
/// Unternehmen, bei dem sich der Benutzer beworben hat. Bewusst pro Benutzer
/// gefuehrt, damit keine Stammdaten zwischen Konten geteilt werden.
/// </summary>
public class Company : OwnedEntityBase
{
    public required string Name { get; set; }

    public string? Website { get; set; }

    public string? Industry { get; set; }

    public string? Location { get; set; }

    public string? Notes { get; set; }

    public ApplicationUser? User { get; set; }

    public ICollection<JobApplication> JobApplications { get; set; } = [];
}