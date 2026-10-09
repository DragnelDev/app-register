import { ref } from 'vue'

// Estado compartido del menú lateral en pantallas pequeñas (cajón deslizable).
const abierto = ref(false)

export function useSidebar() {
  return {
    abierto,
    abrir: () => (abierto.value = true),
    cerrar: () => (abierto.value = false),
    alternar: () => (abierto.value = !abierto.value),
  }
}
