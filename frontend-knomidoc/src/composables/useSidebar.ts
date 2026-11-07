import { ref } from 'vue'

// Estado compartido del menú lateral en pantallas pequeñas (cajón deslizable).
const abierto = ref(false)
const colapsado = ref(false)

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
