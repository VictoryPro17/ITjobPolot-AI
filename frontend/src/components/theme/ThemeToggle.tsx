import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/theme/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === "dark" ? "Zum hellen Design wechseln" : "Zum dunklen Design wechseln";

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={label} title={label}>
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}