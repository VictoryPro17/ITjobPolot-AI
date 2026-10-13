using JobPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobPilot.Infrastructure.Persistence.Configurations;

public class CompanyConfiguration : IEntityTypeConfiguration<Company>
{
    public void Configure(EntityTypeBuilder<Company> builder)
    {
        builder.ToTable("Companies");

        builder.Property(c => c.Name).HasMaxLength(200).IsRequired();
        builder.Property(c => c.Website).HasMaxLength(500);
        builder.Property(c => c.Industry).HasMaxLength(150);
        builder.Property(c => c.Location).HasMaxLength(200);
        builder.Property(c => c.Notes).HasMaxLength(4000);

        builder.HasOne(c => c.User)
            .WithMany(u => u.Companies)
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Firmennamen sind nur innerhalb eines Benutzerkontos eindeutig.
        builder.HasIndex(c => new { c.UserId, c.Name }).IsUnique();
    }
}
