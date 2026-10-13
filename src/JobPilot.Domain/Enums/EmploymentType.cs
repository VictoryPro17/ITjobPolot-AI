namespace JobPilot.Domain.Enums;

/// <summary>Beschaeftigungsart einer Stelle.</summary>
public enum EmploymentType
{
    Unspecified = 0,
    FullTime = 1,
    PartTime = 2,
    Internship = 3,
    WorkingStudent = 4,
    Apprenticeship = 5,
    Freelance = 6,
    TemporaryContract = 7
}