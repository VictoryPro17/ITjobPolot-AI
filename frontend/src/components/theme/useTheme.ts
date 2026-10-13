import { useContext } from "react";

import { ThemeContext } from "@/components/theme/ThemeProvider";

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme muss innerhalb von ThemeProvider verwendet werden.");
  }

  return context;
}