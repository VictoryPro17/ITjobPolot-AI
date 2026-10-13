using System.Text.RegularExpressions;

namespace JobPilot.Application.Matching;

/// <summary>
/// Zentrale Liste bekannter Technologien. Wird von Lebenslauf-Extraktion und
/// Match-Analyse gemeinsam genutzt, damit beide dieselben Begriffe erkennen.
/// </summary>
public static class SkillCatalog
{
    private sealed record SkillDefinition(string Name, string[] Aliases)
    {
        public IEnumerable<string> Terms => Aliases.Prepend(Name);
    }

    private static readonly SkillDefinition[] Definitions =
    [
        new("C#", []),
        new("C++", []),
        new("Python", []),
        new("Java", []),
        new("Go", ["golang"]),
        new("Rust", []),
        new("Kotlin", []),
        new("Swift", []),
        new("PHP", []),
        new(".NET", ["dotnet", ".net core", ".net framework"]),
        new("ASP.NET Core", ["asp.net", "aspnet core", "asp.net mvc"]),
        new("Entity Framework", ["ef core", "entity framework core"]),
        new("Blazor", []),
        new("Azure", []),
        new("AWS", []),
        new("Google Cloud", ["gcp"]),
        new("Docker", []),
        new("Kubernetes", ["k8s"]),
        new("Terraform", []),
        new("Git", []),
        new("GitHub Actions", []),
        new("Azure DevOps", []),
        new("Jenkins", []),
        new("Linux", []),
        new("React", []),
        new("Angular", []),
        new("Vue.js", ["vue"]),
        new("Next.js", []),
        new("Node.js", ["node"]),
        new("TypeScript", []),
        new("JavaScript", []),
        new("HTML", []),
        new("CSS", []),
        new("Tailwind CSS", ["tailwind"]),
        new("SQL", []),
        new("PostgreSQL", ["postgres"]),
        new("SQL Server", ["mssql", "sqlserver", "microsoft sql server"]),
        new("MySQL", []),
        new("MongoDB", []),
        new("Redis", []),
        new("GraphQL", []),
        new("REST", ["rest api", "restful"]),
        new("gRPC", []),
        new("Microservices", ["microservice"]),
        new("RabbitMQ", []),
        new("Kafka", ["apache kafka"]),
        new("xUnit", []),
        new("NUnit", []),
        new("Jest", []),
        new("Pytest", []),
        new("Selenium", []),
        new("Playwright", []),
        new("Scrum", []),
        new("Clean Architecture", []),
        new("Domain-Driven Design", ["ddd"])
    ];

    // "Go" ist im Fliesstext zu mehrdeutig und wird nur ueber den Alias "golang" erkannt.
    private static readonly HashSet<string> NameOnlyForCanonicalize = new(StringComparer.OrdinalIgnoreCase) { "Go" };

    private static readonly (SkillDefinition Definition, Regex[] Patterns)[] CompiledDefinitions =
        [.. Definitions.Select(d => (d, d.Terms
            .Where(term => !NameOnlyForCanonicalize.Contains(term))
            .Select(BuildPattern)
            .ToArray()))];

    /// <summary>Erkennt bekannte Technologien im Text, sortiert nach erster Fundstelle.</summary>
    public static IReadOnlyList<string> Extract(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return [];
        }

        var normalized = Regex.Replace(text.ToLowerInvariant(), @"[^a-z0-9#.+/\-\säöüß]", " ");
        var found = new List<(string Name, int Index)>();

        foreach (var (definition, patterns) in CompiledDefinitions)
        {
            var index = patterns
                .Select(pattern => pattern.Match(normalized))
                .Where(match => match.Success)
                .Select(match => match.Index)
                .DefaultIfEmpty(-1)
                .Min();

            if (index >= 0)
            {
                found.Add((definition.Name, index));
            }
        }

        return [.. found.OrderBy(f => f.Index).Select(f => f.Name)];
    }

    /// <summary>Liefert den kanonischen Namen eines Skills oder den getrimmten Originalwert.</summary>
    public static string Canonicalize(string skill)
    {
        var trimmed = skill.Trim();

        var definition = Definitions.FirstOrDefault(d =>
            d.Terms.Any(term => string.Equals(term, trimmed, StringComparison.OrdinalIgnoreCase)));

        return definition?.Name ?? trimmed;
    }

    private static Regex BuildPattern(string term)
    {
        var escaped = Regex.Escape(term.ToLowerInvariant()).Replace("\\ ", "\\s+");
        return new Regex($@"(?<![a-z0-9#+.]){escaped}(?![a-z0-9#+])", RegexOptions.Compiled);
    }
}
