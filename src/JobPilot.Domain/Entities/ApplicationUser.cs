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