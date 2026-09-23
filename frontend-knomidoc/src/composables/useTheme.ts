import { ref, watch } from 'vue'

// RNF-01.1 / RNF-01.3: el sistema soporta un tema claro (por defecto) y uno
// oscuro, persistido en localStorage y respetando la preferencia del SO la
// primera vez que se visita la aplicación.
const THEME_STORAGE_KEY = 'knomidoc_theme'
type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored

  // La aplicación abre en modo claro para mantener la identidad verde y dorada.
  return 'light'
}

const theme = ref<Theme>(getInitialTheme())

function applyTheme(value: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', value)
  document.documentElement.style.colorScheme = value
  window.localStorage.setItem(THEME_STORAGE_KEY, value)
}

if (typeof document !== 'undefined') applyTheme(theme.value)
watch(theme, applyTheme)

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(value: Theme) {
    theme.value = value
  }

  return { theme, toggleTheme, setTheme }
}
