using Microsoft.AspNetCore.Identity;

namespace JobPilot.Domain.Entities;

/// <summary>
/// Benutzerkonto. Erbt von ASP.NET Core Identity und ist der Eigentuemer
/// saemtlicher Bewerbungs-, Dokument- und KI-Daten.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>
{
    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    /// <summary>Angestrebte Position, wird als Kontext fuer KI-Funktionen genutzt.</summary>
    public string? TargetJobTitle { get; set; }

    public string? Location { get; set; }

    /// <summary>Kurze zusammenfassende Beschreibung des eigenen Profils bzw. Lebenslaufs.</summary>
    public string? ProfileSummary { get; set; }

    /// <summary>Erfasste berufliche Erfahrung, z.B. als freier Text oder kurze Beschreibung.</summary>
    public string? ExperienceSummary { get; set; }

    /// <summary>Erfasste Ausbildung oder relevante Studien-/Lerninhalte.</summary>
    public string? EducationSummary { get; set; }

    /// <summary>Erkannte Skills aus dem Profil bzw. Lebenslauf.</summary>
    public List<string> Skills { get; set; } = [];

    /// <summary>Optionaler Rohtext des Lebenslaufs, falls dieser später weiter verarbeitet wird.</summary>
    public string? ResumeText { get; set; }

    /// <summary>Speicherpfad des Profilbilds (relativ zur Upload-Wurzel), null ohne Bild.</summary>
    public string? AvatarStoragePath { get; set; }

    /// <summary>Zeitpunkt des letzten Profilbild-Wechsels; dient als Cache-Version fuer die Oberflaeche.</summary>
    public DateTimeOffset? AvatarUpdatedAt { get; set; }

    /// <summary>Bevorzugtes Farbschema der Oberflaeche ("light", "dark", "system").</summary>
    public string ThemePreference { get; set; } = "system";

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<JobApplication> JobApplications { get; set; } = [];

    public ICollection<Company> Companies { get; set; } = [];

    public ICollection<UserDocument> Documents { get; set; } = [];

    public ICollection<Reminder> Reminders { get; set; } = [];

    public ICollection<AiAnalysis> AiAnalyses { get; set; } = [];

    public ICollection<GeneratedCoverLetter> CoverLetters { get; set; } = [];

    /// <summary>Anzeigename fuer die Oberflaeche, faellt auf Benutzername bzw. E-Mail zurueck.</summary>
    public string DisplayName
    {
        get
        {
            var name = string.Join(' ', new[] { FirstName, LastName }
                .Where(s => !string.IsNullOrWhiteSpace(s)));

            return name.Length > 0 ? name : UserName ?? Email ?? Id.ToString();
        }
    }
}