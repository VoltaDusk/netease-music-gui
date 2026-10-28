import { reactive } from "vue";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY_THEME = "cloudmusic_theme_mode";

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode | null;
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // ignore
  }
  return "dark";
}

export const themeState = reactive({
  mode: getInitialTheme(),
});

export function applyTheme(mode: ThemeMode) {
  themeState.mode = mode;
  try {
    localStorage.setItem(STORAGE_KEY_THEME, mode);
  } catch {
    // ignore
  }
  const root = document.documentElement;
  if (mode === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
  }
}

export const themeActions = {
  setTheme(mode: ThemeMode) {
    applyTheme(mode);
  },
  toggleTheme() {
    const next = themeState.mode === "dark" ? "light" : "dark";
    applyTheme(next);
  },
};

// Apply on module load
applyTheme(themeState.mode);
