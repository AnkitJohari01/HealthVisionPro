import React, { createContext, useContext, useState, useEffect } from "react";

interface AppState {
  file: File | null;
  preview: string | null;
  report: string;
  annotatedImage: string | null;
  annotations: any[];
  history: any[];
}

// default empty state
const defaultState: AppState = {
  file: null,
  preview: null,
  report: "",
  annotatedImage: null,
  annotations: [],
  history: []
};

const AppContext = createContext<any>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const stored = sessionStorage.getItem("healthVisionState");
    return stored ? JSON.parse(stored) : defaultState;
  });

  // Persist across tab switching & refresh
  useEffect(() => {
    sessionStorage.setItem("healthVisionState", JSON.stringify(state));
  }, [state]);

  const update = (updates: Partial<AppState>) =>
    setState((prev) => ({ ...prev, ...updates }));

  return (
    <AppContext.Provider value={{ state, update }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppState = () => useContext(AppContext);
