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
        // Erwartete Fachfehler sind kein Betriebsproblem und werden niedriger protokolliert.
        if (ex is NotFoundException or ForbiddenException or ConflictException or ValidationFailedException)
        {
            logger.LogInformation("Abgewiesene Anfrage {Method} {Path}: {Message}",
                context.Request.Method, context.Request.Path, ex.Message);
        }
        else
        {
            logger.LogError(ex, "Unbehandelte Ausnahme bei {Method} {Path}",
                context.Request.Method, context.Request.Path);
        }

        if (context.Response.HasStarted)
        {
            throw ex;
        }

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

        ProblemDetails problem = ex is ValidationFailedException validation
            ? new ValidationProblemDetails(validation.Errors.ToDictionary(e => e.Key, e => e.Value))
            : new ProblemDetails();

        problem.Status = (int)status;
        problem.Title = title;
        problem.Instance = context.Request.Path;

        // Fachfehler duerfen ihre Meldung zeigen; technische Details nur in der Entwicklung.
        problem.Detail = ex switch
        {
            NotFoundException or ForbiddenException or ConflictException => ex.Message,
            _ when environment.IsDevelopment() => ex.ToString(),
            _ => null
        };

        context.Response.Clear();
        context.Response.StatusCode = problem.Status.Value;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsJsonAsync(problem, problem.GetType());
    }
}