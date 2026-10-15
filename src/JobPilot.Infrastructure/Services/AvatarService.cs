using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;
using JobPilot.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JobPilot.Infrastructure.Services;

/// <summary>
/// Profilbilder: nur PNG/JPEG bis 2 MB mit gepruefter Dateisignatur. Das Bild wird im
/// Browser bereits quadratisch zugeschnitten und neu kodiert (entfernt EXIF-Daten).
/// </summary>
public class AvatarService(
    JobPilotDbContext db,
    ICurrentUser currentUser,
    IFileStorage fileStorage,
    TimeProvider timeProvider,
    ILogger<AvatarService> logger) : IAvatarService
{
    public const long MaxSizeInBytes = 2 * 1024 * 1024;

    private static readonly string[] AllowedExtensions = [".png", ".jpg", ".jpeg"];

    public async Task UploadAsync(byte[] content, string fileName, CancellationToken cancellationToken = default)
    {
        if (content.Length == 0)
        {
            throw new ValidationFailedException("file", "Bitte wähle ein Bild aus.");
        }

        if (content.Length > MaxSizeInBytes)
        {
            throw new ValidationFailedException("file", "Das Profilbild darf höchstens 2 MB groß sein.");
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension) || !FileSignature.Matches(content, extension))
        {
            throw new ValidationFailedException("file", "Bitte ein PNG- oder JPG-Bild hochladen.");
        }

        var user = await FindUserAsync(cancellationToken);
        var previousPath = user.AvatarStoragePath;

        var storagePath = await fileStorage.SaveAsync(content, extension, cancellationToken);

        try
        {
            user.AvatarStoragePath = storagePath;
            user.AvatarUpdatedAt = timeProvider.GetUtcNow();
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            fileStorage.Delete(storagePath);
            throw;
        }

        if (previousPath is not null)
        {
            fileStorage.Delete(previousPath);
        }

        logger.LogInformation("Profilbild fuer Benutzer {UserId} aktualisiert.", user.Id);
    }

    public async Task<(Stream Content, string ContentType)?> OpenAsync(CancellationToken cancellationToken = default)
    {
        var user = await FindUserAsync(cancellationToken);
        if (user.AvatarStoragePath is null)
        {
            return null;
        }

        try
        {
            var contentType = FileSignature.ContentTypeFor(Path.GetExtension(user.AvatarStoragePath));
            return (fileStorage.OpenRead(user.AvatarStoragePath), contentType);
        }
        catch (FileNotFoundException)
        {
            return null;
        }
    }

    public async Task DeleteAsync(CancellationToken cancellationToken = default)
    {
        var user = await FindUserAsync(cancellationToken);
        if (user.AvatarStoragePath is null)
        {
            return;
        }

        var path = user.AvatarStoragePath;
        user.AvatarStoragePath = null;
        user.AvatarUpdatedAt = timeProvider.GetUtcNow();
        await db.SaveChangesAsync(cancellationToken);

        fileStorage.Delete(path);
    }

    private async Task<Domain.Entities.ApplicationUser> FindUserAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        return await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Es ist kein Benutzer angemeldet.");
    }
}
