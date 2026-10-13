using JobPilot.Domain.Common;
using JobPilot.Domain.Enums;

namespace JobPilot.Domain.Entities;

/// <summary>
/// Protokolliert jede Statusaenderung einer Bewerbung. Grundlage fuer die
/// Statistiken (z. B. Einladungsquote und Verlauf ueber mehrere Monate).
/// </summary>
public class ApplicationStatusHistory : OwnedEntityBase
{
    public Guid JobApplicationId { get; set; }

    public ApplicationStatus? FromStatus { get; set; }

    public ApplicationStatus ToStatus { get; set; }

    public DateTimeOffset ChangedAt { get; set; }

    public string? Comment { get; set; }

    public JobApplication? JobApplication { get; set; }

    public ApplicationUser? User { get; set; }
}