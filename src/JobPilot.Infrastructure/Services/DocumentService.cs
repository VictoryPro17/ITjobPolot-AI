using System.Security.Cryptography;

using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;
using JobPilot.Application.Documents;
using JobPilot.Domain.Entities;
using JobPilot.Domain.Enums;
using JobPilot.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace JobPilot.Infrastructure.Services;

/// <summary>
/// Dokumentenverwaltung. Jeder Zugriff wird auf den angemeldeten Benutzer
/// eingeschraenkt; Dateien liegen ueber <see cref="IFileStorage"/> ausserhalb der Datenbank.
/// </summary>
public class DocumentService(
    JobPilotDbContext db,
    ICurrentUser currentUser,
    IFileStorage fileStorage,
    IOptions<StorageOptions> storageOptions,
    ILogger<DocumentService> logger) : IDocumentService
{
    private const int MaxFileNameLength = 255;

    private readonly StorageOptions _storageOptions = storageOptions.Value;

    public async Task<IReadOnlyList<DocumentDto>> GetAllAsync(
        DocumentType? type,
        Guid? jobApplicationId,
        CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        var query = db.UserDocuments.AsNoTracking().Where(d => d.UserId == userId);

        if (type is not null)
        {
            query = query.Where(d => d.DocumentType == type);
        }

        if (jobApplicationId is not null)
        {
            query = query.Where(d => d.JobApplicationId == jobApplicationId);
        }

        return await query
            .OrderByDescending(d => d.CreatedAt)
            .Select(ToDtoExpression())
            .ToListAsync(cancellationToken);
    }

    public async Task<DocumentDto> UploadAsync(
        byte[] content,
        string fileName,
        DocumentType documentType,
        Guid? jobApplicationId,
        CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();

        if (content.Length == 0)
        {
            throw new ValidationFailedException("file", "Bitte wählen Sie eine gültige Datei aus.");
        }

        if (content.Length > _storageOptions.MaxFileSizeInBytes)
        {
            throw new ValidationFailedException("file", $"Die Datei ist größer als das erlaubte Limit von {_storageOptions.MaxFileSizeInBytes} Bytes.");
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (!_storageOptions.AllowedExtensions.Any(ext => string.Equals(ext, extension, StringComparison.OrdinalIgnoreCase)))
        {
            throw new ValidationFailedException("file", "Dieses Dateiformat wird nicht unterstützt.");
        }

        if (!FileSignature.Matches(content, extension))
        {
            throw new ValidationFailedException("file", "Der Dateiinhalt passt nicht zur Dateiendung.");
        }

        var documentCount = await db.UserDocuments.CountAsync(d => d.UserId == userId, cancellationToken);
        if (documentCount >= _storageOptions.MaxDocumentsPerUser)
        {
            throw new ValidationFailedException("file", $"Es sind höchstens {_storageOptions.MaxDocumentsPerUser} Dokumente erlaubt.");
        }

        var sha256 = Convert.ToHexString(SHA256.HashData(content));
        if (await db.UserDocuments.AnyAsync(d => d.UserId == userId && d.Sha256 == sha256, cancellationToken))
        {
            throw new ConflictException("Diese Datei wurde bereits hochgeladen.");
        }

        await EnsureApplicationBelongsToUserAsync(jobApplicationId, userId, cancellationToken);

        var safeFileName = Path.GetFileName(fileName).Trim();
        if (safeFileName.Length > MaxFileNameLength)
        {
            safeFileName = safeFileName[..(MaxFileNameLength - extension.Length)] + extension;
        }

        var storagePath = await fileStorage.SaveAsync(content, extension, cancellationToken);

        var document = new UserDocument
        {
            UserId = userId,
            FileName = safeFileName,
            StoragePath = storagePath,
            ContentType = FileSignature.ContentTypeFor(extension),
            SizeInBytes = content.Length,
            DocumentType = documentType,
            Sha256 = sha256,
            JobApplicationId = jobApplicationId
        };

        try
        {
            db.UserDocuments.Add(document);
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // Ohne Datenbankeintrag waere die Datei verwaist.
            fileStorage.Delete(storagePath);
            throw;
        }

        logger.LogInformation("Dokument {DocumentId} fuer Benutzer {UserId} hochgeladen.", document.Id, userId);

        return await GetDtoAsync(document.Id, userId, cancellationToken);
    }

    public async Task<DocumentDto> UpdateAsync(Guid id, UpdateDocumentRequest request, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        var document = await FindAsync(id, userId, cancellationToken);

        await EnsureApplicationBelongsToUserAsync(request.JobApplicationId, userId, cancellationToken);

        document.DocumentType = request.DocumentType;
        document.JobApplicationId = request.JobApplicationId;
        await db.SaveChangesAsync(cancellationToken);

        return await GetDtoAsync(id, userId, cancellationToken);
    }

    public async Task<DocumentDownload> OpenAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        var document = await FindAsync(id, userId, cancellationToken);

        try
        {
            return new DocumentDownload(fileStorage.OpenRead(document.StoragePath), document.ContentType, document.FileName);
        }
        catch (FileNotFoundException)
        {
            throw NotFoundException.For("Dokumentdatei", id);
        }
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.RequireUserId();
        var document = await FindAsync(id, userId, cancellationToken);

        db.UserDocuments.Remove(document);
        await db.SaveChangesAsync(cancellationToken);

        fileStorage.Delete(document.StoragePath);

        logger.LogInformation("Dokument {DocumentId} fuer Benutzer {UserId} geloescht.", id, userId);
    }

    private async Task<UserDocument> FindAsync(Guid id, Guid userId, CancellationToken cancellationToken) =>
        await db.UserDocuments.FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId, cancellationToken)
        ?? throw NotFoundException.For("Dokument", id);

    private async Task<DocumentDto> GetDtoAsync(Guid id, Guid userId, CancellationToken cancellationToken) =>
        await db.UserDocuments
            .AsNoTracking()
            .Where(d => d.Id == id && d.UserId == userId)
            .Select(ToDtoExpression())
            .SingleAsync(cancellationToken);

    private async Task EnsureApplicationBelongsToUserAsync(Guid? jobApplicationId, Guid userId, CancellationToken cancellationToken)
    {
        if (jobApplicationId is null)
        {
            return;
        }

        if (!await db.JobApplications.AnyAsync(a => a.Id == jobApplicationId && a.UserId == userId, cancellationToken))
        {
            throw NotFoundException.For("Bewerbung", jobApplicationId.Value);
        }
    }

    private static System.Linq.Expressions.Expression<Func<UserDocument, DocumentDto>> ToDtoExpression() =>
        d => new DocumentDto(
            d.Id,
            d.FileName,
            d.ContentType,
            d.SizeInBytes,
            d.DocumentType,
            d.JobApplicationId,
            d.JobApplication == null ? null : d.JobApplication.CompanyName + " · " + d.JobApplication.JobTitle,
            d.ExtractedText != null && d.ExtractedText != "",
            d.CreatedAt);
}
