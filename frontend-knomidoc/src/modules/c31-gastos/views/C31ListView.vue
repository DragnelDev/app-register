<script setup lang="ts">
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
import { identificadorC31 } from '@/types/c31.types'

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
const importing = ref(false)
const exporting = ref(false)
const importFeedback = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function handleFiltersUpdate(filters: C31FilterState) {
  store.setFilters(filters)
  store.fetchList()
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
    const mensaje = resultado.errores.length
      ? `Importación finalizada: ${resultado.creados} comprobantes cargados y ${resultado.errores.length} errores.`
      : `Importación finalizada: ${resultado.creados} comprobantes cargados.`
    importFeedback.value = mensaje
  } catch (error) {
    console.error(error)
    importFeedback.value = 'No se pudo importar el archivo. Revise el formato del Excel.'
  } finally {
    importing.value = false
    input.value = ''
  }
}

const columns: DataTableColumn<ComprobanteC31>[] = [
  { key: 'id', label: 'N° Prev / Dev' },
  { key: 'descripcion', label: 'Descripción', sortable: true },
  { key: 'montoTotal', label: 'Monto (Bs)', sortable: true },
  { key: 'fechaElaboracion', label: 'Fecha', sortable: true },
  { key: 'gestion', label: 'Gestión', sortable: true },
  { key: 'estadoFisico', label: 'Estado físico' },
]

function openDetail(row: ComprobanteC31) {
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
    gestion: '',
    sinActa: undefined,
    sinCarpeta: undefined,
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
        <BaseButton variant="secondary" size="sm" :loading="exporting" @click="exportarExcel">
          📊 Exportar a Excel
        </BaseButton>
        <RouterLink
          v-if="auth.puedeRegistrarC31"
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

    <p v-if="importFeedback" class="text-sm text-ink-600 dark:text-ink-300">
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
      @row-click="openDetail"
    >
      <template #cell-id="{ row }">
        <span class="font-mono text-xs">{{ identificadorC31(row) ?? '—' }}</span>
      </template>
      <template #cell-montoTotal="{ row }">{{ Number(row.montoTotal).toFixed(2) }}</template>
      <template #cell-estadoFisico="{ row }"><BaseBadge :estado="row.estadoFisico" /></template>
      <template #actions="{ row }">
        <BaseButton variant="ghost" size="sm" @click="openDetail(row)">Ver detalle</BaseButton>
      </template>
    </BaseDataTable>

    <C31DetailModal v-model="detailOpen" :comprobante="store.selected" />
  </div>
</template>
