namespace JobPilot.Application.Abstractions;

/// <summary>Profilbild des angemeldeten Benutzers.</summary>
public interface IAvatarService
{
    /// <summary>Speichert ein neues Profilbild und entfernt das bisherige.</summary>
    Task UploadAsync(byte[] content, string fileName, CancellationToken cancellationToken = default);

    /// <summary>Oeffnet das Profilbild; null, wenn keines vorhanden ist.</summary>
    Task<(Stream Content, string ContentType)?> OpenAsync(CancellationToken cancellationToken = default);

    Task DeleteAsync(CancellationToken cancellationToken = default);
}
