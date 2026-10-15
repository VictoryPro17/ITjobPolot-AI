namespace JobPilot.Application.Abstractions;

/// <summary>
/// Reiht E-Mails zum Versand im Hintergrund ein. Anfragen warten so nicht auf den Mailserver,
/// und "Passwort vergessen" antwortet fuer bekannte und unbekannte Adressen gleich schnell.
/// </summary>
public interface IEmailQueue
{
    ValueTask EnqueueAsync(EmailMessage message, CancellationToken cancellationToken = default);
}
