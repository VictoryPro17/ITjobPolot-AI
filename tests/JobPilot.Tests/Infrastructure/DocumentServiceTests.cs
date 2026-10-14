using System.Text;

using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;
using JobPilot.Domain.Entities;
using JobPilot.Domain.Enums;
using JobPilot.Infrastructure.Persistence;
using JobPilot.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace JobPilot.Tests.Infrastructure;

public class DocumentServiceTests
{
    private static readonly byte[] PdfContent = Encoding.ASCII.GetBytes("%PDF-1.7 Testinhalt");

    [Fact]
    public async Task Upload_StoresFileAndReturnsMetadata()
    {
        await using var context = CreateContext();
        var storage = new InMemoryFileStorage();
        var service = CreateService(context, Guid.CreateVersion7(), storage);

        var document = await service.UploadAsync(PdfContent, "../../Zeugnis.pdf", DocumentType.Reference, null);

        Assert.Equal("Zeugnis.pdf", document.FileName);
        Assert.Equal("application/pdf", document.ContentType);
        Assert.Equal(DocumentType.Reference, document.DocumentType);
        Assert.Single(storage.Files);
    }

    [Fact]
    public async Task Upload_RejectsContentNotMatchingExtension()
    {
        await using var context = CreateContext();
        var storage = new InMemoryFileStorage();
        var service = CreateService(context, Guid.CreateVersion7(), storage);

        await Assert.ThrowsAsync<ValidationFailedException>(() =>
            service.UploadAsync(Encoding.UTF8.GetBytes("kein pdf"), "fake.pdf", DocumentType.Other, null));

        Assert.Empty(storage.Files);
    }

    [Fact]
    public async Task Upload_RejectsDuplicateFile()
    {
        await using var context = CreateContext();
        var service = CreateService(context, Guid.CreateVersion7(), new InMemoryFileStorage());

        await service.UploadAsync(PdfContent, "a.pdf", DocumentType.Other, null);

        await Assert.ThrowsAsync<ConflictException>(() =>
            service.UploadAsync(PdfContent, "b.pdf", DocumentType.Other, null));
    }

    [Fact]
    public async Task Upload_EnforcesDocumentQuota()
    {
        await using var context = CreateContext();
        var service = CreateService(context, Guid.CreateVersion7(), new InMemoryFileStorage(), maxDocuments: 1);

        await service.UploadAsync(PdfContent, "a.pdf", DocumentType.Other, null);

        await Assert.ThrowsAsync<ValidationFailedException>(() =>
            service.UploadAsync(Encoding.ASCII.GetBytes("%PDF anderer Inhalt"), "b.pdf", DocumentType.Other, null));
    }

    [Fact]
    public async Task Upload_RejectsForeignJobApplication()
    {
        await using var context = CreateContext();
        var foreignApplication = new JobApplication { UserId = Guid.CreateVersion7(), CompanyName = "Fremd", JobTitle = "Dev" };
        context.JobApplications.Add(foreignApplication);
        await context.SaveChangesAsync();

        var service = CreateService(context, Guid.CreateVersion7(), new InMemoryFileStorage());

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.UploadAsync(PdfContent, "a.pdf", DocumentType.Other, foreignApplication.Id));
    }

    [Fact]
    public async Task OtherUsersCannotSeeOrDeleteDocument()
    {
        await using var context = CreateContext();
        var storage = new InMemoryFileStorage();
        var owner = Guid.CreateVersion7();
        var document = await CreateService(context, owner, storage).UploadAsync(PdfContent, "a.pdf", DocumentType.Other, null);

        var intruder = CreateService(context, Guid.CreateVersion7(), storage);

        Assert.Empty(await intruder.GetAllAsync(null, null));
        await Assert.ThrowsAsync<NotFoundException>(() => intruder.DeleteAsync(document.Id));
        await Assert.ThrowsAsync<NotFoundException>(() => intruder.OpenAsync(document.Id));
        Assert.Single(storage.Files);
    }

    [Fact]
    public async Task Delete_RemovesRowAndFile()
    {
        await using var context = CreateContext();
        var storage = new InMemoryFileStorage();
        var service = CreateService(context, Guid.CreateVersion7(), storage);
        var document = await service.UploadAsync(PdfContent, "a.pdf", DocumentType.Other, null);

        await service.DeleteAsync(document.Id);

        Assert.Empty(await service.GetAllAsync(null, null));
        Assert.Empty(storage.Files);
    }

    private static JobPilotDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<JobPilotDbContext>()
            .UseInMemoryDatabase(Guid.CreateVersion7().ToString())
            .Options);

    private static DocumentService CreateService(JobPilotDbContext context, Guid userId, IFileStorage storage, int maxDocuments = 100) =>
        new(
            context,
            new TestCurrentUser(userId),
            storage,
            Options.Create(new StorageOptions
            {
                MaxFileSizeInBytes = 1024 * 1024,
                AllowedExtensions = [".pdf", ".docx", ".txt", ".md", ".png", ".jpg", ".jpeg"],
                MaxDocumentsPerUser = maxDocuments
            }),
            NullLogger<DocumentService>.Instance);

    private sealed class InMemoryFileStorage : IFileStorage
    {
        public Dictionary<string, byte[]> Files { get; } = [];

        public Task<string> SaveAsync(byte[] content, string extension, CancellationToken cancellationToken = default)
        {
            var path = $"uploads/{Guid.CreateVersion7():N}{extension}";
            Files[path] = content;
            return Task.FromResult(path);
        }

        public Stream OpenRead(string storagePath) => new MemoryStream(Files[storagePath]);

        public void Delete(string storagePath) => Files.Remove(storagePath);
    }

    private sealed class TestCurrentUser(Guid userId) : ICurrentUser
    {
        public Guid? UserId => userId;
        public string? Email => "test@example.com";
        public bool IsAuthenticated => true;
        public Guid RequireUserId() => userId;
    }
}
