# API-Referenz

Diese Referenz beschreibt die HTTP-API des JobPilot-AI-Backends (ASP.NET Core 10). Sie basiert auf den Controllern, DTOs und Validatoren im Quellcode.

- **Basis-URL (Entwicklung):** `http://localhost:5042/api`
- **Frontend:** Das Vite-Frontend ruft die API über den relativen Pfad `/api` auf; der Dev-Proxy leitet diese Anfragen an das Backend weiter.
- **OpenAPI-Dokument:** `/openapi/v1.json` (nur in der Umgebung `Development` verfügbar)

Alle Pfade in diesem Dokument sind relativ zur Basis-URL und beginnen mit `/api`.

## Inhaltsverzeichnis

1. [Allgemeines](#allgemeines)
2. [Authentifizierung und Konto](#authentifizierung-und-konto)
3. [Bewerbungen](#bewerbungen)
4. [Notizen](#notizen)
5. [Dokumente](#dokumente)
6. [Erinnerungen](#erinnerungen)
7. [KI-Funktionen](#ki-funktionen)
8. [Health](#health)
9. [Beispielablauf mit curl](#beispielablauf-mit-curl)

---

## Allgemeines

### Authentifizierung

Die API verwendet ASP.NET Core Identity mit Cookie-Sitzungen (kein JWT).

- `POST /api/auth/register` und `POST /api/auth/login` setzen das Sitzungscookie `jobpilot.auth`.
- Das Cookie ist `HttpOnly` und `SameSite=Lax`. Außerhalb der Entwicklungsumgebung ist es zusätzlich nur über HTTPS gültig (`Secure`).
- Die Sitzung läuft nach 14 Tagen ab und verlängert sich bei Nutzung (Sliding Expiration).
- Alle Endpunkte außer Registrierung, Anmeldung und Health erfordern eine gültige Sitzung. Fehlt sie, antwortet die API mit `401 Unauthorized` (keine Weiterleitung auf eine Anmeldeseite).
- Nach 5 fehlgeschlagenen Anmeldeversuchen wird das Konto für 15 Minuten gesperrt.

Clients müssen das Cookie bei jeder Anfrage mitsenden (Browser: automatisch; `curl`: `-c` und `-b`).

### Mandantentrennung

Jeder Benutzer sieht und verändert ausschließlich eigene Daten. Der Benutzerbezug wird serverseitig aus der Sitzung bestimmt; eine Benutzerkennung wird nie vom Client übergeben. Ressourcen, die einem anderen Benutzer gehören, werden wie nicht vorhandene behandelt und liefern `404 Not Found`. Dadurch ist die Existenz fremder Datensätze nicht erkennbar.

Das gilt auch für Verweise auf Bewerbungen in Notizen, Dokumenten, Erinnerungen und KI-Funktionen: Wird eine fremde oder unbekannte `jobApplicationId` angegeben, antwortet die API mit `404`.

### Formate

- **Inhaltstyp:** JSON (`Content-Type: application/json`), Zeichenkodierung UTF-8. Ausnahmen sind Datei-Uploads (`multipart/form-data`) und Downloads.
- **Feldnamen:** In Anfragen und Antworten werden Felder in `camelCase` geschrieben (z. B. `companyName`).
- **Enums:** Enum-Werte werden in Antworten als Zeichenketten ausgegeben (z. B. `"Applied"`), nicht als Zahlen. Als Wert in Anfragen und als Query-Parameter werden die Namen der Enum-Werte verwendet.
- **Null-Werte:** Felder mit dem Wert `null` werden in JSON-Antworten weggelassen. Ein fehlendes Feld in einer Antwort bedeutet daher „kein Wert“.
- **Datum:** `DateOnly`-Felder (z. B. `appliedOn`) im Format `YYYY-MM-DD`.
- **Zeitpunkt:** `DateTimeOffset`-Felder (z. B. `createdAt`, `dueAt`) im Format ISO 8601, z. B. `2026-03-15T09:30:00+00:00`. Zeitstempel, die der Server erzeugt, liegen in UTC.
- **Kennungen:** GUIDs, z. B. `3f2b1c9e-7a4d-4f6b-8c1e-5d9a0b2c4e61`.
- **Seitenweise Listen:** Die Bewerbungsliste liefert ein Objekt mit `items`, `page`, `pageSize`, `totalCount`, `totalPages`, `hasPreviousPage` und `hasNextPage`.

### Fehlerformat

Fehler werden als `application/problem+json` (ProblemDetails) zurückgegeben. Bei Validierungsfehlern enthält die Antwort zusätzlich das Objekt `errors`, das Feldnamen auf Listen von Fehlermeldungen abbildet.

```json
{
  "errors": {
    "CompanyName": ["Bitte geben Sie den Firmennamen ein."],
    "AppliedOn": ["Ab dem Status \"Beworben\" wird ein Bewerbungsdatum benötigt."]
  },
  "title": "Die Eingaben sind ungültig.",
  "status": 400,
  "instance": "/api/job-applications"
}
```

Weitere Hinweise:

- Der Schlüssel in `errors` entspricht dem Feldnamen der Validierung. Bei Datei-Uploads lautet er `file`, bei fehlgeschlagener Anmeldung `credentials`.
- Das Feld `detail` enthält nur bei `403`, `404` und `409` die fachliche Fehlermeldung. Bei Serverfehlern (`5xx`) enthält es ausschließlich in der Umgebung `Development` den Stacktrace.
- Das Feld `instance` enthält den Pfad der Anfrage.
- Interne Details werden außerhalb der Entwicklungsumgebung nicht an den Client weitergegeben.

### Statuscodes

| Code | Bedeutung | Auslöser |
|------|-----------|----------|
| 200 | OK | Anfrage erfolgreich, Antwort mit Inhalt |
| 201 | Created | Ressource angelegt |
| 204 | No Content | Erfolgreich, ohne Antwortinhalt |
| 400 | Bad Request | Validierungsfehler oder ungültige Anfrage |
| 401 | Unauthorized | Keine gültige Sitzung |
| 403 | Forbidden | Zugriff auf die Ressource nicht erlaubt (wird von der Fehlerbehandlung unterstützt) |
| 404 | Not Found | Ressource nicht vorhanden oder gehört einem anderen Benutzer |
| 409 | Conflict | Vorgang widerspricht dem Datenstand (z. B. E-Mail-Adresse bereits registriert, doppeltes Dokument) |
| 429 | Too Many Requests | Rate-Limit überschritten |
| 499 | Client Closed Request | Anfrage wurde vom Client abgebrochen |
| 500 | Internal Server Error | Unerwarteter Fehler |
| 503 | Service Unavailable | `GET /api/health/database`, wenn die Datenbank nicht erreichbar ist |

### Rate-Limits

Die Begrenzung erfolgt pro IP-Adresse in einem festen Zeitfenster von einer Minute. Bei Überschreitung antwortet die API mit `429 Too Many Requests`.

| Policy | Standardwert | Konfigurationsschlüssel | Gilt für |
|--------|--------------|-------------------------|----------|
| Global | 120 Anfragen pro Minute | `RateLimiting:GlobalPermitLimit` | alle Endpunkte |
| `auth` | 10 Anfragen pro Minute | `RateLimiting:AuthPermitLimit` | `register`, `login`, `change-password`, `export`, `DELETE account` |

Beide Grenzen gelten gleichzeitig; für die genannten Auth-Endpunkte greift zusätzlich die globale Grenze. Die Werte lassen sich über die Konfiguration (z. B. `appsettings.json` oder Umgebungsvariablen) ändern. Werte unter 1 werden auf 1 angehoben.

---

## Authentifizierung und Konto

Basis: `/api/auth`

| Methode | Pfad | Beschreibung | Auth |
|---------|------|--------------|------|
| POST | `/api/auth/register` | Legt ein Konto an und meldet den Benutzer direkt an (setzt das Cookie). Rate-Limit `auth`. | Öffentlich |
| POST | `/api/auth/login` | Meldet an und setzt das Cookie. Rate-Limit `auth`. | Öffentlich |
| POST | `/api/auth/logout` | Beendet die Sitzung (`204`). | Sitzung |
| GET | `/api/auth/me` | Liefert das Profil des angemeldeten Benutzers. | Sitzung |
| PUT | `/api/auth/profile` | Aktualisiert die Profildaten. | Sitzung |
| POST | `/api/auth/profile/resume` | Lädt einen Lebenslauf hoch, speichert ihn als Dokument und liefert einen Profilvorschlag. | Sitzung |
| POST | `/api/auth/profile/resume/extract` | Erzeugt einen Profilvorschlag aus eingefügtem Lebenslauf-Text, ohne zu speichern. | Sitzung |
| POST | `/api/auth/change-password` | Ändert das Passwort (`204`). Rate-Limit `auth`. | Sitzung |
| POST | `/api/auth/profile/avatar` | Lädt ein Profilbild hoch und ersetzt das bisherige. | Sitzung |
| GET | `/api/auth/profile/avatar` | Liefert das eigene Profilbild (`404`, wenn keines vorhanden ist). | Sitzung |
| DELETE | `/api/auth/profile/avatar` | Entfernt das Profilbild. | Sitzung |
| GET | `/api/auth/export` | Exportiert alle eigenen Daten als JSON-Datei. Rate-Limit `auth`. | Sitzung |
| DELETE | `/api/auth/account` | Löscht das Konto samt aller Daten und Dateien endgültig (`204`). Rate-Limit `auth`. | Sitzung |

### POST /api/auth/register

Antwort: `201 Created` mit dem Benutzerprofil (siehe unten), Header `Location: /api/auth/me`.

| Feld | Typ | Pflicht | Regeln |
|------|-----|---------|--------|
| `email` | string | ja | gültige E-Mail-Adresse, höchstens 256 Zeichen |
| `password` | string | ja | 10 bis 128 Zeichen, mindestens ein Großbuchstabe, ein Kleinbuchstabe und eine Ziffer |
| `firstName` | string | nein | höchstens 100 Zeichen |
| `lastName` | string | nein | höchstens 100 Zeichen |

Ist die E-Mail-Adresse bereits registriert, antwortet die API mit `409 Conflict`.

### POST /api/auth/login

| Feld | Typ | Pflicht | Regeln |
|------|-----|---------|--------|
| `email` | string | ja | gültige E-Mail-Adresse |
| `password` | string | ja | nicht leer |
| `rememberMe` | boolean | nein | Standard `true` |

Antwort: `200 OK` mit dem Benutzerprofil. Bei falschen Zugangsdaten und bei gesperrtem Konto antwortet die API mit `400 Bad Request` und dem Fehlerschlüssel `credentials` (nicht mit `401`). Die Meldung ist für unbekannte Adressen und falsche Passwörter identisch.

### Benutzerprofil (Antwort von register, login, me, profile, avatar)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | GUID | Benutzerkennung |
| `email` | string | E-Mail-Adresse |
| `displayName` | string | Anzeigename |
| `firstName`, `lastName` | string | Name (entfällt, wenn nicht gesetzt) |
| `targetJobTitle` | string | Wunschposition |
| `location` | string | Ort |
| `profileSummary` | string | Profilzusammenfassung |
| `experienceSummary` | string | Berufserfahrung |
| `educationSummary` | string | Ausbildung |
| `resumeText` | string | Lebenslauf-Text |
| `skills` | string[] | Fähigkeiten |
| `themePreference` | string | `light`, `dark` oder `system` |
| `roles` | string[] | Rollen des Benutzers |
| `createdAt` | DateTimeOffset | Zeitpunkt der Registrierung |
| `avatarVersion` | number | Zeitstempel der letzten Bildänderung in Millisekunden (Unix-Zeit); nur vorhanden, wenn ein Profilbild existiert |
| `accentColor` | string | Akzentfarbe |

### PUT /api/auth/profile

Alle Felder werden ersetzt: Textfelder, die fehlen oder leer sind, werden gelöscht. Ausnahme: Fehlen `themePreference` oder `accentColor`, bleibt der bisherige Wert erhalten.

| Feld | Typ | Regeln |
|------|-----|--------|
| `firstName`, `lastName` | string | höchstens 100 Zeichen |
| `targetJobTitle` | string | höchstens 150 Zeichen |
| `location` | string | höchstens 150 Zeichen |
| `profileSummary` | string | höchstens 2000 Zeichen |
| `experienceSummary` | string | höchstens 2000 Zeichen |
| `educationSummary` | string | höchstens 2000 Zeichen |
| `resumeText` | string | höchstens 100.000 Zeichen |
| `skills` | string[] | höchstens 100 Einträge, je höchstens 100 Zeichen; leere Einträge werden entfernt, Duplikate (ohne Beachtung der Groß-/Kleinschreibung) zusammengeführt |
| `themePreference` | string | `light`, `dark`, `system` |
| `accentColor` | string | `blue`, `green`, `purple` |

### POST /api/auth/profile/resume

- Inhaltstyp: `multipart/form-data`, Dateifeld **`file`**.
- Die Datei wird als Dokument vom Typ `Resume` gespeichert. Die Antwort enthält einen Profilvorschlag; das Profil selbst wird erst über `PUT /api/auth/profile` geändert.
- Erlaubt sind die in der Konfiguration (`Storage:AllowedExtensions`) hinterlegten Dateiendungen. In der ausgelieferten `appsettings.json`: `.pdf`, `.docx`, `.txt`, `.md`, `.png`, `.jpg`, `.jpeg`. Die Standardwerte der Optionsklasse sind nur `.pdf`.
- Maximale Größe: `Storage:MaxFileSizeInBytes` (in `appsettings.json`: 10.485.760 Bytes, 10 MB).
- Kann aus der Datei kein Text gelesen werden, antwortet die API mit `400` (Schlüssel `file`).

Antwort `200 OK`:

| Feld | Typ |
|------|-----|
| `resumeText` | string |
| `firstName`, `lastName`, `targetJobTitle`, `location` | string |
| `profileSummary`, `experienceSummary`, `educationSummary` | string |
| `skills` | string[] |

### POST /api/auth/profile/resume/extract

Request: `{ "resumeText": "..." }`. Das Feld ist Pflicht, nicht leer und höchstens 100.000 Zeichen lang. Antwort: wie oben (Profilvorschlag).

### POST /api/auth/change-password

| Feld | Typ | Regeln |
|------|-----|--------|
| `currentPassword` | string | Pflicht; bei falschem Wert `400` am Schlüssel `CurrentPassword` |
| `newPassword` | string | gleiche Regeln wie bei der Registrierung; muss sich vom bisherigen Passwort unterscheiden |

Nach erfolgreicher Änderung wird die Sitzung erneuert; bestehende Sitzungen auf anderen Geräten werden ungültig.

### Profilbild

- `POST /api/auth/profile/avatar`: `multipart/form-data`, Dateifeld **`file`**. Erlaubt sind PNG und JPG/JPEG (Endungen `.png`, `.jpg`, `.jpeg`, Dateisignatur wird geprüft), höchstens 2 MB. Antwort: Benutzerprofil.
- `GET /api/auth/profile/avatar`: liefert die Bilddatei mit `Cache-Control: private, max-age=86400` und `X-Content-Type-Options: nosniff`.
- `DELETE /api/auth/profile/avatar`: Antwort: Benutzerprofil.

### GET /api/auth/export

Liefert eine JSON-Datei (`application/json`, Dateiname `jobpilot-export-YYYYMMDD.json`) mit den Abschnitten `exportedAt`, `profile`, `applications`, `reminders`, `documents`, `analyses` und `coverLetters`. Hochgeladene Dateien sind nicht enthalten.

### DELETE /api/auth/account

Request-Body: `{ "password": "..." }` (Pflicht). Bei falschem Passwort antwortet die API mit `400` am Schlüssel `Password`. Bei Erfolg wird das Konto samt allen Daten und Dateien gelöscht und die Sitzung beendet (`204`).

---

## Bewerbungen

Basis: `/api/job-applications`. Alle Endpunkte erfordern eine Sitzung.

| Methode | Pfad | Beschreibung | Auth |
|---------|------|--------------|------|
| GET | `/api/job-applications` | Gefilterte, sortierte und seitenweise Liste | Sitzung |
| GET | `/api/job-applications/summary` | Kennzahlen für Dashboard-Karten | Sitzung |
| GET | `/api/job-applications/statistics` | Langzeitstatistiken | Sitzung |
| GET | `/api/job-applications/{id}` | Einzelne Bewerbung inklusive Statusverlauf | Sitzung |
| POST | `/api/job-applications` | Legt eine Bewerbung an (`201`, Header `Location`) | Sitzung |
| PUT | `/api/job-applications/{id}` | Aktualisiert eine Bewerbung vollständig | Sitzung |
| PATCH | `/api/job-applications/{id}/status` | Ändert nur den Status | Sitzung |
| DELETE | `/api/job-applications/{id}` | Löscht eine Bewerbung unwiderruflich (`204`) | Sitzung |

`{id}` muss eine GUID sein.

### Query-Parameter für GET /api/job-applications

| Parameter | Typ | Standard | Beschreibung |
|-----------|-----|----------|--------------|
| `search` | string | – | Freitextsuche (ohne Beachtung der Groß-/Kleinschreibung) über Firma, Jobtitel, Ort und Technologien; höchstens 200 Zeichen |
| `status` | `ApplicationStatus`, mehrfach | alle | Mehrfachauswahl, z. B. `status=Applied&status=Interview` |
| `employmentType` | `EmploymentType` | – | Filter auf Beschäftigungsart |
| `workModel` | `WorkModel` | – | Filter auf Arbeitsmodell |
| `isOpen` | boolean | – | `true`: nur offene Bewerbungen (Draft, Applied, Interview, Offer); `false`: nur abgeschlossene (Accepted, Rejected) |
| `appliedFrom` | `YYYY-MM-DD` | – | Bewerbungsdatum ab |
| `appliedTo` | `YYYY-MM-DD` | – | Bewerbungsdatum bis; darf nicht vor `appliedFrom` liegen |
| `sortBy` | `JobApplicationSortField` | `UpdatedAt` | Sortierfeld |
| `sortDescending` | boolean | `true` | Sortierrichtung |
| `page` | integer | `1` | Seitennummer, mindestens 1 |
| `pageSize` | integer | `20` | Einträge pro Seite, 1 bis 100 |

Sortierfelder (`sortBy`): `UpdatedAt`, `CreatedAt`, `AppliedOn`, `CompanyName`, `JobTitle`, `Status`.

Ungültige Parameter führen zu `400` mit `errors`.

Antwort `200 OK`: `PagedResult` mit `items` (Listeneinträge), `page`, `pageSize`, `totalCount`, `totalPages`, `hasPreviousPage`, `hasNextPage`.

Listeneintrag: `id`, `companyName`, `jobTitle`, `location`, `employmentType`, `workModel`, `status`, `appliedOn`, `interviewAt`, `technologies`, `isOpen`, `updatedAt`.

### Enums

| Enum | Werte |
|------|-------|
| `ApplicationStatus` | `Draft` (Entwurf), `Applied` (Beworben), `Interview` (Vorstellungsgespräch), `Offer` (Angebot), `Accepted` (Zusage), `Rejected` (Absage) |
| `EmploymentType` | `Unspecified`, `FullTime`, `PartTime`, `Internship`, `WorkingStudent`, `Apprenticeship`, `Freelance`, `TemporaryContract` |
| `WorkModel` | `Unspecified`, `OnSite`, `Hybrid`, `Remote` |

### Request-Body für POST und PUT

Beide Endpunkte verwenden dieselben Validierungsregeln. Bei `PUT` müssen alle Felder angegeben werden (ein fehlendes Feld wird auf den Standardwert bzw. `null` gesetzt); bei `POST` sind die Felder mit Standardwert optional.

| Feld | Typ | Pflicht | Regeln |
|------|-----|---------|--------|
| `companyName` | string | ja | nicht leer, höchstens 200 Zeichen |
| `jobTitle` | string | ja | nicht leer, höchstens 200 Zeichen |
| `location` | string | nein | höchstens 200 Zeichen |
| `employmentType` | `EmploymentType` | nein | Standard bei POST: `Unspecified` |
| `workModel` | `WorkModel` | nein | Standard bei POST: `Unspecified` |
| `salary` | string | nein | höchstens 100 Zeichen |
| `jobPostingUrl` | string | nein | höchstens 1000 Zeichen; absolute URL mit `http` oder `https` |
| `appliedOn` | `YYYY-MM-DD` | bedingt | nicht in der Zukunft (Toleranz: ein Tag); Pflicht, sobald `status` nicht `Draft` ist |
| `status` | `ApplicationStatus` | nein | Standard bei POST: `Draft` |
| `jobDescription` | string | nein | höchstens 20.000 Zeichen |
| `technologies` | string[] | nein | höchstens 40 Einträge, je höchstens 60 Zeichen |
| `notes` | string | nein | höchstens 8.000 Zeichen |
| `contactName` | string | nein | höchstens 150 Zeichen |
| `contactEmail` | string | nein | höchstens 256 Zeichen; gültige E-Mail-Adresse, wenn angegeben |
| `contactPhone` | string | nein | höchstens 50 Zeichen |
| `interviewAt` | DateTimeOffset | nein | Zeitpunkt des Gesprächs |
| `interviewLocation` | string | nein | höchstens 300 Zeichen |

### Detaildarstellung (Antwort von GET {id}, POST, PUT, PATCH)

`id`, `companyName`, `jobTitle`, `location`, `employmentType`, `workModel`, `salary`, `jobPostingUrl`, `appliedOn`, `status`, `jobDescription`, `technologies`, `notes`, `contactName`, `contactEmail`, `contactPhone`, `interviewAt`, `interviewLocation`, `isOpen`, `createdAt`, `updatedAt` sowie `statusHistory`.

Einträge in `statusHistory`: `id`, `fromStatus` (entfällt beim ersten Eintrag), `toStatus`, `changedAt`, `comment`.

### PATCH /api/job-applications/{id}/status

| Feld | Typ | Pflicht | Regeln |
|------|-----|---------|--------|
| `status` | `ApplicationStatus` | ja | gültiger Statuswert |
| `comment` | string | nein | höchstens 1.000 Zeichen |

Antwort: `200 OK` mit der Detaildarstellung. Entspricht der neue Status dem bisherigen, wird nichts geändert und kein Verlaufseintrag erzeugt. Beim Wechsel von `Draft` zu einem anderen Status wird `appliedOn` auf das aktuelle Datum (UTC) gesetzt, sofern noch keines vorhanden ist.

### GET /api/job-applications/summary

Antwort: `total`, `thisMonth`, `open`, `interviews`, `accepted`, `rejected` und `byStatus` (Objekt mit Anzahl je Status).

### GET /api/job-applications/statistics

Antwort: `totalApplications`, `totalInterviews`, `totalOffers`, `totalAccepted`, `totalRejected`, `interviewRate`, `offerRate`, `acceptanceRate`, `monthlyData` (je `year`, `month`, `applied`, `interviews`, `offers`, `accepted`, `rejected`), `statusDistribution` (je `status`, `count`), `averageDaysToResponse`, `averageMatchScore`, `applicationsLast30Days`, `weeklyActivity` (je `weekStart`, `applied`).

---

## Notizen

Basis: `/api/job-applications/{jobApplicationId}/notes`. Notizen sind chronologische Einträge zu einer Bewerbung.

| Methode | Pfad | Beschreibung | Auth |
|---------|------|--------------|------|
| GET | `/api/job-applications/{jobApplicationId}/notes` | Listet die Notizen (neueste zuerst) | Sitzung |
| POST | `/api/job-applications/{jobApplicationId}/notes` | Legt eine Notiz an (`201`) | Sitzung |
| DELETE | `/api/job-applications/{jobApplicationId}/notes/{noteId}` | Löscht eine Notiz (`204`) | Sitzung |

Request-Body für POST:

| Feld | Typ | Pflicht | Regeln |
|------|-----|---------|--------|
| `content` | string | ja | nicht leer (nur Leerzeichen sind nicht erlaubt), höchstens 4.000 Zeichen; wird getrimmt gespeichert |

Notiz: `id`, `jobApplicationId`, `content`, `createdAt`. Ist die Bewerbung unbekannt oder gehört sie einem anderen Benutzer, antwortet die API mit `404`.

---

## Dokumente

Basis: `/api/documents`. Dokumente sind hochgeladene Dateien (Lebensläufe, Anschreiben, Zeugnisse, Zertifikate, Sonstiges).

| Methode | Pfad | Beschreibung | Auth |
|---------|------|--------------|------|
| GET | `/api/documents` | Listet die eigenen Dokumente (neueste zuerst) | Sitzung |
| POST | `/api/documents` | Lädt ein Dokument hoch (`201`) | Sitzung |
| PUT | `/api/documents/{id}` | Ändert Typ oder Zuordnung | Sitzung |
| GET | `/api/documents/{id}/download` | Lädt die Datei herunter | Sitzung |
| DELETE | `/api/documents/{id}` | Löscht Dokument und Datei (`204`) | Sitzung |

### Query-Parameter für GET /api/documents

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `type` | `DocumentType` | Nur Dokumente dieses Typs |
| `jobApplicationId` | GUID | Nur Dokumente, die dieser Bewerbung zugeordnet sind |

`DocumentType`: `Other` (Sonstiges), `Resume` (Lebenslauf), `CoverLetter` (Anschreiben), `Reference` (Zeugnis), `Certificate` (Zertifikat).

Dokument: `id`, `fileName`, `contentType`, `sizeInBytes`, `documentType`, `jobApplicationId`, `jobApplicationLabel` (Format „Firma · Jobtitel“), `hasExtractedText`, `createdAt`.

### POST /api/documents

Inhaltstyp `multipart/form-data` mit den Feldern:

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| `file` | Datei | ja | die hochzuladende Datei |
| `documentType` | `DocumentType` | ja | Dokumenttyp |
| `jobApplicationId` | GUID | nein | Zuordnung zu einer eigenen Bewerbung |

Regeln der Implementierung:

- Erlaubte Dateiendungen: `Storage:AllowedExtensions`; in `appsettings.json` `.pdf`, `.docx`, `.txt`, `.md`, `.png`, `.jpg`, `.jpeg`. Die Dateiendung bestimmt den gespeicherten Content-Type; Angaben des Clients werden ignoriert.
- Der Dateiinhalt muss zur Endung passen (Dateisignatur: `%PDF` für PDF, ZIP-Kennung für DOCX, PNG- und JPEG-Signatur; Text- und Markdown-Dateien dürfen keine Nullbytes enthalten).
- Maximale Größe: `Storage:MaxFileSizeInBytes` (in `appsettings.json`: 10.485.760 Bytes, 10 MB). Leere Dateien werden abgelehnt.
- Höchstens `Storage:MaxDocumentsPerUser` Dokumente pro Benutzer (Standard 100).
- Eine bereits hochgeladene Datei (gleicher SHA-256-Hash beim selben Benutzer) führt zu `409 Conflict`.
- Verstöße gegen die Regeln für Datei, Größe, Format und Anzahl liefern `400` mit dem Fehlerschlüssel `file`. Eine fremde oder unbekannte `jobApplicationId` liefert `404`.

### PUT /api/documents/{id}

| Feld | Typ | Pflicht | Regeln |
|------|-----|---------|--------|
| `documentType` | `DocumentType` | ja | gültiger Wert |
| `jobApplicationId` | GUID | nein | Zuordnung; fehlt das Feld, wird die Zuordnung entfernt |

### GET /api/documents/{id}/download

Liefert die Datei mit dem gespeicherten Content-Type und dem Originaldateinamen sowie dem Header `X-Content-Type-Options: nosniff`.

---

## Erinnerungen

Basis: `/api/reminders`. Erinnerungen für Termine, Fristen und Nachfassaktionen.

| Methode | Pfad | Beschreibung | Auth |
|---------|------|--------------|------|
| GET | `/api/reminders` | Listet Erinnerungen, gefiltert | Sitzung |
| GET | `/api/reminders/upcoming` | Die nächsten offenen Erinnerungen | Sitzung |
| POST | `/api/reminders` | Legt eine Erinnerung an (`201`) | Sitzung |
| PUT | `/api/reminders/{id}` | Aktualisiert eine Erinnerung | Sitzung |
| POST | `/api/reminders/{id}/complete` | Markiert als erledigt | Sitzung |
| POST | `/api/reminders/{id}/reopen` | Setzt auf offen zurück | Sitzung |
| DELETE | `/api/reminders/{id}` | Löscht eine Erinnerung (`204`) | Sitzung |

### Query-Parameter

`GET /api/reminders`:

| Parameter | Typ | Standard | Beschreibung |
|-----------|-----|----------|--------------|
| `filter` | `ReminderFilter` | `Open` | `Open` (offen), `Completed` (erledigt), `All` (alle) |
| `jobApplicationId` | GUID | – | Nur Erinnerungen zu dieser Bewerbung |

Offene Erinnerungen stehen zuerst, aufsteigend nach Fälligkeit; danach folgen erledigte, absteigend nach Erledigungszeitpunkt.

`GET /api/reminders/upcoming`:

| Parameter | Typ | Standard | Beschreibung |
|-----------|-----|----------|--------------|
| `take` | integer | `5` | Anzahl; Werte werden auf den Bereich 1 bis 20 begrenzt |

### Request-Body für POST und PUT

| Feld | Typ | Pflicht | Regeln |
|------|-----|---------|--------|
| `title` | string | ja | nicht leer, höchstens 200 Zeichen |
| `description` | string | nein | höchstens 4.000 Zeichen |
| `dueAt` | DateTimeOffset | ja | Fälligkeitszeitpunkt (ISO 8601); wird als UTC gespeichert |
| `reminderType` | `ReminderType` | ja | gültiger Wert |
| `jobApplicationId` | GUID | nein | eigene Bewerbung; sonst `404` |

`ReminderType`: `Custom` (Individuelle Aufgabe), `Interview` (Vorstellungsgespräch), `Deadline` (Rückmeldungsfrist), `FollowUp` (Nachfassen).

Erinnerung: `id`, `title`, `description`, `dueAt`, `reminderType`, `isCompleted`, `completedAt`, `isOverdue` (offen und fällig in der Vergangenheit), `jobApplicationId`, `jobApplicationLabel` (Format „Firma · Jobtitel“), `createdAt`.

---

## KI-Funktionen

Basis: `/api/ai`. Ist keine KI aktiv oder erreichbar, arbeitet die Analyse regelbasiert (siehe `GET /api/ai/status`).

| Methode | Pfad | Beschreibung | Auth |
|---------|------|--------------|------|
| GET | `/api/ai/status` | Zustand der KI-Anbindung | Sitzung |
| POST | `/api/ai/job-applications/{jobApplicationId}/analyze` | Erstellt eine Match-Analyse und speichert sie | Sitzung |
| GET | `/api/ai/job-applications/{jobApplicationId}/analyses/latest` | Letzte gespeicherte Analyse (`204`, wenn keine vorhanden ist) | Sitzung |
| POST | `/api/ai/job-applications/{jobApplicationId}/cover-letters` | Erzeugt und speichert ein Anschreiben | Sitzung |
| GET | `/api/ai/job-applications/{jobApplicationId}/cover-letters` | Listet gespeicherte Anschreiben (neueste zuerst) | Sitzung |

Bei unbekannter oder fremder Bewerbung antworten alle Endpunkte mit `404`.

### GET /api/ai/status

Antwort: `enabled` (boolean), `provider` (string), `model` (string), `available` (boolean; nur bei Provider Ollama wird die Erreichbarkeit geprüft, sonst `false`).

### Analyse

Antwort von `analyze` und `analyses/latest`: `id`, `jobApplicationId`, `matchScore`, `summary`, `requiredSkills`, `matchedSkills`, `missingSkills`, `recommendations`, `suggestedLearningTopics`, `provider`, `model`, `createdAt`, `factors` (je `key`, `label`, `score`, `weight`, `explanation`) und `profileHints`. Jeder Aufruf von `analyze` legt eine neue Analyse an.

Ist die lokale KI aktiv, gilt pro Benutzer ein Tageslimit (`Ai:DailyRequestLimitPerUser`, Standard 25). Ist es erreicht oder die KI nicht verfügbar, liefert `analyze` trotzdem ein Ergebnis, dann rein regelbasiert. Beim erreichten Tageslimit enthält `profileHints` einen entsprechenden Hinweis. `factors` und `profileHints` werden nicht gespeichert; `analyses/latest` liefert sie leer.

### Anschreiben

Request-Body für POST `cover-letters`:

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| `title` | string | ja | Titel des Anschreibens |
| `style` | `WritingStyle` | nein | Standard `Professional` |
| `isDraft` | boolean | nein | Standard `true` |

`WritingStyle`: `Professional`, `Formal`, `Modern`, `Concise`, `Enthusiastic`.

Antwort: `id`, `jobApplicationId`, `title`, `content`, `companyName`, `jobTitle`, `style`, `isDraft`, `provider`, `model`, `createdAt`.

---

## Health

Basis: `/api/health`. Beide Endpunkte sind öffentlich.

| Methode | Pfad | Beschreibung | Auth |
|---------|------|--------------|------|
| GET | `/api/health` | Prüft, ob die API erreichbar ist | Öffentlich |
| GET | `/api/health/database` | Prüft zusätzlich die Datenbankverbindung; `503`, wenn sie nicht besteht | Öffentlich |

Antwort: `status` (`ok` oder `unavailable`), `service` (`JobPilot AI API`), `timestamp` und bei `/database` zusätzlich `databaseConnected` (boolean).

---

## Beispielablauf mit curl

Der Ablauf registriert einen Benutzer, legt eine Bewerbung an, ändert den Status und fügt eine Notiz hinzu. Das Cookie wird in der Datei `cookies.txt` gespeichert (`-c`) und bei Folgeaufrufen mitgesendet (`-b`). Die Befehle sind für eine POSIX-Shell (z. B. Git Bash) geschrieben.

```bash
BASE=http://localhost:5042/api

# 1. Registrieren (setzt das Cookie jobpilot.auth)
curl -i -c cookies.txt -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"anna@example.com","password":"Sicher12345","firstName":"Anna","lastName":"Beispiel"}'

# 2. Bewerbung anlegen (Status Draft ist der Standard)
curl -s -b cookies.txt -X POST "$BASE/job-applications" \
  -H "Content-Type: application/json" \
  -d '{
        "companyName": "Beispiel GmbH",
        "jobTitle": "Backend-Entwicklerin",
        "location": "Berlin",
        "employmentType": "FullTime",
        "workModel": "Hybrid",
        "technologies": ["C#", "ASP.NET Core", "PostgreSQL"]
      }' | tee application.json

# Kennung der Bewerbung aus der Antwort lesen (erstes "id"-Feld)
ID=$(grep -o '"id":"[^"]*"' application.json | head -1 | cut -d'"' -f4)

# 3. Status auf "Applied" ändern (setzt appliedOn auf das heutige Datum, falls leer)
curl -s -b cookies.txt -X PATCH "$BASE/job-applications/$ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"Applied","comment":"Bewerbung per E-Mail abgeschickt."}'

# 4. Notiz hinzufügen
curl -s -b cookies.txt -X POST "$BASE/job-applications/$ID/notes" \
  -H "Content-Type: application/json" \
  -d '{"content":"Ansprechpartnerin ist Frau Muster, Rückmeldung bis Monatsende."}'

# 5. Notizen abrufen
curl -s -b cookies.txt "$BASE/job-applications/$ID/notes"
```

Erwartete Antworten: Schritt 1 `201 Created` mit Benutzerprofil, Schritt 2 `201 Created` mit der Detaildarstellung, Schritt 3 `200 OK` mit aktualisiertem `status` und ergänztem `statusHistory`, Schritt 4 `201 Created` mit der Notiz, Schritt 5 `200 OK` mit einer Liste von Notizen.
