using JobPilot.Domain.Common;
using JobPilot.Domain.Enums;

namespace JobPilot.Domain.Entities;

/// <summary>
/// Metadaten eines hochgeladenen Dokuments. Die Datei selbst liegt ausserhalb
/// der Datenbank; StoragePath ist relativ zum konfigurierten Upload-Verzeichnis,
/// damit keine absoluten Pfade persistiert werden.
/// </summary>
public class UserDocument : OwnedEntityBase
{
    public required string FileName { get; set; }

    public required string StoragePath { get; set; }

    public required string ContentType { get; set; }

    public long SizeInBytes { get; set; }

    public DocumentType DocumentType { get; set; } = DocumentType.Other;

    /// <summary>SHA-256 der Datei zur Dublettenerkennung und Integritaetspruefung.</summary>
    public string? Sha256 { get; set; }

    /// <summary>Extrahierter Text (z. B. aus einem PDF-Lebenslauf) fuer KI-Funktionen.</summary>
    public string? ExtractedText { get; set; }

    public Guid? JobApplicationId { get; set; }

    public JobApplication? JobApplication { get; set; }

    public ApplicationUser? User { get; set; }
}