using JobPilot.Application.Notes;

namespace JobPilot.Application.Abstractions;

/// <summary>Notizen zu Bewerbungen des angemeldeten Benutzers.</summary>
public interface IApplicationNoteService
{
    /// <summary>Alle Notizen der Bewerbung, neueste zuerst.</summary>
    Task<IReadOnlyList<ApplicationNoteDto>> GetAllAsync(Guid jobApplicationId, CancellationToken cancellationToken = default);

    Task<ApplicationNoteDto> CreateAsync(Guid jobApplicationId, CreateApplicationNoteRequest request, CancellationToken cancellationToken = default);

    Task DeleteAsync(Guid jobApplicationId, Guid noteId, CancellationToken cancellationToken = default);
}
