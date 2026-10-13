using JobPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JobPilot.Infrastructure.Persistence.Configurations;

public class AiAnalysisConfiguration : IEntityTypeConfiguration<AiAnalysis>
{
    public void Configure(EntityTypeBuilder<AiAnalysis> builder)
    {
        builder.ToTable("AiAnalyses");

        builder.Property(a => a.JobDescription).HasMaxLength(20000).IsRequired();
        builder.Property(a => a.Summary).HasMaxLength(4000);
        builder.Property(a => a.Provider).HasMaxLength(50);
        builder.Property(a => a.Model).HasMaxLength(100);

        builder.Property(a => a.RequiredSkills).HasColumnType("text[]");
        builder.Property(a => a.MatchedSkills).HasColumnType("text[]");
        builder.Property(a => a.MissingSkills).HasColumnType("text[]");
        builder.Property(a => a.Recommendations).HasColumnType("text[]");
        builder.Property(a => a.SuggestedLearningTopics).HasColumnType("text[]");

        // Orientierungswert, bewusst hart auf 0..100 begrenzt.
        builder.ToTable(t => t.HasCheckConstraint(
            "CK_AiAnalyses_MatchScore_Range",
            "\"MatchScore\" >= 0 AND \"MatchScore\" <= 100"));

        builder.HasOne(a => a.User)
            .WithMany(u => u.AiAnalyses)
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(a => a.JobApplication)
            .WithMany(j => j.AiAnalyses)
            .HasForeignKey(a => a.JobApplicationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(a => a.ResumeDocument)
            .WithMany()
            .HasForeignKey(a => a.ResumeDocumentId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(a => new { a.UserId, a.CreatedAt });
    }
}
