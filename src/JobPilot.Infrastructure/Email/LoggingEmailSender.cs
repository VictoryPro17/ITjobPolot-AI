using JobPilot.Application.Abstractions;

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace JobPilot.Infrastructure.Email;

/// <summary>
/// Ersatz, wenn kein SMTP konfiguriert ist: Die E-Mail wird nicht versendet. In der Entwicklung
/// landet der Textinhalt (mit Link) im Log, damit sich die Ablaeufe trotzdem testen lassen.
/// Ausserhalb der Entwicklung wird nur eine Warnung ohne Inhalt geschrieben, weil Links Tokens enthalten.
/// </summary>
public class LoggingEmailSender(IHostEnvironment environment, ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        if (environment.IsDevelopment())
        {
            logger.LogInformation("E-Mail nicht versendet (Email:Enabled=false). Betreff: {Subject}\n{TextBody}", message.Subject, message.TextBody);
        }
        else
        {
            logger.LogWarning("E-Mail \"{Subject}\" wurde nicht versendet, weil kein SMTP-Server konfiguriert ist (Email:Enabled=false).", message.Subject);
        }

        return Task.CompletedTask;
    }
}
