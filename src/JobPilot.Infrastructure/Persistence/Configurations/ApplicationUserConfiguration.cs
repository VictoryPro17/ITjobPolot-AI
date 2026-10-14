using JobPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobPilot.Infrastructure.Persistence.Configurations;

public class ApplicationUserConfiguration : IEntityTypeConfiguration<ApplicationUser>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> builder)
    {
        builder.Property(u => u.FirstName).HasMaxLength(100);
        builder.Property(u => u.LastName).HasMaxLength(100);
        builder.Property(u => u.TargetJobTitle).HasMaxLength(200);
        builder.Property(u => u.Location).HasMaxLength(200);
        builder.Property(u => u.ProfileSummary).HasMaxLength(2000);
        builder.Property(u => u.ExperienceSummary).HasMaxLength(2000);
        builder.Property(u => u.EducationSummary).HasMaxLength(2000);
        builder.Property(u => u.Skills)
            .HasColumnType("text[]")
            .HasDefaultValueSql("ARRAY[]::text[]");
        builder.Property(u => u.ResumeText).HasColumnType("text");
        builder.Property(u => u.AvatarStoragePath).HasMaxLength(500);
        builder.Property(u => u.ThemePreference).HasMaxLength(20).HasDefaultValue("system");

        builder.Ignore(u => u.DisplayName);
    }
}
