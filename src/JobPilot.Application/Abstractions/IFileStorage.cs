namespace JobPilot.Application.Abstractions;

/// <summary>Ablage hochgeladener Dateien ausserhalb der Datenbank.</summary>
public interface IFileStorage
{
    /// <summary>Speichert den Inhalt unter einem neuen Namen und liefert den relativen Speicherpfad.</summary>
    Task<string> SaveAsync(byte[] content, string extension, CancellationToken cancellationToken = default);

    Stream OpenRead(string storagePath);

    /// <summary>Entfernt eine Datei; fehlende Dateien werden ignoriert.</summary>
    void Delete(string storagePath);
}
