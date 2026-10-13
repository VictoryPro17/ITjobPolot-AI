namespace JobPilot.Domain.Enums;

/// <summary>Anlass einer Erinnerung.</summary>
public enum ReminderType
{
    /// <summary>Individuelle Aufgabe.</summary>
    Custom = 0,

    /// <summary>Vorstellungsgespraech.</summary>
    Interview = 1,

    /// <summary>Rueckmeldungsfrist.</summary>
    Deadline = 2,

    /// <summary>Nachfassen beim Unternehmen.</summary>
    FollowUp = 3
}