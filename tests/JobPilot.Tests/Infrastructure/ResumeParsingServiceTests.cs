using System.Text;

using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using JobPilot.Api.Services;
using JobPilot.Application.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace JobPilot.Tests.Infrastructure;

public class ResumeParsingServiceTests
{
    [Fact]
    public async Task ExtractTextAsync_ReadsPlainTextResume()
    {
        var content = "Senior C# developer with ASP.NET Core and Azure experience.\nWorked in React and PostgreSQL projects.";
        var result = await CreateService().ExtractTextAsync(CreateFile(content, "resume.txt"), CancellationToken.None);

        Assert.Contains("C#", result, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ASP.NET Core", result, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("React", result, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ExtractTextAsync_PreservesLineBreaks()
    {
        var result = await CreateService().ExtractTextAsync(CreateFile("Max Mustermann\r\n  Entwickler   .NET \r\n\r\n\r\n\r\nProfil", "resume.txt"));

        Assert.Equal("Max Mustermann\nEntwickler .NET\n\nProfil", result);
    }

    [Fact]
    public async Task ExtractTextAsync_ReadsDocxParagraphsAsLines()
    {
        using var docx = new MemoryStream();
        using (var document = WordprocessingDocument.Create(docx, WordprocessingDocumentType.Document))
        {
            var mainPart = document.AddMainDocumentPart();
            mainPart.Document = new Document(new Body(
                new Paragraph(new Run(new Text("Max Mustermann"))),
                new Paragraph(new Run(new Text("Senior Developer")))));
        }

        var result = await CreateService().ExtractTextAsync(CreateFile(docx.ToArray(), "resume.docx"));

        Assert.Equal("Max Mustermann\nSenior Developer", result);
    }

    [Fact]
    public async Task ExtractTextAsync_RejectsPdfWithoutPdfSignature()
    {
        await Assert.ThrowsAsync<ValidationFailedException>(() =>
            CreateService().ExtractTextAsync(CreateFile("Kein PDF", "resume.pdf")));
    }

    [Fact]
    public async Task ExtractTextAsync_RejectsRtf()
    {
        await Assert.ThrowsAsync<ValidationFailedException>(() =>
            CreateService().ExtractTextAsync(CreateFile("{\\rtf1 Lebenslauf}", "resume.rtf")));
    }

    private static ResumeParsingService CreateService() =>
        new(Options.Create(new StorageOptions { MaxFileSizeInBytes = 10 * 1024 * 1024 }));

    private static FormFile CreateFile(string content, string fileName) =>
        CreateFile(Encoding.UTF8.GetBytes(content), fileName);

    private static FormFile CreateFile(byte[] content, string fileName) =>
        new(new MemoryStream(content), 0, content.Length, "file", fileName);
}
