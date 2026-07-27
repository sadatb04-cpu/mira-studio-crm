export const THEME_OPTIONS = [
  "midnight",
  "royal-purple",
  "emerald",
  "sapphire",
  "carbon",
  "rose-gold",
  "arctic",
] as const

export type MiraTheme = (typeof THEME_OPTIONS)[number]

export type ThemeFamily = "dark" | "light"

// Determines whether the legacy .dark class is applied alongside data-theme,
// so every pre-existing `dark:` Tailwind utility across the app keeps working.
export const THEME_FAMILY: Record<MiraTheme, ThemeFamily> = {
  midnight: "dark",
  "royal-purple": "dark",
  emerald: "dark",
  sapphire: "dark",
  carbon: "dark",
  "rose-gold": "light",
  arctic: "light",
}

export const THEME_LABELS: Record<MiraTheme, string> = {
  midnight: "Mira Midnight",
  "royal-purple": "Royal Purple",
  emerald: "Emerald",
  sapphire: "Sapphire",
  carbon: "Carbon",
  "rose-gold": "Rose Gold",
  arctic: "Arctic",
}

export const THEME_DESCRIPTIONS: Record<MiraTheme, string> = {
  midnight: "Deep indigo-black, the default look.",
  "royal-purple": "Rich violet accents on near-black.",
  emerald: "Cool black with a vivid green accent.",
  sapphire: "Deep blue-black with a crisp blue accent.",
  carbon: "Neutral graphite, minimal and monochrome.",
  "rose-gold": "Warm blush white with a copper accent.",
  arctic: "Crisp cool white with a clean blue accent.",
}

// Swatch preview colors for the theme picker grid - kept as static hex so a
// theme's card can be previewed without switching data-theme to render it.
export const THEME_SWATCHES: Record<MiraTheme, { background: string; card: string; primary: string }> = {
  midnight: { background: "#161b26", card: "#1d2333", primary: "#4c8df0" },
  "royal-purple": { background: "#191325", card: "#20182f", primary: "#9b5cf0" },
  emerald: { background: "#131e1c", card: "#182723", primary: "#2fc98f" },
  sapphire: { background: "#131c26", card: "#18232f", primary: "#3d7fd6" },
  carbon: { background: "#151516", card: "#1c1c1e", primary: "#a8b6c4" },
  "rose-gold": { background: "#fdf6f2", card: "#ffffff", primary: "#c2694f" },
  arctic: { background: "#f4f9fc", card: "#ffffff", primary: "#2f6fb8" },
}

export const DEFAULT_THEME: MiraTheme = "midnight"

export function isMiraTheme(value: string | null): value is MiraTheme {
  return !!value && (THEME_OPTIONS as readonly string[]).includes(value)
}
