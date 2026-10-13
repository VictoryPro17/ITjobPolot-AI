using System.Reflection;
using JobPilot.Domain.Common;
using JobPilot.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace JobPilot.Infrastructure.Persistence;

/// <summary>
/// Zentraler EF-Core-Kontext. Erbt von <see cref="IdentityDbContext{TUser,TRole,TKey}"/>,
/// damit Benutzerverwaltung und Fachdaten in einer Datenbank und einer Transaktion liegen.
/// Ein zusaetzliches Repository-Pattern waere redundant, da der DbContext bereits
/// Unit-of-Work und Repository bereitstellt.
/// </summary>
public class JobPilotDbContext(DbContextOptions<JobPilotDbContext> options)
    : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>(options)
{
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();

    public DbSet<Company> Companies => Set<Company>();

    public DbSet<ApplicationNote> ApplicationNotes => Set<ApplicationNote>();

    public DbSet<ApplicationStatusHistory> ApplicationStatusHistories => Set<ApplicationStatusHistory>();

    public DbSet<UserDocument> UserDocuments => Set<UserDocument>();

    public DbSet<Reminder> Reminders => Set<Reminder>();

    public DbSet<AiAnalysis> AiAnalyses => Set<AiAnalysis>();

    public DbSet<GeneratedCoverLetter> GeneratedCoverLetters => Set<GeneratedCoverLetter>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        ApplyAuditTimestamps();
        return base.SaveChanges();
    }

    /// <summary>Pflegt CreatedAt/UpdatedAt zentral, damit kein Service das vergessen kann.</summary>
    private void ApplyAuditTimestamps()
    {
        var now = DateTimeOffset.UtcNow;

        foreach (var entry in ChangeTracker.Entries<EntityBase>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Property(e => e.CreatedAt).IsModified = false;
                entry.Entity.UpdatedAt = now;
            }
        }

        foreach (var entry in ChangeTracker.Entries<ApplicationUser>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Property(e => e.CreatedAt).IsModified = false;
                entry.Entity.UpdatedAt = now;
            }
        }
    }
}
