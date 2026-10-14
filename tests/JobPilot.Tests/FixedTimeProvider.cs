namespace JobPilot.Tests;

/// <summary>Uhr mit festem Zeitpunkt fuer reproduzierbare Tests.</summary>
public sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => now;
}
