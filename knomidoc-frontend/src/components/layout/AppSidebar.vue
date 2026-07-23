<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()

interface NavItem {
  to: string
  label: string
  icon: string
  roles?: string[]
}

const navItems = computed<NavItem[]>(() => [
  { to: '/', label: 'Panel principal', icon: '⌂' },
  { to: '/notas-entrega', label: 'Notas de entrega', icon: '📥', roles: ['ADMIN', 'REGISTRADOR'] },
  { to: '/c31', label: 'Comprobantes C31', icon: '📄' },
  { to: '/c31/nuevo', label: 'Registrar C31', icon: '➕', roles: ['ADMIN', 'REGISTRADOR'] },
  { to: '/c31/aprobaciones', label: 'Aprobaciones', icon: '✔', roles: ['ADMIN'] },
  { to: '/prestamos/cuaderno', label: 'Préstamo (cuaderno)', icon: '📔', roles: ['ADMIN', 'REGISTRADOR'] },
  { to: '/prestamos/notas', label: 'Préstamo (nota oficial)', icon: '🗂', roles: ['ADMIN', 'REGISTRADOR'] },
  { to: '/usuarios', label: 'Usuarios', icon: '👤', roles: ['ADMIN'] },
])

const visibleItems = computed(() =>
  navItems.value.filter((item) => !item.roles || (auth.rol && item.roles.includes(auth.rol))),
)
</script>

<template>
  <aside class="hidden w-64 shrink-0 flex-col border-r border-ink-100 bg-ink-950 text-ink-100 lg:flex">
    <div class="flex h-16 items-center gap-2 border-b border-white/10 px-6">
      <span class="text-xl font-display font-semibold text-white">KnomiDoc</span>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <RouterLink v-for="item in visibleItems" :key="item.to" :to="item.to"
        class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:bg-white/5 hover:text-white"
        active-class="bg-white/10 text-white">
        <span aria-hidden="true">{{ item.icon }}</span>
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="border-t border-white/10 px-6 py-4 text-xs text-ink-400">
      Comprobantes C31 · Control de Préstamos
    </div>
  </aside>
</template>
