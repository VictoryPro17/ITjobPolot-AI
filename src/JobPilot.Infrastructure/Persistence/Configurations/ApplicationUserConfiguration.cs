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
        builder.Property(u => u.ThemePreference).HasMaxLength(20).HasDefaultValue("system");

        builder.Ignore(u => u.DisplayName);
    }
}
