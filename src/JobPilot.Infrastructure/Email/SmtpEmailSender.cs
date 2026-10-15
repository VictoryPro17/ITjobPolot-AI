using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;

using MailKit.Net.Smtp;
using MailKit.Security;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using MimeKit;

namespace JobPilot.Infrastructure.Email;

/// <summary>Versand ueber SMTP mit MailKit (lokal z. B. Mailpit, in Produktion ein echter Mailserver).</summary>
public class SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    private readonly EmailOptions _options = options.Value;

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        mime.To.Add(new MailboxAddress(message.ToName ?? string.Empty, message.ToAddress));
        mime.Subject = message.Subject;
        mime.Body = new BodyBuilder { HtmlBody = message.HtmlBody, TextBody = message.TextBody }.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(
            _options.Host,
            _options.Port,
            _options.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.None,
            cancellationToken);

        if (!string.IsNullOrEmpty(_options.Username))
        {
            await client.AuthenticateAsync(_options.Username, _options.Password ?? string.Empty, cancellationToken);
        }

        await client.SendAsync(mime, cancellationToken);
        await client.DisconnectAsync(quit: true, cancellationToken);

        // Kein Empfaenger im Log: E-Mail-Adressen sind personenbezogene Daten.
        logger.LogInformation("E-Mail \"{Subject}\" ueber {Host}:{Port} versendet.", message.Subject, _options.Host, _options.Port);
    }
}
