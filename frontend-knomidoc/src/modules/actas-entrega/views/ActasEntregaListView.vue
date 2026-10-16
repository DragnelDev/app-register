<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ActaEntregaModal from '../components/ActaEntregaModal.vue'
import ActaRecepcionModal from '../components/ActaRecepcionModal.vue'
import { actasEntregaService } from '@/services/actas-entrega.service'
import { useResumenStore } from '@/stores/resumen.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import { fechaCorta } from '@/utils/estados'
import type {
  ActaAprobarPayload,
  ActaEntrega,
  ActaEntregaCreatePayload,
  EstadoActa,
} from '@/types/actas-entrega.types'

const resumen = useResumenStore()
const rows = ref<ActaEntrega[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const filtroEstado = ref<EstadoActa | ''>('')
const loading = ref(false)
const modalOpen = ref(false)
const recepcionOpen = ref(false)
const saving = ref(false)
const editingActa = ref<ActaEntrega | null>(null)
const saveError = ref('')
const listError = ref('')

const columns: DataTableColumn<ActaEntrega>[] = [
  { key: 'numeroActa', label: 'N° de acta', sortable: true },
  { key: 'unidadEmisora', label: 'Unidad emisora' },
  { key: 'cantidadComprobantes', label: 'Comprobantes' },
  { key: 'fechaRecepcion', label: 'Fecha', sortable: true },
  { key: 'estado', label: 'Estado' },
]

async function loadRows() {
  loading.value = true
  listError.value = ''
  try {
    const res = await actasEntregaService.list({
      page: page.value,
      pageSize,
      estado: filtroEstado.value || undefined,
    })
    rows.value = res.data
    total.value = res.total
  } catch (err) {
    listError.value = extractApiErrorMessage(err, 'No se pudieron cargar las actas.')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingActa.value = null
  saveError.value = ''
  modalOpen.value = true
}

async function openDetail(row: ActaEntrega) {
  saveError.value = ''
  // El listado no trae los comprobantes; se pide el detalle completo.
  editingActa.value = await actasEntregaService.getById(row.id)
  modalOpen.value = true
}

async function openRecepcion(row: ActaEntrega) {
  saveError.value = ''
  editingActa.value = await actasEntregaService.getById(row.id)
  recepcionOpen.value = true
}

async function handleSave(payload: ActaEntregaCreatePayload) {
  saving.value = true
  saveError.value = ''
  try {
    if (editingActa.value) await actasEntregaService.update(editingActa.value.id, payload)
    else await actasEntregaService.create(payload)
    modalOpen.value = false
    await loadRows()
    resumen.fetch()
  } catch (err) {
    saveError.value = extractApiErrorMessage(err, 'No se pudo guardar el acta de entrega.')
  } finally {
    saving.value = false
  }
}

async function handleRecepcion(payload: ActaAprobarPayload) {
  if (!editingActa.value) return
  saving.value = true
  saveError.value = ''
  try {
    await actasEntregaService.aprobar(editingActa.value.id, payload)
    recepcionOpen.value = false
    await loadRows()
    resumen.fetch()
  } catch (err) {
    saveError.value = extractApiErrorMessage(err, 'No se pudo aprobar la recepción.')
  } finally {
    saving.value = false
  }
}

async function handleAnular(row: ActaEntrega) {
  if (!confirm(`¿Anular el acta ${row.numeroActa}? Sus comprobantes quedarán libres para otra acta.`)) return
  try {
    await actasEntregaService.anular(row.id)
    await loadRows()
    resumen.fetch()
  } catch (err) {
    listError.value = extractApiErrorMessage(err, 'No se pudo anular el acta.')
  }
}

onMounted(loadRows)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Actas de entrega (Tesorería → Archivo)</h1>
        <p class="text-sm text-ink-500 dark:text-ink-400">
          Remisión de comprobantes firmados. Al recibir el acta en Archivo, cada comprobante pasa a “En archivo”.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="filtroEstado"
          class="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
          aria-label="Filtrar por estado"
          @change="page = 1; loadRows()"
        >
          <option value="">Todas</option>
          <option value="BORRADOR">Borrador</option>
          <option value="RECIBIDA">Recibidas</option>
          <option value="ANULADA">Anuladas</option>
        </select>
        <BaseButton @click="openCreate">+ Registrar acta</BaseButton>
      </div>
    </div>

    <p v-if="listError" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{{ listError }}</p>

    <BaseDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="page"
      :total-pages="Math.max(1, Math.ceil(total / pageSize))"
      empty-message="Aún no se registraron actas de entrega."
      @update:page="(p) => { page = p; loadRows() }"
      @row-click="openDetail"
    >
      <template #cell-fechaRecepcion="{ row }">{{ fechaCorta(row.fechaRecepcion) }}</template>
      <template #cell-estado="{ row }"><BaseBadge :estado="row.estado" /></template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-2">
          <BaseButton v-if="row.estado === 'BORRADOR' && row.cantidadComprobantes > 0" size="sm" @click.stop="openRecepcion(row)">Recibir</BaseButton>
          <BaseButton variant="ghost" size="sm" @click.stop="openDetail(row)">{{ row.estado === 'BORRADOR' ? 'Editar' : 'Ver' }}</BaseButton>
          <BaseButton v-if="row.estado === 'BORRADOR'" variant="danger" size="sm" @click.stop="handleAnular(row)">Anular</BaseButton>
        </div>
      </template>
    </BaseDataTable>

    <ActaEntregaModal v-model="modalOpen" :acta="editingActa" :saving="saving" :server-error="saveError" @save="handleSave" />
    <ActaRecepcionModal v-model="recepcionOpen" :acta="editingActa" :saving="saving" :server-error="saveError" @confirm="handleRecepcion" />
  </div>
</template>
