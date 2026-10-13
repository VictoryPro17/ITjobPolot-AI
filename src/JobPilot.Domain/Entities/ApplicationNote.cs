using JobPilot.Domain.Common;

namespace JobPilot.Domain.Entities;

/// <summary>Chronologische Notiz zu einer Bewerbung.</summary>
public class ApplicationNote : OwnedEntityBase
{
    public Guid JobApplicationId { get; set; }

    public required string Content { get; set; }

    public JobApplication? JobApplication { get; set; }

    public ApplicationUser? User { get; set; }
}