using System.Text;
using System.Text.RegularExpressions;

using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using JobPilot.Application.Common;
using Microsoft.Extensions.Options;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace JobPilot.Api.Services;

public class ResumeParsingService(IOptions<StorageOptions> storageOptions)
{
    private readonly StorageOptions _storageOptions = storageOptions.Value;

    public async Task<string> ExtractTextAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return string.Empty;
        }

        if (file.Length > _storageOptions.MaxFileSizeInBytes)
        {
            throw new ValidationFailedException("file", $"Die Datei ist größer als das erlaubte Limit von {_storageOptions.MaxFileSizeInBytes} Bytes.");
        }

        using var buffer = new MemoryStream();
        await file.CopyToAsync(buffer, cancellationToken);

        return ExtractText(buffer.ToArray(), file.FileName);
    }

    /// <summary>Extrahiert Text aus bereits eingelesenem Dateiinhalt.</summary>
    public string ExtractText(byte[] content, string fileName)
    {
        if (content.Length == 0)
        {
            return string.Empty;
        }

        if (content.Length > _storageOptions.MaxFileSizeInBytes)
        {
            throw new ValidationFailedException("file", $"Die Datei ist größer als das erlaubte Limit von {_storageOptions.MaxFileSizeInBytes} Bytes.");
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (extension is not (".pdf" or ".docx" or ".txt" or ".md"))
        {
            throw new ValidationFailedException("file", "Dieses Dateiformat wird für Lebensläufe nicht unterstützt.");
        }

        if (!FileSignature.Matches(content, extension))
        {
            throw new ValidationFailedException("file", "Der Dateiinhalt passt nicht zur Dateiendung.");
        }

        using var stream = new MemoryStream(content, writable: false);

        var text = extension switch
        {
            ".pdf" => ReadSafely(() => ReadPdfText(stream)),
            ".docx" => ReadSafely(() => ReadDocxText(stream)),
            _ => ReadPlainText(stream)
        };

        return NormalizeText(text);
    }

    private static string ReadSafely(Func<string> read)
    {
        try
        {
            return read();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new ValidationFailedException("file", "Die Datei ist beschädigt oder konnte nicht gelesen werden.");
        }
    }

    private static string ReadPlainText(Stream stream)
    {
        stream.Position = 0;
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
        return reader.ReadToEnd();
    }

    private static string ReadDocxText(Stream stream)
    {
        stream.Position = 0;
        using var document = WordprocessingDocument.Open(stream, false);
        var body = document.MainDocumentPart?.Document?.Body;

        return body is null
            ? string.Empty
            : string.Join('\n', body.Descendants<Paragraph>().Select(paragraph => paragraph.InnerText));
    }

    private static string ReadPdfText(Stream stream)
    {
        stream.Position = 0;
        using var document = PdfDocument.Open(stream);

        return string.Join('\n', document.GetPages().Select(page => ContentOrderTextExtractor.GetText(page)));
    }

    private static string NormalizeText(string input)
    {
        var normalized = Regex.Replace(input, @"\r\n?", "\n");
        normalized = Regex.Replace(normalized, @"[ \t\f\v ]+", " ");
        normalized = string.Join('\n', normalized.Split('\n').Select(line => line.Trim()));
        normalized = Regex.Replace(normalized, @"\n{3,}", "\n\n");
        return normalized.Trim();
    }
}
