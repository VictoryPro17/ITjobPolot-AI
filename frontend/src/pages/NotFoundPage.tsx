import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm font-medium text-primary">Fehler 404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Seite nicht gefunden</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Die aufgerufene Adresse existiert nicht oder wurde verschoben.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Zurück zum Dashboard
      </Link>
    </div>
  );
}