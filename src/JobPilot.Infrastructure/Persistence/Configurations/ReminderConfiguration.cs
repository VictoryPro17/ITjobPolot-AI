using JobPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobPilot.Infrastructure.Persistence.Configurations;

public class ReminderConfiguration : IEntityTypeConfiguration<Reminder>
{
    public void Configure(EntityTypeBuilder<Reminder> builder)
    {
        builder.ToTable("Reminders");

        builder.Property(r => r.Title).HasMaxLength(200).IsRequired();
        builder.Property(r => r.Description).HasMaxLength(4000);
        builder.Property(r => r.ReminderType).HasConversion<string>().HasMaxLength(30);

        builder.Ignore(r => r.IsOverdue);

        builder.HasOne(r => r.User)
            .WithMany(u => u.Reminders)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.JobApplication)
            .WithMany(a => a.Reminders)
            .HasForeignKey(r => r.JobApplicationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(r => new { r.UserId, r.DueAt });
        builder.HasIndex(r => new { r.UserId, r.IsCompleted });
    }
}
