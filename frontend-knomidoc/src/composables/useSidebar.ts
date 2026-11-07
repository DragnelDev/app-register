import { ref, watch } from 'vue'

// Estado compartido del menú lateral: cajón deslizable en pantallas pequeñas y,
// en escritorio, barra que se contrae a solo íconos para ganar espacio.
const abierto = ref(false)

const CLAVE = 'knomidoc.sidebar.colapsado'
function leerColapsado(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1'
  } catch {
    return false
  }
}
const colapsado = ref(leerColapsado())
watch(colapsado, (v) => {
  try {
    localStorage.setItem(CLAVE, v ? '1' : '0')
  } catch {
    /* sin almacenamiento: la preferencia solo dura la sesión */
  }
})

export function useSidebar() {
  return {
    abierto,
    colapsado,
    abrir: () => (abierto.value = true),
    cerrar: () => (abierto.value = false),
    alternar: () => (abierto.value = !abierto.value),
    alternarColapso: () => (colapsado.value = !colapsado.value),
  }
}
