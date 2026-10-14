using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;

using Microsoft.Extensions.Options;

namespace JobPilot.Infrastructure.Services;

/// <summary>
/// Dateiablage im lokalen Dateisystem. Der Speicherpfad hat das Format
/// "{UploadRoot}/{guid}{ext}" und bleibt damit kompatibel zu bestehenden Eintraegen.
/// </summary>
public class LocalFileStorage(IOptions<StorageOptions> options) : IFileStorage
{
    private readonly string _uploadRoot = string.IsNullOrWhiteSpace(options.Value.UploadRoot)
        ? "uploads"
        : options.Value.UploadRoot;

    private string AbsoluteRoot => Path.GetFullPath(Path.IsPathRooted(_uploadRoot)
        ? _uploadRoot
        : Path.Combine(Directory.GetCurrentDirectory(), _uploadRoot));

    public async Task<string> SaveAsync(byte[] content, string extension, CancellationToken cancellationToken = default)
    {
        var root = AbsoluteRoot;
        Directory.CreateDirectory(root);

        var fileName = $"{Guid.CreateVersion7():N}{extension.ToLowerInvariant()}";
        await File.WriteAllBytesAsync(Path.Combine(root, fileName), content, cancellationToken);

        return Path.Combine(_uploadRoot, fileName).Replace('\\', '/');
    }

    public Stream OpenRead(string storagePath) =>
        new FileStream(Resolve(storagePath), FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true);

    public void Delete(string storagePath)
    {
        var fullPath = Resolve(storagePath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
    }

    private string Resolve(string storagePath)
    {
        var fullPath = Path.GetFullPath(Path.IsPathRooted(storagePath)
            ? storagePath
            : Path.Combine(Directory.GetCurrentDirectory(), storagePath));

        // Schutz gegen Pfadmanipulation: Nur Dateien unterhalb der Upload-Wurzel sind erlaubt.
        var root = AbsoluteRoot.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        if (!fullPath.StartsWith(root, StringComparison.OrdinalIgnoreCase))
        {
            throw new ForbiddenException("Der Zugriff auf diese Datei ist nicht erlaubt.");
        }

        return fullPath;
    }
}
