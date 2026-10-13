using JobPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobPilot.Infrastructure.Persistence.Configurations;

public class GeneratedCoverLetterConfiguration : IEntityTypeConfiguration<GeneratedCoverLetter>
{
    public void Configure(EntityTypeBuilder<GeneratedCoverLetter> builder)
    {
        builder.ToTable("GeneratedCoverLetters");

        builder.Property(c => c.Title).HasMaxLength(200).IsRequired();
        builder.Property(c => c.Content).HasMaxLength(20000).IsRequired();
        builder.Property(c => c.CompanyName).HasMaxLength(200);
        builder.Property(c => c.JobTitle).HasMaxLength(200);
        builder.Property(c => c.Provider).HasMaxLength(50);
        builder.Property(c => c.Model).HasMaxLength(100);
        builder.Property(c => c.Style).HasConversion<string>().HasMaxLength(30);

        builder.HasOne(c => c.User)
            .WithMany(u => u.CoverLetters)
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.JobApplication)
            .WithMany(a => a.CoverLetters)
            .HasForeignKey(c => c.JobApplicationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(c => new { c.UserId, c.CreatedAt });
    }
}
