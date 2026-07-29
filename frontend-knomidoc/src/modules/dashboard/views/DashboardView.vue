<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useC31Store } from '@/stores/c31.store'
import { usePrestamosStore } from '@/stores/prestamos.store'
import { useAuthStore } from '@/stores/auth.store'
import BaseBadge from '@/components/ui/BaseBadge.vue'

const c31Store = useC31Store()
const prestamosStore = usePrestamosStore()
const auth = useAuthStore()

onMounted(() => {
  c31Store.fetchList()
  prestamosStore.fetchCuaderno()
  prestamosStore.fetchNotas()
})

// Métricas principales del panel (equivalentes a los KPI de la plantilla)
const metrics = computed(() => [
  {
    label: 'Comprobantes C31',
    value: c31Store.total,
    icon: '📄',
    trend: null,
  },
  {
    label: 'Pendientes de aprobación',
    value: c31Store.pendientes.length,
    icon: '⏳',
    trend:
      c31Store.pendientes.length > 0
        ? { text: 'Atención', tone: 'warning' }
        : { text: 'Al día', tone: 'up' },
  },
  {
    label: 'Préstamos (cuaderno) activos',
    value: prestamosStore.cuadernoPrestados.length,
    icon: '📓',
    trend: { text: 'En curso', tone: 'up' },
  },
  {
    label: 'Préstamos (nota oficial) activos',
    value: prestamosStore.notasPrestadas.length,
    icon: '📁',
    trend: { text: 'En curso', tone: 'up' },
  },
])

const ultimosComprobantes = computed(() => c31Store.items.slice(0, 6))
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-ink-900 dark:text-white">
          Hola, {{ auth.usuario?.nombreCompleto ?? 'usuario' }}
        </h1>
        <p class="text-sm text-ink-400">Resumen del estado actual del archivo documental.</p>
      </div>
      <RouterLink
        v-if="auth.puedeRegistrar"
        to="/c31/nuevo"
        class="inline-flex items-center gap-2 rounded-md bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900 dark:bg-seal-500 dark:hover:bg-seal-600"
      >
        ➕ Registrar Nuevo C31
      </RouterLink>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="card flex items-start justify-between p-5"
      >
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">
            {{ metric.label }}
          </p>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="font-display text-3xl font-semibold text-ink-900 dark:text-white">{{
              metric.value
            }}</span>
            <span
              v-if="metric.trend"
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="
                metric.trend.tone === 'warning'
                  ? 'bg-seal-100 text-seal-700 dark:bg-amber-400/15 dark:text-amber-400'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400'
              "
            >
              {{ metric.trend.text }}
            </span>
          </div>
        </div>
        <div
          class="flex h-11 w-11 items-center justify-center rounded-[10px] bg-seal-50 text-xl text-seal-600 dark:bg-seal-400/15 dark:text-seal-300"
        >
          {{ metric.icon }}
        </div>
      </div>
    </div>

    <!-- Últimos comprobantes -->
    <div class="card overflow-hidden">
      <div
        class="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-white/10"
      >
        <h2 class="text-base font-semibold text-ink-900 dark:text-white">
          Últimos comprobantes C31 registrados
        </h2>
        <RouterLink
          to="/c31"
          class="text-xs font-medium text-seal-600 hover:underline dark:text-seal-400"
        >
          Ver todos →
        </RouterLink>
      </div>

      <ul class="divide-y divide-ink-100 dark:divide-white/10">
        <li
          v-for="c in ultimosComprobantes"
          :key="c.id"
          class="flex items-center justify-between px-5 py-3.5 text-sm"
        >
          <div>
            <p class="font-medium text-ink-800 dark:text-ink-100">{{ c.descripcion }}</p>
            <p class="text-xs text-ink-400">
              Bs {{ Number(c.montoTotal).toFixed(2) }} · {{ c.fechaElaboracion }}
            </p>
          </div>
          <BaseBadge :estado="c.estadoAprobacion" />
        </li>
        <li
          v-if="ultimosComprobantes.length === 0"
          class="px-5 py-8 text-center text-sm text-ink-400"
        >
          Aún no hay comprobantes registrados.
        </li>
      </ul>
    </div>
  </div>
</template>
