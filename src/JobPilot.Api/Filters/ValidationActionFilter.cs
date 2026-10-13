using FluentValidation;

using JobPilot.Application.Common;

using Microsoft.AspNetCore.Mvc.Filters;

namespace JobPilot.Api.Filters;

/// <summary>
/// Vereinheitlicht die Eingabevalidierung: zuerst die Fehler der Modellbindung,
/// anschliessend die passenden FluentValidation-Validatoren der Action-Argumente.
/// Alle Fehler werden als ValidationFailedException gemeldet, damit die API
/// durchgehend dasselbe Fehlerformat liefert.
/// </summary>
public class ValidationActionFilter(IServiceProvider serviceProvider) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var errors = CollectModelStateErrors(context);

        if (errors.Count == 0)
        {
            errors = await CollectValidatorErrorsAsync(context);
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        await next();
    }

    private static Dictionary<string, string[]> CollectModelStateErrors(ActionExecutingContext context)
    {
        if (context.ModelState.IsValid)
        {
            return [];
        }

        return context.ModelState
            .Where(entry => entry.Value is { Errors.Count: > 0 })
            .ToDictionary(
                entry => string.IsNullOrEmpty(entry.Key) ? "request" : entry.Key,
                entry => entry.Value!.Errors
                    .Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage)
                        ? "Der Wert ist ungültig."
                        : error.ErrorMessage)
                    .ToArray());
    }

    private async Task<Dictionary<string, string[]>> CollectValidatorErrorsAsync(ActionExecutingContext context)
    {
        var errors = new Dictionary<string, List<string>>();

        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null)
            {
                continue;
            }

            var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());

            if (serviceProvider.GetService(validatorType) is not IValidator validator)
            {
                continue;
            }

            var validationContext = new ValidationContext<object>(argument);
            var result = await validator.ValidateAsync(validationContext, context.HttpContext.RequestAborted);

            foreach (var failure in result.Errors)
            {
                var key = string.IsNullOrEmpty(failure.PropertyName) ? "request" : failure.PropertyName;

                if (!errors.TryGetValue(key, out var messages))
                {
                    messages = [];
                    errors[key] = messages;
                }

                messages.Add(failure.ErrorMessage);
            }
        }

        return errors.ToDictionary(entry => entry.Key, entry => entry.Value.ToArray());
    }
}