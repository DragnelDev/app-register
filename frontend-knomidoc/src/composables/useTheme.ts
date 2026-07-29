import { ref, watchEffect } from 'vue'

// RNF-01.1 / RNF-01.3: el sistema soporta un tema claro (por defecto) y uno
// oscuro, persistido en localStorage y respetando la preferencia del SO la
// primera vez que se visita la aplicación.
const THEME_STORAGE_KEY = 'knomidoc_theme'
type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

const theme = ref<Theme>(getInitialTheme())

watchEffect(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem(THEME_STORAGE_KEY, theme.value)
})

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(value: Theme) {
    theme.value = value
  }

  return { theme, toggleTheme, setTheme }
}
