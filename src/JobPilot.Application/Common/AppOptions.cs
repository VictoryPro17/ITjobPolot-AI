namespace JobPilot.Application.Common;

/// <summary>Allgemeine Anwendungseinstellungen aus der Konfiguration.</summary>
public class AppOptions
{
    public const string SectionName = "App";

    /// <summary>Fuer CORS freigegebene Frontend-Urls.</summary>
    public string[] CorsOrigins { get; set; } = [];
}

/// <summary>Einstellungen fuer den Dateiupload.</summary>
public class StorageOptions
{
    public const string SectionName = "Storage";

    /// <summary>Wurzelverzeichnis fuer hochgeladene Dateien, relativ oder absolut.</summary>
    public string UploadRoot { get; set; } = "uploads";

    public long MaxFileSizeInBytes { get; set; } = 10 * 1024 * 1024;

    public string[] AllowedContentTypes { get; set; } = ["application/pdf"];

    public string[] AllowedExtensions { get; set; } = [".pdf"];

    /// <summary>Obergrenze der Dokumente je Benutzer (Schutz vor Speichermissbrauch).</summary>
    public int MaxDocumentsPerUser { get; set; } = 100;
}

/// <summary>
/// Einstellungen der KI-Anbindung. Secrets werden ausschliesslich ueber
/// User Secrets bzw. Umgebungsvariablen gesetzt, niemals im Repository.
/// </summary>
public class AiOptions
{
    public const string SectionName = "Ai";

    /// <summary>Schaltet externe bzw. lokale KI-Anbieter frei. Die regelbasierte Analyse ist immer verfuegbar.</summary>
    public bool Enabled { get; set; }

    /// <summary>"ollama" (lokal, kostenlos); "openai" und "anthropic" sind vorbereitet.</summary>
    public string Provider { get; set; } = "openai";

    public string? ApiKey { get; set; }

    public string? Model { get; set; }

    /// <summary>Basisadresse des Anbieters, fuer Ollama z. B. http://localhost:11434.</summary>
    public string BaseUrl { get; set; } = "http://localhost:11434";

    /// <summary>Maximale Dauer eines KI-Aufrufs; danach greift die regelbasierte Analyse.</summary>
    public int TimeoutSeconds { get; set; } = 120;

    /// <summary>Obergrenze der KI-Aufrufe pro Benutzer und Tag (Kostenkontrolle).</summary>
    public int DailyRequestLimitPerUser { get; set; } = 25;
}
