namespace JobPilot.Application.Common;

/// <summary>
/// Prueft, ob der Dateiinhalt zur Dateiendung passt. Schuetzt davor, dass etwa
/// eine ausfuehrbare Datei mit umbenannter Endung als PDF abgelegt wird.
/// </summary>
public static class FileSignature
{
    private const int TextProbeLength = 8 * 1024;

    private static readonly byte[] Pdf = "%PDF"u8.ToArray();
    private static readonly byte[] Zip = "PK"u8.ToArray();
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47];
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF];

    public static bool Matches(ReadOnlySpan<byte> content, string extension) =>
        extension.ToLowerInvariant() switch
        {
            ".pdf" => content.StartsWith(Pdf),
            ".docx" => content.StartsWith(Zip),
            ".png" => content.StartsWith(Png),
            ".jpg" or ".jpeg" => content.StartsWith(Jpeg),
            ".txt" or ".md" => !content[..Math.Min(content.Length, TextProbeLength)].Contains((byte)0),
            _ => false
        };

    /// <summary>Content-Type anhand der Endung; Angaben des Clients werden bewusst ignoriert.</summary>
    public static string ContentTypeFor(string extension) =>
        extension.ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".txt" => "text/plain",
            ".md" => "text/markdown",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };
}
