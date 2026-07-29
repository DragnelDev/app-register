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

interface NavGroup {
  title: string
  items: NavItem[]
}

// Agrupado por dominio funcional, siguiendo la arquitectura modular (RNF-04.1)
const navGroups = computed<NavGroup[]>(() => [
  {
    title: 'Principal',
    items: [
      { to: '/', label: 'Panel principal', icon: '📊' },
      {
        to: '/actas-entrega',
        label: 'Actas de entrega',
        icon: '📋',
        roles: ['ADMIN', 'REGISTRADOR'],
      },
    ],
  },
  {
    title: 'Gestión C31',
    items: [
      { to: '/c31', label: 'Comprobantes C31', icon: '📄' },
      { to: '/c31/nuevo', label: 'Registrar C31', icon: '➕', roles: ['ADMIN', 'REGISTRADOR'] },
      { to: '/c31/aprobaciones', label: 'Aprobaciones', icon: '✔', roles: ['ADMIN'] },
    ],
  },
  {
    title: 'Préstamos Documentales',
    items: [
      {
        to: '/prestamos/cuaderno',
        label: 'Préstamo (Cuaderno)',
        icon: '📓',
        roles: ['ADMIN', 'REGISTRADOR'],
      },
      {
        to: '/prestamos/notas',
        label: 'Préstamo (Nota oficial)',
        icon: '📁',
        roles: ['ADMIN', 'REGISTRADOR'],
      },
    ],
  },
  {
    title: 'Administración',
    items: [{ to: '/usuarios', label: 'Usuarios y Roles', icon: '👥', roles: ['ADMIN'] }],
  },
])

const visibleGroups = computed(() =>
  navGroups.value
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || (auth.rol && item.roles.includes(auth.rol)),
      ),
    }))
    .filter((group) => group.items.length > 0),
)
</script>

<template>
  <aside
    class="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-ink-950 text-ink-100 lg:flex"
  >
    <div class="flex items-center gap-3 border-b border-white/5 px-6 py-5">
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-seal-500 to-ink-500 text-lg font-bold text-white shadow-[0_4px_10px_rgba(193,135,26,0.35)]"
      >
        K
      </div>
      <span class="font-display text-lg font-semibold tracking-tight text-white">KnomiDoc</span>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 py-4">
      <template v-for="group in visibleGroups" :key="group.title">
        <div class="nav-group-title">{{ group.title }}</div>
        <ul class="mb-2 space-y-0.5">
          <li v-for="item in group.items" :key="item.to">
            <RouterLink
              :to="item.to"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-300 transition-colors hover:bg-white/5 hover:text-white"
              active-class="bg-seal-500/15 text-seal-300 font-semibold"
            >
              <span class="w-5 text-center text-base" aria-hidden="true">{{ item.icon }}</span>
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
      </template>
    </nav>

    <div class="border-t border-white/5 bg-black/10 px-5 py-4 text-[11px] text-ink-400">
      Gestión de comprobantes C31 v1.0
    </div>
  </aside>
</template>
