namespace JobPilot.Application.Common;

/// <summary>Die angeforderte Ressource existiert nicht.</summary>
public class NotFoundException(string message) : Exception(message)
{
    public static NotFoundException For(string resource, Guid id) =>
        new($"{resource} mit der Kennung {id} wurde nicht gefunden.");
}

/// <summary>
/// Der Benutzer ist angemeldet, darf die Ressource aber nicht verwenden.
/// Wird bewusst wie "nicht gefunden" behandelt, damit die Existenz fremder
/// Datensaetze nicht nach aussen sichtbar wird.
/// </summary>
public class ForbiddenException(string message) : Exception(message);

/// <summary>Der Vorgang widerspricht dem aktuellen Zustand der Daten.</summary>
public class ConflictException(string message) : Exception(message);

/// <summary>Eingabevalidierung fehlgeschlagen, inklusive Feldzuordnung.</summary>
public class ValidationFailedException : Exception
{
    public ValidationFailedException(IDictionary<string, string[]> errors)
        : base("Die Eingaben sind ungueltig.")
    {
        Errors = errors;
    }

    public ValidationFailedException(string field, string message)
        : this(new Dictionary<string, string[]> { [field] = [message] })
    {
    }

    public IDictionary<string, string[]> Errors { get; }
}