using JobPilot.Application.Abstractions;
using JobPilot.Application.Documents;
using JobPilot.Domain.Enums;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobPilot.Api.Controllers;

/// <summary>Dokumente (Lebenslaeufe, Anschreiben, Zeugnisse, Zertifikate) des angemeldeten Benutzers.</summary>
[ApiController]
[Authorize]
[Route("api/documents")]
[Produces("application/json")]
public class DocumentsController(IDocumentService documentService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<DocumentDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DocumentDto>>> GetAll(
        [FromQuery] DocumentType? type,
        [FromQuery] Guid? jobApplicationId,
        CancellationToken cancellationToken)
        => Ok(await documentService.GetAllAsync(type, jobApplicationId, cancellationToken));

    [HttpPost]
    [Consumes("multipart/form-data")]
    [ProducesResponseType<DocumentDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DocumentDto>> Upload(
        IFormFile file,
        [FromForm] DocumentType documentType,
        [FromForm] Guid? jobApplicationId,
        CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream();
        await file.CopyToAsync(buffer, cancellationToken);

        var document = await documentService.UploadAsync(
            buffer.ToArray(), file.FileName, documentType, jobApplicationId, cancellationToken);

        return Created($"/api/documents/{document.Id}", document);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<DocumentDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DocumentDto>> Update(Guid id, UpdateDocumentRequest request, CancellationToken cancellationToken)
        => Ok(await documentService.UpdateAsync(id, request, cancellationToken));

    [HttpGet("{id:guid}/download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Download(Guid id, CancellationToken cancellationToken)
    {
        var download = await documentService.OpenAsync(id, cancellationToken);

        Response.Headers.XContentTypeOptions = "nosniff";
        return File(download.Content, download.ContentType, download.FileName);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await documentService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
