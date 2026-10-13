namespace JobPilot.Application.JobApplications;

/// <summary>Bewerbungsstatistik fuer einen einzelnen Monat.</summary>
public record MonthlyStatDto(int Year, int Month, int Applied, int Interviews, int Offers, int Accepted, int Rejected);

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
    IReadOnlyList<MonthlyStatDto> MonthlyData);