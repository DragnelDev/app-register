<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { ROLES_INFO, rolLabel } from '@/constants/roles'
import type { RolUsuario } from '@/types/common.types'

/** Como en el SIGEP: con varios perfiles se elige con cuál se trabaja en esta sesión. */
const auth = useAuthStore()
const router = useRouter()
const eligiendo = ref<string | null>(null)
const error = ref('')

const recordar = ref(true)

async function elegir(rol: RolUsuario) {
  if (recordar.value) auth.guardarPerfilPredeterminado(rol)
  eligiendo.value = rol
  error.value = ''
  try {
    if (rol !== auth.usuario?.rol) await auth.cambiarPerfil(rol)
    else {
      auth.perfilPendiente = false
      sessionStorage.removeItem('knomidoc_perfil_pendiente')
    }
    router.replace(auth.rutaInicial)
  } catch {
    error.value = 'No se pudo cambiar de perfil. Intente de nuevo.'
  } finally {
    eligiendo.value = null
  }
}

// Con un perfil predeterminado se entra directo, sin pasar por esta pantalla
onMounted(() => {
  const defecto = auth.perfilPredeterminado()
  if (defecto && auth.perfiles.includes(defecto as RolUsuario)) void elegir(defecto as RolUsuario)
})

function salir() {
  auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-paper px-4 dark:bg-ink-950">
    <div
      class="w-full max-w-lg rounded-lg border border-ink-200 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-ink-900"
    >
      <h1 class="font-display text-2xl font-semibold text-ink-900 dark:text-white">
        Seleccione su perfil
      </h1>
      <p class="mt-1 text-sm text-ink-500 dark:text-ink-300">
        {{ auth.usuario?.nombreCompleto }}, su usuario tiene varios perfiles. Elija con cuál
        trabajará; podrá cambiar después desde la barra superior.
      </p>

      <p
        v-if="error"
        role="alert"
        class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ error }}
      </p>

      <ul class="mt-5 space-y-3">
        <li v-for="rol in auth.perfiles" :key="rol">
          <button
            type="button"
            class="w-full rounded-lg border border-ink-200 p-4 text-left transition-colors hover:border-seal-500 hover:bg-seal-50 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5"
            :disabled="eligiendo !== null"
            @click="elegir(rol)"
          >
            <span class="block font-semibold text-ink-900 dark:text-white">
              {{ rolLabel(rol) }}
              <span v-if="eligiendo === rol" class="ml-2 text-xs font-normal text-ink-400"
                >Ingresando…</span
              >
            </span>
            <span class="mt-0.5 block text-sm text-ink-500 dark:text-ink-300">
              {{ ROLES_INFO[rol]?.descripcion }}
            </span>
          </button>
        </li>
      </ul>

      <label class="mt-5 flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
        <input v-model="recordar" type="checkbox" />
        Entrar siempre con este perfil (podrá cambiarlo desde la barra superior)
      </label>

      <button
        type="button"
        class="mt-6 text-sm text-ink-500 hover:underline dark:text-ink-300"
        @click="salir"
      >
        Salir
      </button>
    </div>
  </div>
</template>
