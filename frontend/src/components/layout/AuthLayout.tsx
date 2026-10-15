import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

import { Logo, LogoMark } from "@/components/brand/Logo";

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const highlights = [
  "Dein Lebenslauf wird automatisch ausgelesen und füllt dein Profil vor – du prüfst nur noch die Angaben.",
  "Für jede Stelle erhältst du einen Match-Score mit verständlicher Begründung und konkreten Empfehlungen.",
  "Status, Termine und Erinnerungen aller Bewerbungen hast du jederzeit auf einen Blick.",
  "Deine Daten bleiben bei dir: Die KI-Analyse kann vollständig lokal auf deinem Rechner laufen.",
];

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <aside
        className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between"
        style={{ backgroundImage: "linear-gradient(135deg, var(--logo-from), var(--logo-to))" }}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/10 blur-3xl" aria-hidden="true" />

        <div className="relative flex items-center gap-2.5">
          <LogoMark className="h-9 w-9 ring-1 ring-white/30" />
          <span className="font-semibold">JobPilot AI</span>
        </div>

        <div className="relative">
          <p className="max-w-lg text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Behalte jede Bewerbung im Blick – vom ersten Entwurf bis zur Zusage.
          </p>
          <p className="mt-5 max-w-lg leading-relaxed text-white/85">
            JobPilot bündelt Stellenanzeigen, Unterlagen, Gesprächstermine und Notizen an einem Ort. Ein nachvollziehbarer
            Abgleich zwischen deinem Profil und jeder Stelle zeigt dir, wo du bereits überzeugst und welche Kenntnisse du
            gezielt ausbauen solltest.
          </p>
          <ul className="mt-8 max-w-lg space-y-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 leading-relaxed text-white/95">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/70">© JobPilot AI</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm animate-fade-in space-y-6">
          <Logo className="lg:hidden" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {children}
          {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
