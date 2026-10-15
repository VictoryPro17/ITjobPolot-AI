import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/Input";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  invalid?: boolean;
}

/** Passwortfeld mit Schalter zum Anzeigen und Verbergen. */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={className ? `${className} pr-10` : "pr-10"} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        {/* Sichtbarer Text statt aria-label, damit der Schalter nicht als Passwortfeld-Label zählt. */}
        <span className="sr-only">{visible ? "Passwort verbergen" : "Passwort anzeigen"}</span>
      </button>
    </div>
  );
}
