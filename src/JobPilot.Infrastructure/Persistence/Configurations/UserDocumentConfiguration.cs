using JobPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobPilot.Infrastructure.Persistence.Configurations;

public class UserDocumentConfiguration : IEntityTypeConfiguration<UserDocument>
{
    public void Configure(EntityTypeBuilder<UserDocument> builder)
    {
        builder.ToTable("UserDocuments");

        builder.Property(d => d.FileName).HasMaxLength(255).IsRequired();
        builder.Property(d => d.StoragePath).HasMaxLength(500).IsRequired();
        builder.Property(d => d.ContentType).HasMaxLength(150).IsRequired();
        builder.Property(d => d.Sha256).HasMaxLength(64);
        builder.Property(d => d.DocumentType).HasConversion<string>().HasMaxLength(30);

        builder.HasOne(d => d.User)
            .WithMany(u => u.Documents)
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Dokument ueberlebt das Loeschen der zugeordneten Bewerbung.
        builder.HasOne(d => d.JobApplication)
            .WithMany()
            .HasForeignKey(d => d.JobApplicationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(d => new { d.UserId, d.DocumentType });
        builder.HasIndex(d => new { d.UserId, d.Sha256 });
    }
}
