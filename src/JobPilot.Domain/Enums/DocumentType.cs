namespace JobPilot.Domain.Enums;

/// <summary>Art eines hochgeladenen Benutzerdokuments.</summary>
public enum DocumentType
{
    Other = 0,

    /// <summary>Lebenslauf.</summary>
    Resume = 1,

    /// <summary>Anschreiben.</summary>
    CoverLetter = 2,

    /// <summary>Zeugnis.</summary>
    Reference = 3,

    /// <summary>Zertifikat.</summary>
    Certificate = 4
}