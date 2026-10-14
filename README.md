# JobPilot AI

Intelligenter Bewerbungsmanager – eine Full-Stack-Webanwendung zur Verwaltung, Analyse und
Auswertung von Bewerbungen. Die Anwendung ersetzt Excel-Listen durch ein modernes Dashboard,
ein Kanban-Board und optionale KI-Unterstützung bei Stellenanalyse und Anschreiben.

> Entwicklungsstand: **Phase 1 abgeschlossen** (Projektgrundlage, Datenbank, API-Gerüst, Frontend-Gerüst).

## Technologie-Stack

| Bereich       | Technologien |
|---------------|--------------|
| Backend       | .NET 10, ASP.NET Core Web API, Entity Framework Core 10, ASP.NET Core Identity, Serilog |
| Datenbank     | PostgreSQL 17 (Docker) |
| Frontend      | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, Recharts, Lucide |
| Tests         | xUnit |
| Werkzeuge     | Visual Studio 2026, Docker Compose, dotnet-ef |

## Projektstruktur

```
/
  src/
    JobPilot.Domain/          Entitaeten, Enums, Domaenenregeln (keine Abhaengigkeiten)
    JobPilot.Application/     Abstraktionen, Optionen, Anwendungslogeln
    JobPilot.Infrastructure/  EF Core, PostgreSQL, Migrations, Seeding
    JobPilot.Api/             Controller, Identity, OpenAPI, Serilog, DI-Komposition
  tests/
    JobPilot.Tests/           xUnit-Tests
  frontend/                   React + TypeScript + Vite
  docker-compose.yml          PostgreSQL 17
```

### Architektur in Kurzform

* **Clean Architecture light**: `Domain` -> `Application` -> `Infrastructure` -> `Api`.
  Die Abhaengigkeiten zeigen ausschließlich nach innen.
* **Kein Repository-Pattern** über EF Core. Der `DbContext` ist bereits Unit of Work und Repository.
* **Mandantentrennung**: Jede nutzerbezogene Entität erbt von `OwnedEntityBase` und besitzt eine
  `UserId`. Die ID stammt immer aus den validierten Claims (`ICurrentUser`), niemals aus dem Request-Body.
* **Cookie-Authentifizierung** statt JWT: Das Frontend ist eine First-Party-SPA. Ein `HttpOnly`-Cookie
  ist dort sicherer, weil es für JavaScript nicht lesbar ist. Unauthentifizierte Anfragen erhalten
  401/403 statt eines Redirects auf eine Login-Seite.
* **KI ist optional**: `Ai:Enabled` (Standard `false`) schaltet externe KI-Anbieter frei. Match-Analyse
  und Anschreiben laufen ohne KI regelbasiert. Das MVP läuft vollständig ohne externen KI-Anbieter.
* **Lebensläufe** können als PDF, DOCX, TXT oder MD hochgeladen werden. Der Upload liefert einen
  Profilvorschlag, der erst nach Prüfung über „Profil speichern“ übernommen wird.

## Voraussetzungen

* [.NET SDK 10.0](https://dotnet.microsoft.com/download) (getestet mit 10.0.401)
* [Node.js 20+](https://nodejs.org) (getestet mit 23.3.0)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) für PostgreSQL
* EF-Core-Werkzeug: `dotnet tool update --global dotnet-ef --version 10.0.*`

## Einrichtung

### 1. Datenbank starten

```bash
docker compose up -d
```

Startet PostgreSQL 17 auf Port `5432` mit Datenbank, Benutzer und Passwort `jobpilot` /
`jobpilot` / `jobpilot_dev`. Diese Zugangsdaten gelten **ausschließlich** für die lokale Entwicklung.

### 2. Datenbankschema anlegen

```bash
dotnet ef database update --project src/JobPilot.Infrastructure --startup-project src/JobPilot.Api
```

Alternativ genügt der Start der API: sie wendet ausstehende Migrationen automatisch an und legt
die Standardrollen an.

### 3. API starten

```bash
dotnet run --project src/JobPilot.Api
```

| Adresse | Zweck |
|---------|-------|
| `http://localhost:5042/api/health` | Erreichbarkeit der API |
| `http://localhost:5042/api/health/database` | Erreichbarkeit der Datenbank |
| `http://localhost:5042/openapi/v1.json` | OpenAPI-Dokument (nur Development) |

### 4. Frontend starten

```bash
cd frontend
npm install
npm run dev
```

Die Oberfläche läuft auf `http://localhost:5173`. Der Vite-Dev-Proxy leitet alle Anfragen an
`/api` an die ASP.NET Core API weiter. Dadurch teilen sich Frontend und API im Browser dieselbe
Origin, was die Cookie-Authentifizierung ohne SameSite-Sonderregeln ermöglicht.

## Konfiguration und Umgebungsvariablen

Die Konfiguration erfolgt über `src/JobPilot.Api/appsettings.json`. Werte lassen sich per
Umgebungsvariable überschreiben (`__` trennt die Ebenen).

| Schlüssel | Umgebungsvariable | Standard | Bedeutung |
|-------------|-------------------|----------|-----------|
| `ConnectionStrings:Default` | `ConnectionStrings__Default` | lokale Docker-Datenbank | PostgreSQL-Verbindung |
| `App:CorsOrigins` | `App__CorsOrigins__0` | `http://localhost:5173` | Erlaubte Frontend-Origins |
| `Storage:UploadRoot` | `Storage__UploadRoot` | `uploads` | Ablage für Benutzerdokumente |
| `Storage:MaxFileSizeInBytes` | `Storage__MaxFileSizeInBytes` | `10485760` | Maximale Dateigröße (10 MB) |
| `Storage:MaxDocumentsPerUser` | `Storage__MaxDocumentsPerUser` | `100` | Maximale Anzahl Dokumente pro Benutzer |
| `Ai:Enabled` | `Ai__Enabled` | `false` | Schaltet externe KI-Anbieter frei. Match-Analyse und Anschreiben laufen ohne KI regelbasiert. |
| `Ai:Provider` | `Ai__Provider` | `openai` | KI-Anbieter; umgesetzt ist `ollama` (lokal) |
| `Ai:Model` | `Ai__Model` | `gpt-4o-mini` | Modellname; für Ollama z. B. `qwen2.5:3b` |
| `Ai:BaseUrl` | `Ai__BaseUrl` | `http://localhost:11434` | Adresse des KI-Anbieters |
| `Ai:TimeoutSeconds` | `Ai__TimeoutSeconds` | `120` | Danach greift die regelbasierte Analyse |
| `Ai:ApiKey` | `Ai__ApiKey` | leer | **Nur über User Secrets setzen** |
| `Ai:DailyRequestLimitPerUser` | `Ai__DailyRequestLimitPerUser` | `25` | Kostenbremse pro Benutzer und Tag |
| `RateLimiting:GlobalPermitLimit` | `RateLimiting__GlobalPermitLimit` | `120` | Anfragen pro IP und Minute |
| `RateLimiting:AuthPermitLimit` | `RateLimiting__AuthPermitLimit` | `10` | Anmeldungen/Registrierungen pro IP und Minute |

### Secrets niemals committen

API-Schlüssel gehören ausschließlich in die User Secrets:

```bash
dotnet user-secrets set "Ai:ApiKey" "<ihr-schluessel>" --project src/JobPilot.Api
```

Frontend-Variablen für Vite:

```bash
# frontend/.env.local (optional)
VITE_API_PROXY_TARGET=http://localhost:5042
```

## Lokale KI mit Ollama

Lebenslauf-Auslesen und Match-Analyse können ein lokales Sprachmodell nutzen. Das ist kostenlos,
und Lebensläufe verlassen den eigenen Rechner nicht.

```bash
winget install --id Ollama.Ollama -e
ollama pull qwen2.5:3b
```

In `appsettings.Development.json` ist die lokale KI bereits aktiviert (`Enabled: true`,
`Provider: ollama`, `Model: qwen2.5:3b`, `BaseUrl: http://127.0.0.1:11434`). In Produktion bleibt sie
standardmäßig aus.

* **Score bleibt regelbasiert**: Die KI formuliert Zusammenfassung, Empfehlungen und Lernthemen und
  findet weitere Anforderungen. Der Score wird immer mit derselben nachvollziehbaren Formel berechnet.
* **Abgesichert**: Skills und Anforderungen werden nur übernommen, wenn sie wörtlich im Lebenslauf bzw.
  in der Stellenbeschreibung stehen. Zusammenfassungen, die Abgedecktes als fehlend darstellen, und
  Empfehlungen, fehlende Skills anzugeben, werden verworfen.
* **Automatischer Rückfall**: Ist Ollama nicht erreichbar, zu langsam, liefert ungültiges JSON oder ist das
  Tageslimit erreicht, wird regelbasiert gearbeitet. `GET /api/ai/status` zeigt den aktuellen Zustand.
* **Dauer** (RTX 3050 Ti, 4 GB): CV etwa 10–13 s, Analyse etwa 5 s. Der allererste Aufruf nach dem
  Start lädt das Modell und dauert deutlich länger.

## Build und Tests

```bash
dotnet build "ITjobPolot AI.slnx"
dotnet test tests/JobPilot.Tests
cd frontend && npm run build
```

### Browser-Tests (Playwright)

Die Tests in `frontend/e2e/` laufen gegen die lokale Umgebung in Chromium – Desktop hell, Desktop dunkel
und Handybreite. Jeder Test legt ein eigenes Konto an und löscht es am Ende wieder.

```bash
# einmalig
cd frontend && npx playwright install chromium

# API mit erhöhten Limits starten (sonst greift der Missbrauchsschutz)
RateLimiting__GlobalPermitLimit=100000 RateLimiting__AuthPermitLimit=1000 \n  dotnet run --project src/JobPilot.Api --urls http://localhost:5042

# Tests (Vite startet bei Bedarf automatisch)
cd frontend && npm run e2e        # alle Projekte
npm run e2e -- --project=mobile   # nur Handybreite
npm run e2e:ui                    # interaktiver Modus
```

`e2e/visual.spec.ts` legt Screenshots der Hauptseiten und einen Barrierefreiheitsbericht (axe) in
`frontend/e2e-artifacts/` ab. Der Bericht lässt den Lauf nicht scheitern.

## Sicherheitsmaßnahmen

* ASP.NET Core Identity mit Passwortrichtlinie (mindestens 10 Zeichen) und Kontosperre nach
  fünf Fehlversuchen für 15 Minuten.
* `HttpOnly`-, `Secure`- und `SameSite`-Cookies.
* Serverseitige Autorisierung; alle Abfragen filtern zwingend nach der `UserId` aus den Claims.
* Rate Limiting (120 Anfragen pro Minute und IP).
* Restriktive CORS-Konfiguration auf konfigurierte Origins.
* Zentrale Fehler-Middleware, die keine internen Details nach außen gibt.
* Dateiuploads (PDF, DOCX, TXT, MD, PNG, JPG) mit Größenbegrenzung, Prüfung der Dateisignatur
  gegen die Endung, Dublettenerkennung per SHA-256, Kontingent pro Benutzer und Schutz gegen
  Pfadmanipulation. Der Content-Type wird serverseitig aus der Endung bestimmt.
* Datenexport (JSON) und endgültige Kontolöschung inklusive aller Dateien (DSGVO).

## Entwicklungsphasen

| Phase | Inhalt | Status |
|-------|--------|--------|
| 1 | Projektgrundlage, Datenbank, API-Gerüst, Frontend-Gerüst | abgeschlossen |
| 2 | Bewerbungsverwaltung (CRUD, Liste, Formular, Filter, Suche, Paging) | offen |
| 3 | Dashboard, Benutzerverwaltung, Kanban-Board, Basisstatistiken | offen |
| 4 | KI-Stellenanalyse und KI-Anschreiben | teilweise (regelbasiert, externe KI vorbereitet) |
| 5 | Dokumente, Erinnerungen, erweiterte Statistiken, Einstellungen | abgeschlossen |
| 6 | Tests, Security-Review, Performance, Docker, Deployment, Doku | offen |

## Lizenz

Noch nicht festgelegt.