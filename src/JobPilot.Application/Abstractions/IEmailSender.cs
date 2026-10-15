namespace JobPilot.Application.Abstractions;

/// <summary>Eine zu versendende E-Mail mit HTML- und Textfassung.</summary>
public record EmailMessage(string ToAddress, string? ToName, string Subject, string HtmlBody, string TextBody);

/// <summary>Versendet E-Mails (SMTP oder, ohne Konfiguration, nur protokolliert).</summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}
