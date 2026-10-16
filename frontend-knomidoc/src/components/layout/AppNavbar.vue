<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useResumenStore } from '@/stores/resumen.store'
import { useTheme } from '@/composables/useTheme'
import { useSidebar } from '@/composables/useSidebar'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const resumen = useResumenStore()
const router = useRouter()
const { theme, toggleTheme } = useTheme()
const { alternar } = useSidebar()

function handleLogout() {
  auth.logout()
  resumen.reset()
  router.push({ name: 'login' })
}

const rolLabel: Record<string, string> = {
  ADMIN: 'Administrador',
  OPERADOR_ARCHIVOS: 'Operador de archivos',
  ENCARGADO_PRESTAMOS: 'Encargado de préstamos',
  CONSULTA_EXTERNA: 'Consulta externa',
}

const iniciales = computed(() => {
  const nombre = auth.usuario?.nombreCompleto ?? ''
  return (
    nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  )
})

const pendientes = computed(() => resumen.pendientesRegularizar)
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-ink-200 bg-white px-4 text-ink-800 dark:border-white/10 dark:bg-ink-900 dark:text-ink-100 sm:px-6"
  >
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="rounded-lg p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800 lg:hidden"
        aria-label="Abrir menú"
        @click="alternar"
      >
        <i class="fa-solid fa-bars" aria-hidden="true" />
      </button>
      <span class="font-display text-lg font-semibold lg:hidden">KnomiDoc</span>
    </div>

    <div class="flex items-center gap-2 sm:gap-4">
      <button
        type="button"
        class="flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:bg-ink-100 dark:border-white/10 dark:bg-white/5 dark:text-ink-200 dark:hover:bg-white/10"
        :title="theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        @click="toggleTheme"
      >
        <i class="fa-solid" :class="theme === 'dark' ? 'fa-moon' : 'fa-sun'" aria-hidden="true" />
        <span class="hidden sm:inline">{{ theme === 'dark' ? 'Modo oscuro' : 'Modo claro' }}</span>
      </button>

      <RouterLink
        v-if="pendientes > 0 && auth.puedeRegistrarC31"
        to="/c31/vinculos"
        class="relative rounded-lg p-2 text-ink-600 transition-colors hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
        :title="`${pendientes} comprobante(s) pendientes de regularizar`"
      >
        <i class="fa-solid fa-bell" aria-hidden="true" />
        <span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />
      </RouterLink>

      <RouterLink
        v-if="auth.usuario"
        to="/perfil"
        class="flex items-center gap-3 rounded-lg border-l border-ink-200 pl-3 dark:border-white/10"
        title="Mi perfil"
      >
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-seal-400 to-seal-600 text-xs font-bold text-white"
        >
          {{ iniciales }}
        </div>
        <div class="hidden text-right leading-tight sm:block">
          <p class="text-sm font-medium text-ink-900 dark:text-white">
            {{ auth.usuario.nombreCompleto }}
          </p>
          <p class="text-xs text-ink-500 dark:text-ink-400">
            {{ rolLabel[auth.usuario.rol] ?? auth.usuario.rol }}
          </p>
        </div>
      </RouterLink>
      <BaseButton variant="ghost" size="sm" @click="handleLogout">Salir</BaseButton>
    </div>
  </header>
</template>
