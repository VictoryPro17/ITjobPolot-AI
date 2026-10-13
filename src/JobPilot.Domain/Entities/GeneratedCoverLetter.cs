using JobPilot.Domain.Common;
using JobPilot.Domain.Enums;

namespace JobPilot.Domain.Entities;

/// <summary>KI-generiertes oder manuell ueberarbeitetes Anschreiben.</summary>
public class GeneratedCoverLetter : OwnedEntityBase
{
    public Guid? JobApplicationId { get; set; }

    public required string Title { get; set; }

    public required string Content { get; set; }

    public string? CompanyName { get; set; }

    public string? JobTitle { get; set; }

    public WritingStyle Style { get; set; } = WritingStyle.Professional;

    /// <summary>Entwurf oder finalisierte Fassung.</summary>
    public bool IsDraft { get; set; } = true;

    public string? Provider { get; set; }

    public string? Model { get; set; }

    public JobApplication? JobApplication { get; set; }

    public ApplicationUser? User { get; set; }
}