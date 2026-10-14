using JobPilot.Application.Auth;

namespace JobPilot.Application.Abstractions;

/// <summary>Datenexport und Kontoloeschung fuer den angemeldeten Benutzer.</summary>
public interface IAccountService
{
    Task<AccountExport> ExportAsync(CancellationToken cancellationToken = default);

    /// <summary>Loescht Konto, alle Daten und alle abgelegten Dateien. Das Passwort muss vorher geprueft sein.</summary>
    Task DeleteAccountAsync(CancellationToken cancellationToken = default);
}
