using FluentValidation;

using JobPilot.Domain.Enums;

namespace JobPilot.Application.Documents;

/// <summary>Metadaten eines Dokuments fuer die Oberflaeche.</summary>
public record DocumentDto(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeInBytes,
    DocumentType DocumentType,
    Guid? JobApplicationId,
    string? JobApplicationLabel,
    bool HasExtractedText,
    DateTimeOffset CreatedAt);

/// <summary>Aendert Typ oder Zuordnung eines Dokuments.</summary>
public record UpdateDocumentRequest(DocumentType DocumentType, Guid? JobApplicationId);

/// <summary>Dateiinhalt fuer den Download.</summary>
public record DocumentDownload(Stream Content, string ContentType, string FileName);

public class UpdateDocumentRequestValidator : AbstractValidator<UpdateDocumentRequest>
{
    public UpdateDocumentRequestValidator()
    {
        RuleFor(x => x.DocumentType)
            .IsInEnum().WithMessage("Ungültiger Dokumenttyp.");
    }
}
