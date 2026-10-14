using JobPilot.Domain.Enums;

namespace JobPilot.Application.JobApplications;

/// <summary>Bewerbungsstatistik fuer einen einzelnen Monat.</summary>
public record MonthlyStatDto(int Year, int Month, int Applied, int Interviews, int Offers, int Accepted, int Rejected);

/// <summary>Anzahl Bewerbungen je aktuellem Status.</summary>
public record StatusCountDto(ApplicationStatus Status, int Count);

/// <summary>Anzahl Bewerbungen in der Woche ab <see cref="WeekStart"/> (Montag).</summary>
public record WeeklyStatDto(DateOnly WeekStart, int Applied);

/// <summary>Gesamtstatistik ueber alle Bewerbungen eines Benutzers.</summary>
public record StatisticsDto(
    int TotalApplications,
    int TotalInterviews,
    int TotalOffers,
    int TotalAccepted,
    int TotalRejected,
    double InterviewRate,
    double OfferRate,
    double AcceptanceRate,
    IReadOnlyList<MonthlyStatDto> MonthlyData,
    IReadOnlyList<StatusCountDto> StatusDistribution,
    double? AverageDaysToResponse,
    double? AverageMatchScore,
    int ApplicationsLast30Days,
    IReadOnlyList<WeeklyStatDto> WeeklyActivity);