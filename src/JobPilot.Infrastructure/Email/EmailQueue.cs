using System.Threading.Channels;

using JobPilot.Application.Abstractions;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace JobPilot.Infrastructure.Email;

/// <summary>Begrenzte Warteschlange im Speicher; ein <see cref="EmailDispatcher"/> arbeitet sie ab.</summary>
public sealed class EmailQueue : IEmailQueue
{
    private readonly Channel<EmailMessage> _channel = Channel.CreateBounded<EmailMessage>(
        new BoundedChannelOptions(500) { FullMode = BoundedChannelFullMode.Wait, SingleReader = true });

    public ValueTask EnqueueAsync(EmailMessage message, CancellationToken cancellationToken = default) =>
        _channel.Writer.WriteAsync(message, cancellationToken);

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
