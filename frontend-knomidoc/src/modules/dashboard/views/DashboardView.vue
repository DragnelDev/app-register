<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useC31Store } from '@/stores/c31.store'
import { useResumenStore } from '@/stores/resumen.store'
import { useAuthStore } from '@/stores/auth.store'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import { identificadorC31 } from '@/types/c31.types'

const c31Store = useC31Store()
const resumen = useResumenStore()
const auth = useAuthStore()

onMounted(() => {
  resumen.fetch()
  c31Store.setFilters({
    search: '',
    estadoFisico: '',
    tipoC31: '',
    fechaDesde: '',
    fechaHasta: '',
    gestion: '',
    sinActa: undefined,
    sinCarpeta: undefined,
  })
  c31Store.fetchList()
})

const metrics = computed(() => {
  const r = resumen.data
  const pendientes = r?.regularizacion.total ?? 0
  return [
    {
      label: 'Comprobantes C31',
      value: r?.comprobantes.total ?? 0,
      icon: 'fa-file-invoice',
      detalle: `${r?.comprobantes.conImputacion ?? 0} con imputación · ${r?.comprobantes.sinImputacion ?? 0} sin imputación`,
      to: '/c31',
    },
    {
      label: 'En archivo',
      value: r?.comprobantes.enArchivo ?? 0,
      icon: 'fa-warehouse',
      detalle: `${r?.comprobantes.enTramite ?? 0} en trámite · ${r?.comprobantes.prestados ?? 0} prestados`,
      to: '/archivo/depositos',
    },
    {
      label: 'Por regularizar',
      value: pendientes,
      icon: 'fa-link',
      detalle: `${r?.regularizacion.sinActa ?? 0} sin acta · ${r?.regularizacion.sinCarpeta ?? 0} sin carpeta`,
      tone: pendientes > 0 ? 'warning' : 'ok',
      to: auth.puedeRegistrarC31 ? '/c31/vinculos' : undefined,
    },
    {
      label: 'Préstamos activos',
      value: (r?.prestamosActivos.cuaderno ?? 0) + (r?.prestamosActivos.nota ?? 0),
      icon: 'fa-book',
      detalle: `${r?.prestamosActivos.cuaderno ?? 0} cuaderno · ${r?.prestamosActivos.nota ?? 0} nota oficial`,
      to: auth.puedePrestar ? '/prestamos/cuaderno' : undefined,
    },
  ]
})

const ultimosComprobantes = computed(() => c31Store.items.slice(0, 6))
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-ink-900 dark:text-white">
          Hola, {{ auth.usuario?.nombreCompleto ?? 'usuario' }}
        </h1>
        <p class="text-sm text-ink-600 dark:text-ink-300">
          Resumen del estado actual del archivo documental.
        </p>
      </div>
      <RouterLink
        v-if="auth.puedeRegistrarC31"
        to="/c31/nuevo"
        class="inline-flex items-center gap-2 rounded-md bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900 dark:bg-seal-500 dark:hover:bg-seal-600"
      >
        <i class="fa-solid fa-circle-plus" aria-hidden="true" /> Registrar nuevo C31
      </RouterLink>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <component
        :is="metric.to ? RouterLink : 'div'"
        v-for="metric in metrics"
        :key="metric.label"
        :to="metric.to"
        class="card flex items-start justify-between p-5"
        :class="metric.to ? 'transition-shadow hover:shadow-md' : ''"
      >
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-600 dark:text-ink-300">
            {{ metric.label }}
          </p>
          <span class="mt-2 block font-display text-3xl font-semibold text-ink-900 dark:text-white">
            {{ metric.value }}
          </span>
          <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">{{ metric.detalle }}</p>
        </div>
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-lg"
          :class="
            metric.tone === 'warning'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300'
              : 'bg-seal-100 text-seal-700 dark:bg-seal-400/15 dark:text-seal-300'
          "
          aria-hidden="true"
        >
          <i class="fa-solid" :class="metric.icon" />
        </div>
      </component>
    </div>

    <div class="card overflow-hidden">
      <div
        class="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-white/10"
      >
        <h2 class="text-base font-semibold text-ink-900 dark:text-white">
          Últimos comprobantes C31 registrados
        </h2>
        <RouterLink
          to="/c31"
          class="text-xs font-semibold text-seal-600 hover:underline dark:text-seal-300"
        >
          Ver todos →
        </RouterLink>
      </div>

      <ul class="divide-y divide-ink-100 dark:divide-white/10">
        <li
          v-for="comprobante in ultimosComprobantes"
          :key="comprobante.id"
          class="flex items-center justify-between gap-3 px-5 py-3.5 text-sm"
        >
          <div class="min-w-0">
            <p class="truncate font-medium text-ink-800 dark:text-ink-100">
              <span
                v-if="identificadorC31(comprobante)"
                class="mr-2 font-mono text-xs text-ink-500"
                >{{ identificadorC31(comprobante) }}</span
              >
              {{ comprobante.descripcion }}
            </p>
            <p class="text-xs text-ink-600 dark:text-ink-400">
              Bs {{ Number(comprobante.montoTotal).toFixed(2) }} ·
              {{ comprobante.fechaElaboracion }}
            </p>
          </div>
          <BaseBadge :estado="comprobante.estadoFisico" />
        </li>
        <li
          v-if="ultimosComprobantes.length === 0"
          class="px-5 py-8 text-center text-sm text-ink-600 dark:text-ink-400"
        >
          Aún no hay comprobantes registrados.
        </li>
      </ul>
    </div>
  </div>
</template>
