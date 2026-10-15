using System.Threading.Channels;

using JobPilot.Application.Abstractions;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace JobPilot.Infrastructure.Email;

/// <summary>
/// Begrenzte Warteschlange im Speicher; ein <see cref="EmailDispatcher"/> arbeitet sie ab.
/// Einreihen blockiert nie: Ist die Schlange voll (z. B. weil der Mailserver haengt), wird die Mail
/// verworfen und protokolliert. So bleibt die Antwortzeit der Anfrage unabhaengig vom Mailserver,
/// und "Passwort vergessen" verraet auch unter Last nicht, ob ein Konto existiert.
/// </summary>
public sealed class EmailQueue(ILogger<EmailQueue> logger) : IEmailQueue
{
    public const int Capacity = 500;

    private readonly Channel<EmailMessage> _channel = Channel.CreateBounded<EmailMessage>(
        new BoundedChannelOptions(Capacity) { FullMode = BoundedChannelFullMode.Wait, SingleReader = true });

    public ValueTask EnqueueAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        if (!_channel.Writer.TryWrite(message))
        {
            logger.LogError("E-Mail-Warteschlange ist voll ({Capacity}); E-Mail \"{Subject}\" wurde verworfen.", Capacity, message.Subject);
        }

        return ValueTask.CompletedTask;
    }

    internal IAsyncEnumerable<EmailMessage> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}

/// <summary>
/// Versendet eingereihte E-Mails nacheinander. Ein Fehler beim Versand wird protokolliert und
/// beendet den Dienst nicht; die Anfrage, die die E-Mail ausgeloest hat, ist bereits beantwortet.
/// </summary>
public sealed class EmailDispatcher(EmailQueue queue, IServiceScopeFactory scopeFactory, ILogger<EmailDispatcher> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var message in queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var sender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
                await sender.SendAsync(message, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "E-Mail \"{Subject}\" konnte nicht versendet werden.", message.Subject);
            }
        }
    }
}
