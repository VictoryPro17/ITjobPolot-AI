using JobPilot.Domain.Common;
using JobPilot.Domain.Enums;

namespace JobPilot.Domain.Entities;

/// <summary>Erinnerung innerhalb der Anwendung (E-Mail-Versand folgt spaeter).</summary>
public class Reminder : OwnedEntityBase
{
    public required string Title { get; set; }

    public string? Description { get; set; }

    public DateTimeOffset DueAt { get; set; }

    public ReminderType ReminderType { get; set; } = ReminderType.Custom;

    public bool IsCompleted { get; set; }

    public DateTimeOffset? CompletedAt { get; set; }

    public Guid? JobApplicationId { get; set; }

    public JobApplication? JobApplication { get; set; }

    public ApplicationUser? User { get; set; }

    public bool IsOverdue => !IsCompleted && DueAt < DateTimeOffset.UtcNow;
}