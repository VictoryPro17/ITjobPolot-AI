using JobPilot.Domain.Constants;
using JobPilot.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JobPilot.Infrastructure.Persistence;

/// <summary>
/// Wendet ausstehende Migrationen an und legt die Basisrollen an.
/// Es werden bewusst keine Demo-Benutzer oder Zugangsdaten erzeugt.
/// </summary>
public class DatabaseSeeder(
    JobPilotDbContext context,
    RoleManager<ApplicationRole> roleManager,
    ILogger<DatabaseSeeder> logger)
{
    public async Task MigrateAsync(CancellationToken cancellationToken = default)
    {
        var pending = (await context.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();

        if (pending.Count > 0)
        {
            logger.LogInformation(
                "Wende {Count} ausstehende Migration(en) an: {Migrations}",
                pending.Count, string.Join(", ", pending));

            await context.Database.MigrateAsync(cancellationToken);
        }
    }

    public async Task SeedRolesAsync()
    {
        foreach (var role in Roles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new ApplicationRole(role));
                logger.LogInformation("Rolle {Role} angelegt.", role);
            }
        }
    }
}