import type { ReactNode } from "react";
import { CheckCircle2, Plane } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const highlights = ["CV automatisch auslesen", "Match-Score mit Erklärung", "Kanban-Board für alle Bewerbungen"];

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-violet-600 to-indigo-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary">
            <Plane className="h-5 w-5" />
          </span>
          <span className="font-semibold">JobPilot AI</span>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-semibold tracking-tight">Bewerbungen. Klar organisiert.</h2>
          <p className="mt-4 max-w-md text-white/80">
            Lebenslauf hochladen, Stellen analysieren und mit nachvollziehbarem Match-Score gezielt bewerben.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-white/90" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© JobPilot AI</p>
      </aside>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-6 animate-fade-in">
          <span className="flex items-center gap-2 font-semibold tracking-tight lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 text-primary-foreground shadow-sm">
              <Plane className="h-4 w-4" />
            </span>
            JobPilot AI
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {children}
          {footer}
        </div>
      </section>
    </main>
  );
}
