using JobPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobPilot.Infrastructure.Persistence.Configurations;

public class JobApplicationConfiguration : IEntityTypeConfiguration<JobApplication>
{
    public void Configure(EntityTypeBuilder<JobApplication> builder)
    {
        builder.ToTable("JobApplications");

        builder.Property(a => a.CompanyName).HasMaxLength(200).IsRequired();
        builder.Property(a => a.JobTitle).HasMaxLength(200).IsRequired();
        builder.Property(a => a.Location).HasMaxLength(200);
        builder.Property(a => a.Salary).HasMaxLength(100);
        builder.Property(a => a.JobPostingUrl).HasMaxLength(1000);
        builder.Property(a => a.JobDescription).HasMaxLength(20000);
        builder.Property(a => a.Notes).HasMaxLength(8000);
        builder.Property(a => a.ContactName).HasMaxLength(150);
        builder.Property(a => a.ContactEmail).HasMaxLength(256);
        builder.Property(a => a.ContactPhone).HasMaxLength(50);
        builder.Property(a => a.InterviewLocation).HasMaxLength(300);

        // PostgreSQL bildet List<string> nativ als text[] ab – kein JSON-Umweg noetig.
        builder.Property(a => a.Technologies).HasColumnType("text[]");

        builder.Property(a => a.Status).HasConversion<string>().HasMaxLength(30);
        builder.Property(a => a.EmploymentType).HasConversion<string>().HasMaxLength(30);
        builder.Property(a => a.WorkModel).HasConversion<string>().HasMaxLength(30);

        builder.Ignore(a => a.IsOpen);

        builder.HasOne(a => a.User)
            .WithMany(u => u.JobApplications)
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Firma darf geloescht werden, ohne die Bewerbungshistorie zu verlieren.
        builder.HasOne(a => a.Company)
            .WithMany(c => c.JobApplications)
            .HasForeignKey(a => a.CompanyId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(a => a.UserId);
        builder.HasIndex(a => new { a.UserId, a.Status });
        builder.HasIndex(a => new { a.UserId, a.AppliedOn });
        builder.HasIndex(a => new { a.UserId, a.CreatedAt });
    }
}
