<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import C31FilterBar from '../components/C31FilterBar.vue'
import C31DetailModal from '../components/C31DetailModal.vue'
import { useC31Store } from '@/stores/c31.store'
import { useAuthStore } from '@/stores/auth.store'
import type { ComprobanteC31, C31FilterState } from '@/types/c31.types'

const store = useC31Store()
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
  store.fetchGestiones()
  store.fetchList()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Comprobantes C31</h1>
        <p class="text-sm text-ink-400">
          Registro, custodia y trazabilidad de ejecución de gastos.
        </p>
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
      <template #cell-montoTotal="{ row }">{{ Number(row.montoTotal).toFixed(2) }}</template>
      <template #cell-estadoFisico="{ row }"><BaseBadge :estado="row.estadoFisico" /></template>
      <template #actions="{ row }">
        <BaseButton variant="ghost" size="sm" @click="openDetail(row)">Ver detalle</BaseButton>
      </template>
    </BaseDataTable>

    <C31DetailModal v-model="detailOpen" :comprobante="store.selected" />
  </div>
</template>
