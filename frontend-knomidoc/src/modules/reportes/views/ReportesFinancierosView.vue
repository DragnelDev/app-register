<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { reportesService } from '@/services/gestion.service'
import { c31Service } from '@/services/c31.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { ReporteFinanciero, ReporteFiltros } from '@/types/gestion.types'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
import { ESTADO_C31_LABEL } from '@/utils/estados'
import { useGestionStore } from '@/stores/gestion.store'
const ESTADOS: Record<string, string> = ESTADO_C31_LABEL

const filtros = reactive<ReporteFiltros>({
  gestion: useGestionStore().seleccionada,
  tipoC31: '',
  fechaDesde: '',
  fechaHasta: '',
})
const gestiones = ref<number[]>([])
const reporte = ref<ReporteFinanciero | null>(null)
const loading = ref(false)
const exporting = ref(false)
const error = ref('')

const bs = (n: number) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

async function cargar() {
  loading.value = true
  error.value = ''
  try {
    reporte.value = await reportesService.financiero(filtros)
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo generar el reporte.')
  } finally {
    loading.value = false
  }
}

async function exportar() {
  exporting.value = true
  try {
    await reportesService.exportar(filtros)
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo exportar el reporte.')
  } finally {
    exporting.value = false
  }
}

function limpiar() {
  filtros.gestion = useGestionStore().seleccionada
  filtros.tipoC31 = ''
  filtros.fechaDesde = ''
  filtros.fechaHasta = ''
  cargar()
}

// Serie de 12 meses (con ceros) para el gráfico de barras
const serieMensual = computed(() => {
  const porMes = new Map((reporte.value?.porMes ?? []).map((m) => [m.mes, m]))
  const datos = MESES.map((label, i) => ({
    label,
    monto: porMes.get(i + 1)?.monto ?? 0,
    cantidad: porMes.get(i + 1)?.cantidad ?? 0,
  }))
  const max = Math.max(...datos.map((d) => d.monto), 1)
  return datos.map((d) => ({ ...d, alto: Math.round((d.monto / max) * 100) }))
})

const maxGestion = computed(() =>
  Math.max(...(reporte.value?.porGestion ?? []).map((g) => g.monto), 1),
)
const maxBeneficiario = computed(() =>
  Math.max(...(reporte.value?.topBeneficiarios ?? []).map((b) => b.monto), 1),
)
const montoTipo = (tipo: string) => reporte.value?.porTipo.find((t) => t.tipo === tipo)

onMounted(async () => {
  gestiones.value = await c31Service.listGestiones().catch(() => [])
  await cargar()
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Reportes financieros</h1>
        <p class="text-sm text-ink-500 dark:text-ink-400">
          Montos de comprobantes C31 por tipo, mes, gestión y beneficiario. Los totales no incluyen
          comprobantes anulados.
        </p>
      </div>
      <BaseButton variant="secondary" :loading="exporting" @click="exportar">
        <i class="fa-solid fa-file-excel" aria-hidden="true" /> Exportar a Excel
      </BaseButton>
    </div>

    <form class="card flex flex-wrap items-end gap-3 p-4" @submit.prevent="cargar">
      <BaseSelect
        v-model="filtros.gestion as string | number"
        label="Gestión"
        placeholder="Todas"
        class="w-36"
        :options="gestiones.map((g) => ({ value: g, label: String(g) }))"
      />
      <BaseSelect
        v-model="filtros.tipoC31 as string"
        label="Tipo C31"
        placeholder="Todos"
        class="w-48"
        :options="[
          { value: 'CON_IMPUTACION', label: 'Con imputación' },
          { value: 'SIN_IMPUTACION', label: 'Sin imputación' },
        ]"
      />
      <BaseInput v-model="filtros.fechaDesde" type="date" label="Desde" />
      <BaseInput v-model="filtros.fechaHasta" type="date" label="Hasta" />
      <BaseButton type="submit" :loading="loading">Generar</BaseButton>
      <BaseButton variant="secondary" @click="limpiar">Limpiar</BaseButton>
    </form>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <template v-if="reporte">
      <!-- Indicadores -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="card p-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
            Monto total vigente
          </p>
          <p class="mt-2 text-2xl font-semibold">Bs {{ bs(reporte.totales.monto) }}</p>
          <p class="text-xs text-ink-500 dark:text-ink-400">
            {{ reporte.totales.cantidad }} comprobantes
          </p>
        </div>
        <div class="card p-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
            Promedio por comprobante
          </p>
          <p class="mt-2 text-2xl font-semibold">Bs {{ bs(reporte.totales.promedio) }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
            Con imputación
          </p>
          <p class="mt-2 text-2xl font-semibold">
            Bs {{ bs(montoTipo('CON_IMPUTACION')?.monto ?? 0) }}
          </p>
          <p class="text-xs text-ink-500 dark:text-ink-400">
            {{ montoTipo('CON_IMPUTACION')?.cantidad ?? 0 }} comprobantes
          </p>
        </div>
        <div class="card p-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
            Sin imputación
          </p>
          <p class="mt-2 text-2xl font-semibold">
            Bs {{ bs(montoTipo('SIN_IMPUTACION')?.monto ?? 0) }}
          </p>
          <p class="text-xs text-ink-500 dark:text-ink-400">
            {{ montoTipo('SIN_IMPUTACION')?.cantidad ?? 0 }} comprobantes
          </p>
        </div>
      </div>

      <!-- Monto por mes -->
      <div class="card p-5">
        <h2 class="mb-4 text-base font-semibold">Monto por mes (Bs)</h2>
        <div
          class="flex h-48 items-end gap-2"
          role="img"
          aria-label="Gráfico de barras de monto por mes"
        >
          <div
            v-for="m in serieMensual"
            :key="m.label"
            class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
          >
            <span class="text-[10px] text-ink-500 dark:text-ink-400">{{
              m.monto ? bs(m.monto) : ''
            }}</span>
            <div
              class="w-full rounded-t bg-seal-500 transition-all dark:bg-seal-400"
              :style="{ height: `${Math.max(m.alto, m.monto ? 3 : 0)}%` }"
              :title="`${m.label}: Bs ${bs(m.monto)} (${m.cantidad} comprobantes)`"
            />
            <span class="text-xs font-medium text-ink-600 dark:text-ink-300">{{ m.label }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <!-- Comparativo por gestión -->
        <div class="card p-5">
          <h2 class="mb-4 text-base font-semibold">Comparativo por gestión</h2>
          <ul class="space-y-3">
            <li v-for="g in reporte.porGestion" :key="g.gestion">
              <div class="flex justify-between text-sm">
                <span class="font-medium">{{ g.gestion }}</span>
                <span class="text-ink-600 dark:text-ink-300"
                  >Bs {{ bs(g.monto) }} · {{ g.cantidad }}</span
                >
              </div>
              <div class="mt-1 h-2 rounded-full bg-ink-100 dark:bg-white/10">
                <div
                  class="h-2 rounded-full bg-seal-500 dark:bg-seal-400"
                  :style="{ width: `${(g.monto / maxGestion) * 100}%` }"
                />
              </div>
            </li>
            <li v-if="!reporte.porGestion.length" class="text-sm text-ink-500">Sin datos.</li>
          </ul>
        </div>

        <!-- Por estado físico -->
        <div class="card p-5">
          <h2 class="mb-4 text-base font-semibold">Por estado físico</h2>
          <table class="w-full text-sm">
            <thead>
              <tr class="table-header-cell">
                <th class="py-2 text-left">Estado</th>
                <th class="py-2 text-right">Cantidad</th>
                <th class="py-2 text-right">Monto (Bs)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100 dark:divide-white/10">
              <tr v-for="e in reporte.porEstado" :key="e.estado">
                <td class="py-2">{{ ESTADOS[e.estado] ?? e.estado }}</td>
                <td class="py-2 text-right">{{ e.cantidad }}</td>
                <td class="py-2 text-right">{{ bs(e.monto) }}</td>
              </tr>
              <tr v-if="!reporte.porEstado.length">
                <td colspan="3" class="py-3 text-ink-500">Sin datos.</td>
              </tr>
            </tbody>
          </table>
          <p v-if="reporte.anulados.cantidad" class="mt-3 text-xs text-ink-500 dark:text-ink-400">
            Anulados excluidos de los totales: {{ reporte.anulados.cantidad }} (Bs
            {{ bs(reporte.anulados.monto) }}).
          </p>
        </div>
      </div>

      <!-- Beneficiarios -->
      <div class="card p-5">
        <h2 class="mb-1 text-base font-semibold">Principales beneficiarios</h2>
        <p class="mb-4 text-xs text-ink-500 dark:text-ink-400">
          Monto de los comprobantes en que participa cada beneficiario (si un comprobante tiene
          varios, su monto se muestra completo en cada uno).
        </p>
        <ul class="space-y-3">
          <li v-for="b in reporte.topBeneficiarios" :key="b.nombre">
            <div class="flex justify-between gap-3 text-sm">
              <span class="truncate font-medium">{{ b.nombre }}</span>
              <span class="shrink-0 text-ink-600 dark:text-ink-300"
                >Bs {{ bs(b.monto) }} · {{ b.cantidad }}</span
              >
            </div>
            <div class="mt-1 h-2 rounded-full bg-ink-100 dark:bg-white/10">
              <div
                class="h-2 rounded-full bg-seal-500 dark:bg-seal-400"
                :style="{ width: `${(b.monto / maxBeneficiario) * 100}%` }"
              />
            </div>
          </li>
          <li v-if="!reporte.topBeneficiarios.length" class="text-sm text-ink-500">Sin datos.</li>
        </ul>
      </div>
    </template>
  </div>
</template>
