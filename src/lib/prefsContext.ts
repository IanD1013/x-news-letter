import { createContext, useContext } from "react";
import type { Prefs } from "./prefs.ts";

export type PrefsContextValue = {
  prefs: Prefs;
  update: (patch: Partial<Prefs>) => void;
  openSettings: () => void;
};

export const PrefsContext = createContext<PrefsContextValue | null>(null);

export function usePrefs(): PrefsContextValue {
  const value = useContext(PrefsContext);
  if (!value) throw new Error("PrefsContext.Provider is missing");
  return value;
}
