using JobPilot.Application.Abstractions;
using JobPilot.Infrastructure.Persistence;
using JobPilot.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace JobPilot.Infrastructure;

/// <summary>
/// Registriert die Persistenzschicht. Die Identity-Dienste werden bewusst in der
/// API-Schicht konfiguriert, da SignInManager und Cookies ASP.NET-Core-Belange
/// sind und die Infrastruktur nicht vom Webframework abhaengen soll.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException(
                "Es ist kein Verbindungsstring 'ConnectionStrings:Default' konfiguriert.");

        services.AddDbContext<JobPilotDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsql =>
            {
                npgsql.MigrationsAssembly(typeof(JobPilotDbContext).Assembly.FullName);
                npgsql.EnableRetryOnFailure(3);
            });
        });

        services.AddScoped<DatabaseSeeder>();
        services.AddScoped<IJobApplicationService, JobApplicationService>();
        services.AddScoped<IAiService, AiService>();
        services.AddScoped<IResumeProfileExtractor, HeuristicResumeProfileExtractor>();
        services.AddScoped<IJobMatchAnalyzer, HeuristicJobMatchAnalyzer>();
        services.TryAddSingleton(TimeProvider.System);

        return services;
    }
}