using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

using JobPilot.Application.Common;

using Microsoft.Extensions.Options;

namespace JobPilot.Infrastructure.Ai;

/// <summary>
/// Schlanker Client fuer die lokale Ollama-API. Antworten werden ueber ein
/// JSON-Schema erzwungen (structured outputs) und danach typisiert gelesen.
/// </summary>
public class OllamaClient(HttpClient httpClient, IOptions<AiOptions> options)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly AiOptions _options = options.Value;

    public string Model => _options.Model ?? string.Empty;

    /// <summary>Fuehrt einen Chat-Aufruf aus und liest die Antwort als <typeparamref name="T"/>.</summary>
    /// <exception cref="HttpRequestException">Ollama ist nicht erreichbar oder antwortet mit Fehler.</exception>
    /// <exception cref="JsonException">Die Antwort entspricht nicht dem erwarteten JSON.</exception>
    public async Task<T> ChatJsonAsync<T>(
        string system,
        string user,
        JsonObject schema,
        CancellationToken cancellationToken,
        double temperature = 0.2)
    {
        var request = new ChatRequest(
            Model,
            Stream: false,
            Format: schema,
            Options: new ChatOptions(Temperature: temperature, NumCtx: 8192),
            Messages: [new ChatMessage("system", system), new ChatMessage("user", user)]);

        using var response = await httpClient.PostAsJsonAsync("/api/chat", request, JsonOptions, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<ChatResponse>(JsonOptions, cancellationToken)
            ?? throw new JsonException("Leere Antwort von Ollama.");

        return JsonSerializer.Deserialize<T>(body.Message?.Content ?? string.Empty, JsonOptions)
            ?? throw new JsonException("Die Antwort von Ollama konnte nicht gelesen werden.");
    }

    /// <summary>Prueft schnell, ob Ollama laeuft und das konfigurierte Modell vorhanden ist.</summary>
    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(2));

            var tags = await httpClient.GetFromJsonAsync<TagsResponse>("/api/tags", JsonOptions, timeout.Token);
            return tags?.Models?.Any(m =>
                string.Equals(m.Name, Model, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(m.Name, $"{Model}:latest", StringComparison.OrdinalIgnoreCase)) == true;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            return false;
        }
    }

    private sealed record ChatRequest(
        string Model,
        bool Stream,
        JsonObject Format,
        ChatOptions Options,
        IReadOnlyList<ChatMessage> Messages);

    private sealed record ChatOptions(
        double Temperature,
        [property: JsonPropertyName("num_ctx")] int NumCtx);

    private sealed record ChatMessage(string Role, string Content);

    private sealed record ChatResponse(ChatMessage? Message);

    private sealed record TagsResponse(IReadOnlyList<TagModel>? Models);

    private sealed record TagModel(string Name);
}
