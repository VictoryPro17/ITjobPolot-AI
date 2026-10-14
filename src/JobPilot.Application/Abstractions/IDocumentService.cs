using JobPilot.Application.Documents;
using JobPilot.Domain.Enums;

namespace JobPilot.Application.Abstractions;

/// <summary>Dokumentenverwaltung des angemeldeten Benutzers.</summary>
public interface IDocumentService
{
    Task<IReadOnlyList<DocumentDto>> GetAllAsync(DocumentType? type, Guid? jobApplicationId, CancellationToken cancellationToken = default);

    Task<DocumentDto> UploadAsync(
        byte[] content,
        string fileName,
        DocumentType documentType,
        Guid? jobApplicationId,
        CancellationToken cancellationToken = default);

    Task<DocumentDto> UpdateAsync(Guid id, UpdateDocumentRequest request, CancellationToken cancellationToken = default);

    Task<DocumentDownload> OpenAsync(Guid id, CancellationToken cancellationToken = default);

    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
