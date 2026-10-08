"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { applyMode, Mode } from "@cloudscape-design/global-styles";

interface ThemeContextType {
  mode: Mode;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: Mode.Dark,
  toggleMode: () => {},
});

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  // Default to Dark to match AWS console screenshots
  const [mode, setMode] = useState<Mode>(Mode.Dark);

  useEffect(() => {
    const saved = localStorage.getItem("route53_theme_mode");
    if (saved === "light") {
      setMode(Mode.Light);
      applyMode(Mode.Light);
    } else {
      setMode(Mode.Dark);
      applyMode(Mode.Dark);
    }
  }, []);

  const toggleMode = () => {
    const nextMode = mode === Mode.Dark ? Mode.Light : Mode.Dark;
    setMode(nextMode);
    applyMode(nextMode);
    localStorage.setItem("route53_theme_mode", nextMode === Mode.Dark ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
