using JobPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobPilot.Infrastructure.Persistence.Configurations;

public class ApplicationNoteConfiguration : IEntityTypeConfiguration<ApplicationNote>
{
    public void Configure(EntityTypeBuilder<ApplicationNote> builder)
    {
        builder.ToTable("ApplicationNotes");

        builder.Property(n => n.Content).HasMaxLength(8000).IsRequired();

        builder.HasOne(n => n.JobApplication)
            .WithMany(a => a.ApplicationNotes)
            .HasForeignKey(n => n.JobApplicationId)
            .OnDelete(DeleteBehavior.Cascade);

        // Kein zweiter Cascade-Pfad: Notizen verschwinden ueber die Bewerbung.
        builder.HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(n => new { n.JobApplicationId, n.CreatedAt });
        builder.HasIndex(n => n.UserId);
    }
}
