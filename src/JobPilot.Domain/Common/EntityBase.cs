namespace JobPilot.Domain.Common;

/// <summary>
/// Basisklasse fuer alle persistierten Entitaeten mit technischem Schluessel
/// und Audit-Zeitstempeln. Die Zeitstempel werden zentral im DbContext gepflegt.
/// </summary>
public abstract class EntityBase
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>
/// Entitaet, die genau einem Benutzer gehoert. Jeder Datenzugriff muss
/// serverseitig zusaetzlich ueber <see cref="UserId"/> gefiltert werden.
/// </summary>
public abstract class OwnedEntityBase : EntityBase
{
    public Guid UserId { get; set; }
}
