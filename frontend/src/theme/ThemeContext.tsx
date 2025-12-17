import { createContext, useContext, useState, useEffect } from "react";

type Theme = "light" | "dark" | "blue" | "contrast";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: any) {
  const [theme, setTheme] = useState<Theme>(
    (localStorage.getItem("app_theme") as Theme) || "light"
  );

  useEffect(() => {
    localStorage.setItem("app_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext)!;
}
