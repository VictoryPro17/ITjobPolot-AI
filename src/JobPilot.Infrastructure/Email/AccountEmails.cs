using System.Buffers.Text;
using System.Net;
using System.Text;

using JobPilot.Application.Abstractions;

namespace JobPilot.Infrastructure.Email;

/// <summary>Vorlagen und Links fuer die Konto-E-Mails (Bestaetigung, Passwort zuruecksetzen).</summary>
public static class AccountEmails
{
    public const string ConfirmEmailPath = "/email-bestaetigen";
    public const string ResetPasswordPath = "/passwort-zuruecksetzen";

    /// <summary>Identity-Tokens enthalten "+", "/" und "="; fuer Links werden sie URL-sicher kodiert.</summary>
    public static string EncodeToken(string token) => Base64Url.EncodeToString(Encoding.UTF8.GetBytes(token));

    /// <summary>Gegenstueck zu <see cref="EncodeToken"/>; liefert null bei ungueltiger Kodierung.</summary>
    public static string? DecodeToken(string encoded)
    {
        try
        {
            return Encoding.UTF8.GetString(Base64Url.DecodeFromChars(encoded));
        }
        catch (FormatException)
        {
            return null;
        }
    }

    public static string BuildLink(string frontendBaseUrl, string path, IReadOnlyDictionary<string, string> query)
    {
        var parameters = string.Join("&", query.Select(pair => $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value)}"));
        return $"{frontendBaseUrl.TrimEnd('/')}{path}?{parameters}";
    }

    public static EmailMessage Confirmation(string toAddress, string? firstName, string link) =>
        Compose(
            toAddress,
            firstName,
            "Bitte bestätige deine E-Mail-Adresse",
            "willkommen bei JobPilot! Bitte bestätige noch kurz deine E-Mail-Adresse, damit wir dich zum Beispiel beim Zurücksetzen deines Passworts erreichen können.",
            "E-Mail-Adresse bestätigen",
            link,
            "Der Link ist 3 Tage gültig. Wenn du kein Konto bei JobPilot angelegt hast, kannst du diese E-Mail ignorieren.");

    public static EmailMessage PasswordReset(string toAddress, string? firstName, string link) =>
        Compose(
            toAddress,
            firstName,
            "Passwort zurücksetzen",
            "du hast angefordert, dein Passwort für JobPilot zurückzusetzen. Über den folgenden Link legst du ein neues Passwort fest.",
            "Neues Passwort festlegen",
            link,
            "Der Link ist 2 Stunden gültig und funktioniert nur einmal. Wenn du das nicht warst, ignoriere diese E-Mail – dein Passwort bleibt unverändert.");

    private static EmailMessage Compose(string toAddress, string? firstName, string subject, string intro, string action, string link, string footer)
    {
        var greeting = string.IsNullOrWhiteSpace(firstName) ? "Hallo," : $"Hallo {firstName.Trim()},";

        var text = $"""
            {greeting}

            {intro}

            {action}: {link}

            {footer}

            Dein JobPilot-Team
            """;

        // Alle Werte HTML-kodiert: Der Name stammt vom Benutzer und darf kein Markup einschleusen.
        var html = $"""
            <!doctype html>
            <html lang="de">
            <body style="margin:0;padding:24px;background:#f6f7f9;font-family:Segoe UI,Arial,sans-serif;color:#1f2433;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3e6ec;border-radius:12px;">
                <tr><td style="padding:28px 32px 8px;font-size:18px;font-weight:600;">JobPilot</td></tr>
                <tr><td style="padding:8px 32px;font-size:15px;line-height:1.6;">
                  <p>{WebUtility.HtmlEncode(greeting)}</p>
                  <p>{WebUtility.HtmlEncode(intro)}</p>
                  <p style="margin:24px 0;">
                    <a href="{WebUtility.HtmlEncode(link)}" style="display:inline-block;background:#2e64ea;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">{WebUtility.HtmlEncode(action)}</a>
                  </p>
                  <p style="font-size:13px;color:#5b6170;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
                    <span style="word-break:break-all;">{WebUtility.HtmlEncode(link)}</span></p>
                  <p style="font-size:13px;color:#5b6170;">{WebUtility.HtmlEncode(footer)}</p>
                </td></tr>
                <tr><td style="padding:16px 32px 28px;font-size:13px;color:#5b6170;">Dein JobPilot-Team</td></tr>
              </table>
            </body>
            </html>
            """;

        return new EmailMessage(toAddress, firstName, subject, html, text);
    }
}
