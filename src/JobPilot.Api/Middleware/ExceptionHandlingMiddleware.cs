using System.Net;

using JobPilot.Application.Common;

using Microsoft.AspNetCore.Mvc;

namespace JobPilot.Api.Middleware;

/// <summary>
/// Wandelt unbehandelte Ausnahmen in ProblemDetails um. Interne Details werden
/// ausserhalb der Entwicklungsumgebung nicht an den Client weitergegeben.
/// </summary>
public class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger,
    IHostEnvironment environment)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception ex)
    {
        var (status, title) = ex switch
        {
            ValidationFailedException => (HttpStatusCode.BadRequest, "Die Eingaben sind ungültig."),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "Nicht angemeldet."),
            ForbiddenException => (HttpStatusCode.Forbidden, "Kein Zugriff auf diese Ressource."),
            NotFoundException or KeyNotFoundException => (HttpStatusCode.NotFound, "Die Ressource wurde nicht gefunden."),
            ConflictException => (HttpStatusCode.Conflict, "Der Vorgang widerspricht dem aktuellen Datenstand."),
            ArgumentException => (HttpStatusCode.BadRequest, "Die Anfrage ist ungültig."),
            OperationCanceledException => ((HttpStatusCode)499, "Die Anfrage wurde abgebrochen."),
            _ => (HttpStatusCode.InternalServerError, "Es ist ein unerwarteter Fehler aufgetreten.")
        };

        var isServerError = (int)status >= 500;

        // Erwartete Fehler (4xx) sind kein Betriebsproblem: ohne Stacktrace und niedriger protokolliert.
        if (isServerError)
        {
            logger.LogError(ex, "Unbehandelte Ausnahme bei {Method} {Path}",
                context.Request.Method, context.Request.Path);
        }
        else
        {
            logger.LogInformation("Abgewiesene Anfrage {Method} {Path} mit {StatusCode}: {Message}",
                context.Request.Method, context.Request.Path, (int)status, ex.Message);
        }

        if (context.Response.HasStarted)
        {
            throw ex;
        }

        ProblemDetails problem = ex is ValidationFailedException validation
            ? new ValidationProblemDetails(validation.Errors.ToDictionary(e => e.Key, e => e.Value))
            : new ProblemDetails();

        problem.Status = (int)status;
        problem.Title = title;
        problem.Instance = context.Request.Path;

        // Fachfehler duerfen ihre Meldung zeigen. Den Stacktrace gibt es nur in der
        // Entwicklung und nur bei echten Serverfehlern; Eingabefehler brauchen ihn nicht.
        problem.Detail = ex switch
        {
            NotFoundException or ForbiddenException or ConflictException => ex.Message,
            _ when isServerError && environment.IsDevelopment() => ex.ToString(),
            _ => null
        };

        context.Response.Clear();
        context.Response.StatusCode = problem.Status.Value;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsJsonAsync(problem, problem.GetType());
    }
}