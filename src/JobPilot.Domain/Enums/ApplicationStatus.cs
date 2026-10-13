namespace JobPilot.Domain.Enums;

/// <summary>Lebenszyklus einer Bewerbung.</summary>
public enum ApplicationStatus
{
    /// <summary>Entwurf - noch nicht abgeschickt.</summary>
    Draft = 0,

    /// <summary>Beworben - Bewerbung wurde eingereicht.</summary>
    Applied = 1,

    /// <summary>Vorstellungsgespraech - Einladung erhalten.</summary>
    Interview = 2,

    /// <summary>Angebot - Vertragsangebot liegt vor.</summary>
    Offer = 3,

    /// <summary>Zusage - Angebot angenommen.</summary>
    Accepted = 4,

    /// <summary>Absage - Prozess negativ beendet.</summary>
    Rejected = 5
}