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
}

/// <summary>
/// Einstellungen der KI-Anbindung. Secrets werden ausschliesslich ueber
/// User Secrets bzw. Umgebungsvariablen gesetzt, niemals im Repository.
/// </summary>
public class AiOptions
{
    public const string SectionName = "Ai";

    /// <summary>KI-Funktionen sind optional und im MVP standardmaessig deaktiviert.</summary>
    public bool Enabled { get; set; }

    /// <summary>"openai" oder "anthropic".</summary>
    public string Provider { get; set; } = "openai";

    public string? ApiKey { get; set; }

    public string? Model { get; set; }

    /// <summary>Obergrenze der KI-Aufrufe pro Benutzer und Tag (Kostenkontrolle).</summary>
    public int DailyRequestLimitPerUser { get; set; } = 25;
}
