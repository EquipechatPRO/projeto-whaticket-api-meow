import { create } from "zustand";

export type Theme = "light" | "dark" | "system";
export type Language = "pt-BR" | "en" | "es";

interface SettingsStore {
  theme: Theme;
  language: Language;
  setTheme: (t: Theme) => void;
  setLanguage: (l: Language) => void;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem("app_settings");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(state: Partial<SettingsStore>) {
  localStorage.setItem("app_settings", JSON.stringify({ theme: state.theme, language: state.language }));
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

const saved = loadSettings();
// Apply saved theme on load
applyTheme(saved.theme || "light");

export const useSettingsStore = create<SettingsStore>((set) => ({
  theme: saved.theme || "light",
  language: saved.language || "pt-BR",
  setTheme: (t) =>
    set((s) => {
      applyTheme(t);
      const next = { ...s, theme: t };
      save(next);
      return next;
    }),
  setLanguage: (l) =>
    set((s) => {
      const next = { ...s, language: l };
      save(next);
      return next;
    }),
}));
