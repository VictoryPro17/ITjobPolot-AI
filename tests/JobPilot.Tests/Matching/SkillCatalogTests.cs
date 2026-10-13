using JobPilot.Application.Matching;

namespace JobPilot.Tests.Matching;

public class SkillCatalogTests
{
    [Fact]
    public void Extract_DoesNotFindJavaInsideJavaScript()
    {
        var result = SkillCatalog.Extract("Erfahrung mit JavaScript und TypeScript.");

        Assert.Contains("JavaScript", result);
        Assert.DoesNotContain("Java", result);
    }

    [Fact]
    public void Extract_DoesNotFindSqlInsidePostgreSql()
    {
        var result = SkillCatalog.Extract("Datenbanken: PostgreSQL");

        Assert.Equal(["PostgreSQL"], result);
    }

    [Fact]
    public void Extract_DoesNotFindDotNetInsideAspNetCore()
    {
        var result = SkillCatalog.Extract("Web-APIs mit ASP.NET Core.");

        Assert.Equal(["ASP.NET Core"], result);
    }

    [Fact]
    public void Extract_MapsAliasToCanonicalName()
    {
        var result = SkillCatalog.Extract("Wir nutzen postgres und k8s.");

        Assert.Equal(["PostgreSQL", "Kubernetes"], result);
    }

    [Fact]
    public void Extract_OrdersByFirstOccurrence()
    {
        var result = SkillCatalog.Extract("React, danach Docker, zuletzt C#.");

        Assert.Equal(["React", "Docker", "C#"], result);
    }

    [Fact]
    public void Canonicalize_ReturnsCanonicalNameOrTrimmedInput()
    {
        Assert.Equal(".NET", SkillCatalog.Canonicalize("dotnet"));
        Assert.Equal("Unbekannt", SkillCatalog.Canonicalize("  Unbekannt "));
    }
}
