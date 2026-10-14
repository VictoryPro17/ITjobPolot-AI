using System.Text;

using JobPilot.Application.Common;

namespace JobPilot.Tests.Application;

public class FileSignatureTests
{
    [Theory]
    [InlineData(".pdf", new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D })]
    [InlineData(".docx", new byte[] { 0x50, 0x4B, 0x03, 0x04 })]
    [InlineData(".png", new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D })]
    [InlineData(".jpg", new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 })]
    [InlineData(".JPEG", new byte[] { 0xFF, 0xD8, 0xFF, 0xE1 })]
    public void Matches_AcceptsGenuineSignatures(string extension, byte[] content)
    {
        Assert.True(FileSignature.Matches(content, extension));
    }

    [Theory]
    [InlineData(".pdf")]
    [InlineData(".docx")]
    [InlineData(".png")]
    [InlineData(".jpg")]
    public void Matches_RejectsTextDisguisedAsBinaryFormat(string extension)
    {
        Assert.False(FileSignature.Matches(Encoding.UTF8.GetBytes("Nur Text"), extension));
    }

    [Fact]
    public void Matches_RejectsTextFilesContainingNullBytes()
    {
        Assert.True(FileSignature.Matches(Encoding.UTF8.GetBytes("Lebenslauf"), ".md"));
        Assert.False(FileSignature.Matches([0x4D, 0x5A, 0x00, 0x00], ".txt"));
    }

    [Fact]
    public void Matches_RejectsUnknownExtensions()
    {
        Assert.False(FileSignature.Matches([0x4D, 0x5A], ".exe"));
    }
}
