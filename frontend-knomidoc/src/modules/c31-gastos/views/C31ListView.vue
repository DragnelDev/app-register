<script setup lang="ts">
import { formatMontoBo } from '@/utils/monto'
import { fechaCorta } from '@/utils/estados'
import { c31Service } from '@/services/c31.service'
import IconButton from '@/components/ui/IconButton.vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import C31FilterBar from '../components/C31FilterBar.vue'
import C31DetailModal from '../components/C31DetailModal.vue'
import { useC31Store } from '@/stores/c31.store'
import { useAuthStore } from '@/stores/auth.store'
import type { ComprobanteC31, C31FilterState } from '@/types/c31.types'
import { esDigitalizado, rotuloC31 } from '@/types/c31.types'
import { useGestionStore } from '@/stores/gestion.store'
import { extractApiErrorMessage } from '@/utils/http-error.ts'

const gestionStore = useGestionStore()

const route = useRoute()
const store = useC31Store()

// Las rutas /c31/con-imputacion y /c31/sin-imputacion fijan el tipo de C31
const tipoFijo = computed(
  () => (route.meta.tipoC31 as 'CON_IMPUTACION' | 'SIN_IMPUTACION' | undefined) ?? '',
)
const titulo = computed(() =>
  tipoFijo.value === 'CON_IMPUTACION'
    ? 'C31 Con Imputación'
    : tipoFijo.value === 'SIN_IMPUTACION'
      ? 'C31 Sin Imputación'
      : 'Comprobantes C31',
)
const subtitulo = computed(() =>
  tipoFijo.value === 'CON_IMPUTACION'
    ? 'Comprobantes con preventivo: ejecución de gasto con imputación presupuestaria.'
    : tipoFijo.value === 'SIN_IMPUTACION'
      ? 'Comprobantes con devengado: ejecución de gasto sin imputación presupuestaria.'
      : 'Registro, custodia y trazabilidad de ejecución de gastos.',
)
const auth = useAuthStore()
const detailOpen = ref(false)
const detailTab = ref<'datos' | 'pagos' | 'seguimiento' | 'adjuntos'>('datos')
const importing = ref(false)
const exporting = ref(false)
const importFeedback = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function handleFiltersUpdate(filters: C31FilterState) {
  store.setFilters(filters)
  store.fetchList()
}

const generandoPdf = ref(false)
async function descargarPdf() {
  generandoPdf.value = true
  importFeedback.value = ''
  try {
    await c31Service.listadoPdf({
      ...store.filters,
      tipoC31: tipoFijo.value || store.filters.tipoC31,
    })
  } catch (error) {
    importFeedback.value = extractApiErrorMessage(error, 'No se pudo generar el PDF.')
  } finally {
    generandoPdf.value = false
  }
}

async function exportarExcel() {
  exporting.value = true
  try {
    await store.exportExcel()
  } catch (error) {
    console.error(error)
    importFeedback.value = 'No se pudo generar el Excel.'
  } finally {
    exporting.value = false
  }
}

function openImportPicker() {
  fileInput.value?.click()
}

async function handleImportChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  importing.value = true
  importFeedback.value = ''

  try {
    const gestion = Number(store.filters.gestion || new Date().getFullYear())
    if (!gestion) {
      throw new Error('Seleccione una gestión válida')
    }

    const resultado = await store.importExcel(file, gestion)
    const detalle = resultado.errores
      .slice(0, 8)
      .map((e) => `Fila ${e.fila}: ${e.motivo}`)
      .join('\n')
    const mensaje = resultado.errores.length
      ? `Importación finalizada: ${resultado.creados} comprobantes cargados y ${resultado.errores.length} con error.\n${detalle}${resultado.errores.length > 8 ? '\n…' : ''}`
      : `Importación finalizada: ${resultado.creados} comprobantes cargados.`
    importFeedback.value = mensaje
  } catch (error) {
    importFeedback.value = extractApiErrorMessage(
      error,
      'No se pudo importar el archivo. Revise el formato del Excel.',
    )
  } finally {
    importing.value = false
    input.value = ''
  }
}

// Con imputación se ve el N° PREV; Sin imputación, el N° DEV
const etiquetaNumero = computed(() =>
  tipoFijo.value === 'CON_IMPUTACION'
    ? 'N° PREV'
    : tipoFijo.value === 'SIN_IMPUTACION'
      ? 'N° DEV'
      : 'N° PREV / DEV',
)
const columns = computed<DataTableColumn<ComprobanteC31>[]>(() => [
  { key: 'id', label: etiquetaNumero.value },
  { key: 'descripcion', label: 'Descripción', sortable: true },
  { key: 'montoTotal', label: 'Monto (Bs)', sortable: true },
  { key: 'fechaElaboracion', label: 'Fecha', sortable: true },
  { key: 'gestion', label: 'Gestión', sortable: true },
  { key: 'estadoFisico', label: 'Estado físico' },
  { key: 'archivoAdjuntoUrl', label: 'Digitalizado' },
])

function openDetail(
  row: ComprobanteC31,
  tab: 'datos' | 'pagos' | 'seguimiento' | 'adjuntos' = 'datos',
) {
  detailTab.value = tab
  store.selected = row
  detailOpen.value = true
}

onMounted(() => {
  // Estado limpio al entrar: sin filtros heredados de otra pantalla
  store.setFilters({
    search: '',
    estadoFisico: '',
    tipoC31: tipoFijo.value,
    fechaDesde: '',
    fechaHasta: '',
    gestion: gestionStore.seleccionada,
    sinActa: undefined,
    sinCarpeta: undefined,
    detalle: '',
    beneficiarioId: '',
    numeroPreventivo: '',
    depositoId: '',
    estanteId: '',
    carpetaId: '',
    digitalizado: '',
  })
  store.fetchGestiones()
  store.fetchList()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">{{ titulo }}</h1>
        <p class="text-sm text-ink-500 dark:text-ink-400">{{ subtitulo }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <BaseButton
          v-if="auth.puedeRegistrarC31"
          variant="secondary"
          size="sm"
          :loading="importing"
          @click="openImportPicker"
        >
          📥 Importar Excel
        </BaseButton>
        <BaseButton
          v-if="!auth.esSoloUbicacion"
          variant="secondary"
          size="sm"
          :loading="generandoPdf"
          @click="descargarPdf"
        >
          📄 Descargar PDF
        </BaseButton>
        <BaseButton
          v-if="auth.puedeExportar"
          variant="secondary"
          size="sm"
          :loading="exporting"
          @click="exportarExcel"
        >
          📊 Exportar a Excel
        </BaseButton>
        <RouterLink
          v-if="auth.puedeTrabajarC31"
          to="/c31/nuevo"
          class="inline-flex items-center rounded-md bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900 dark:bg-seal-500 dark:hover:bg-seal-600"
        >
          + Registrar comprobante
        </RouterLink>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".xlsx,.xls"
      class="hidden"
      @change="handleImportChange"
    />

    <p v-if="importFeedback" class="whitespace-pre-line text-sm text-ink-600 dark:text-ink-300">
      {{ importFeedback }}
    </p>

    <C31FilterBar
      :model-value="store.filters"
      :gestiones="store.gestiones"
      :lock-tipo="Boolean(tipoFijo)"
      @update:model-value="handleFiltersUpdate"
      @export="exportarExcel"
    />

    <BaseDataTable
      :columns="columns"
      :rows="store.items"
      :loading="store.loading"
      :page="store.page"
      :total-pages="store.totalPages"
      empty-message="No hay comprobantes que coincidan con los filtros."
      @update:page="
        (p) => {
          store.page = p
          store.fetchList()
        }
      "
      @row-click="(r) => openDetail(r)"
    >
      <template #cell-id="{ row }">
        <span class="whitespace-nowrap font-mono text-xs font-semibold">{{
          rotuloC31(row) ?? '—'
        }}</span>
        <span
          v-if="row.rotuloGrupo"
          class="block whitespace-nowrap text-[10px] text-seal-600"
          title="Comprobantes unidos"
        >
          <i class="fa-solid fa-link" aria-hidden="true" /> unido
        </span>
      </template>
      <template #cell-montoTotal="{ row }">
        <span class="block whitespace-nowrap text-right tabular-nums">{{
          formatMontoBo(Number(row.montoTotal))
        }}</span>
      </template>
      <template #cell-fechaElaboracion="{ row }">
        <span class="whitespace-nowrap">{{ fechaCorta(row.fechaElaboracion) }}</span>
      </template>
      <template #cell-estadoFisico="{ row }"><BaseBadge :estado="row.estadoFisico" /></template>
      <template #cell-archivoAdjuntoUrl="{ row }">
        <button
          type="button"
          class="inline-flex items-center gap-1 text-xs font-medium"
          :class="
            esDigitalizado(row)
              ? 'text-emerald-600 dark:text-emerald-300'
              : 'text-amber-600 dark:text-amber-300'
          "
          :title="esDigitalizado(row) ? 'Digitalizado: abrir archivos' : 'Pendiente de digitalizar'"
          @click.stop="openDetail(row, 'adjuntos')"
        >
          <i
            :class="esDigitalizado(row) ? 'fa-solid fa-circle-check' : 'fa-solid fa-hourglass-half'"
            aria-hidden="true"
          />
          {{ esDigitalizado(row) ? 'Sí' : 'Pendiente' }}
        </button>
      </template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-1">
          <IconButton icon="fa-eye" label="Ver detalle" @click.stop="openDetail(row)" />
          <IconButton
            icon="fa-money-check-dollar"
            label="Pagos"
            @click.stop="openDetail(row, 'pagos')"
          />
          <IconButton
            icon="fa-file-arrow-up"
            label="Digitalización (escaneo y respaldos)"
            @click.stop="openDetail(row, 'adjuntos')"
          />
          <IconButton
            icon="fa-clock-rotate-left"
            label="Seguimiento y préstamos"
            @click.stop="openDetail(row, 'seguimiento')"
          />
        </div>
      </template>
    </BaseDataTable>

    <C31DetailModal
      v-model="detailOpen"
      :comprobante="store.selected"
      :tab="detailTab"
      @digitalizacion="store.fetchList()"
    />
  </div>
</template>
