<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useTheme } from '@/composables/useTheme'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()
const { theme, toggleTheme } = useTheme()

function handleLogout() {
  auth.logout()
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
</script>

<template>
  <header
    class="flex h-16 items-center justify-between gap-4 border-b border-white/15 bg-ink-950 px-4 text-white shadow-sm dark:border-white/10 dark:bg-ink-900 sm:px-6"
  >
    <div class="lg:hidden">
      <span class="font-display text-lg font-semibold text-white">KnomiDoc</span>
    </div>

    <!-- Buscador (visual, referencia rápida) -->
    <div
      class="hidden w-72 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/70 dark:border-white/10 dark:bg-white/5 dark:text-ink-400 lg:flex"
    >
      <span aria-hidden="true">🔍</span>
      <input
        type="text"
        placeholder="Buscar comprobante, nota o usuario…"
        class="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/60 dark:text-ink-100"
      />
      <span
        class="rounded border border-white/25 px-1.5 py-0.5 text-[10px] font-semibold text-white/70 dark:border-white/10"
      >
        Ctrl+K
      </span>
    </div>

    <div class="flex items-center gap-2 sm:gap-4">
      <button
        type="button"
        class="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-200 dark:hover:bg-white/10"
        :title="theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        @click="toggleTheme"
      >
        <span aria-hidden="true">{{ theme === 'dark' ? '🌙' : '☀️' }}</span>
        <span class="hidden sm:inline">{{ theme === 'dark' ? 'Modo oscuro' : 'Modo claro' }}</span>
      </button>

      <button
        type="button"
        class="relative rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white dark:text-ink-300 dark:hover:bg-white/10 dark:hover:text-white"
        title="Notificaciones"
      >
        <span aria-hidden="true">🔔</span>
        <span class="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
      </button>

      <div
        v-if="auth.usuario"
        class="flex items-center gap-3 border-l border-white/20 pl-3 dark:border-white/10"
      >
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-seal-400 to-ink-500 text-xs font-bold text-white"
        >
          {{ iniciales }}
        </div>
        <div class="hidden text-right leading-tight sm:block">
          <p class="text-sm font-medium text-white">
            {{ auth.usuario.nombreCompleto }}
          </p>
          <p class="text-xs text-white/70 dark:text-ink-400">{{ rolLabel[auth.usuario.rol] ?? auth.usuario.rol }}</p>
        </div>
      </div>
      <BaseButton variant="ghost" size="sm" @click="handleLogout">Salir</BaseButton>
    </div>
  </header>
</template>
