using System.Text;

using JobPilot.Application.Abstractions;
using JobPilot.Application.Common;
using JobPilot.Domain.Entities;
using JobPilot.Infrastructure.Persistence;
using JobPilot.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace JobPilot.Tests.Infrastructure;

public class AvatarServiceTests
{
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3];
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 4, 5, 6];

    [Fact]
    public async Task Upload_StoresFileAndSetsVersion()
    {
        var (context, storage, service, userId) = await CreateAsync();

        await service.UploadAsync(Png, "bild.png");

        var user = await context.Users.SingleAsync(u => u.Id == userId);
        Assert.NotNull(user.AvatarStoragePath);
        Assert.NotNull(user.AvatarUpdatedAt);
        Assert.Equal(Png, storage.Files[user.AvatarStoragePath]);
    }

    [Fact]
    public async Task Upload_ReplacesAndDeletesPreviousFile()
    {
        var (context, storage, service, userId) = await CreateAsync();

        await service.UploadAsync(Png, "alt.png");
        var oldPath = (await context.Users.SingleAsync(u => u.Id == userId)).AvatarStoragePath!;

        await service.UploadAsync(Jpeg, "neu.jpg");

        Assert.False(storage.Files.ContainsKey(oldPath));
        Assert.Single(storage.Files);
        var opened = await service.OpenAsync();
        Assert.Equal("image/jpeg", opened!.Value.ContentType);
    }

    [Theory]
    [InlineData("bild.png", false)] // Textinhalt mit Bild-Endung
    [InlineData("bild.gif", true)]   // nicht erlaubtes Format
    public async Task Upload_RejectsInvalidFiles(string fileName, bool genuinePng)
    {
        var (_, storage, service, _) = await CreateAsync();
        var content = genuinePng ? Png : Encoding.UTF8.GetBytes("kein Bild");

        await Assert.ThrowsAsync<ValidationFailedException>(() => service.UploadAsync(content, fileName));
        Assert.Empty(storage.Files);
    }

    [Fact]
    public async Task Upload_RejectsFilesLargerThanTwoMegabytes()
    {
        var (_, _, service, _) = await CreateAsync();
        var tooLarge = new byte[AvatarService.MaxSizeInBytes + 1];
        Png.CopyTo(tooLarge, 0);

        await Assert.ThrowsAsync<ValidationFailedException>(() => service.UploadAsync(tooLarge, "gross.png"));
    }

    [Fact]
    public async Task Delete_RemovesFileAndPath()
    {
        var (context, storage, service, userId) = await CreateAsync();
        await service.UploadAsync(Png, "bild.png");

        await service.DeleteAsync();

        Assert.Null((await context.Users.SingleAsync(u => u.Id == userId)).AvatarStoragePath);
        Assert.Empty(storage.Files);
        Assert.Null(await service.OpenAsync());
    }

    private static async Task<(JobPilotDbContext Context, InMemoryFileStorage Storage, AvatarService Service, Guid UserId)> CreateAsync()
    {
        var context = new JobPilotDbContext(new DbContextOptionsBuilder<JobPilotDbContext>()
            .UseInMemoryDatabase(Guid.CreateVersion7().ToString())
            .Options);
        var userId = Guid.CreateVersion7();
        context.Users.Add(new ApplicationUser { Id = userId, UserName = "avatar@example.com", Email = "avatar@example.com" });
        await context.SaveChangesAsync();

        var storage = new InMemoryFileStorage();
        var service = new AvatarService(context, new TestCurrentUser(userId), storage, TimeProvider.System, NullLogger<AvatarService>.Instance);
        return (context, storage, service, userId);
    }

    private sealed class InMemoryFileStorage : IFileStorage
    {
        public Dictionary<string, byte[]> Files { get; } = [];

        public Task<string> SaveAsync(byte[] content, string extension, CancellationToken cancellationToken = default)
        {
            var path = $"uploads/{Guid.CreateVersion7():N}{extension}";
            Files[path] = content;
            return Task.FromResult(path);
        }

        public Stream OpenRead(string storagePath) =>
            Files.TryGetValue(storagePath, out var content) ? new MemoryStream(content) : throw new FileNotFoundException();

        public void Delete(string storagePath) => Files.Remove(storagePath);
    }

    private sealed class TestCurrentUser(Guid userId) : ICurrentUser
    {
        public Guid? UserId => userId;
        public string? Email => "avatar@example.com";
        public bool IsAuthenticated => true;
        public Guid RequireUserId() => userId;
    }
}
