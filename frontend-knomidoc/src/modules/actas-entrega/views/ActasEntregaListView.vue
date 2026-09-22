<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ActaEntregaModal from '../components/ActaEntregaModal.vue'
import { actasEntregaService } from '@/services/actas-entrega.service'
import { c31Service } from '@/services/c31.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { ActaEntrega, ActaEntregaCreatePayload } from '@/types/actas-entrega.types'
import type { ComprobanteC31FormPayload } from '@/types/c31.types'

const rows = ref<ActaEntrega[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const loading = ref(false)
const modalOpen = ref(false)
const saving = ref(false)
const editingActa = ref<ActaEntrega | null>(null)
const saveError = ref('')

const columns: DataTableColumn<ActaEntrega>[] = [
  { key: 'numeroActa', label: 'N° de acta', sortable: true },
  { key: 'unidadEmisora', label: 'Unidad emisora' },
  { key: 'cantidadComprobantes', label: 'Comprobantes' },
  { key: 'fechaRecepcion', label: 'Fecha de recepción', sortable: true },
]

async function loadRows() {
  loading.value = true
  try {
    const res = await actasEntregaService.list({ page: page.value, pageSize })
    rows.value = res.data
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingActa.value = null
  saveError.value = ''
  modalOpen.value = true
}

async function openEdit(row: ActaEntrega) {
  saveError.value = ''
  // El listado paginado no trae los comprobantes vinculados; se pide el detalle completo.
  editingActa.value = await actasEntregaService.getById(row.id)
  modalOpen.value = true
}

/** Crea, como comprobantes C31 nuevos, cada fila añadida en el formulario y los vincula al acta. */
async function crearComprobantesNuevos(actaId: string, comprobantes: ComprobanteC31FormPayload[]) {
  const fallos: string[] = []

  for (const comprobante of comprobantes) {
    try {
      await c31Service.create({ ...comprobante, actaEntregaId: actaId })
    } catch (err) {
      fallos.push(
        `No se pudo registrar el comprobante (beneficiario: ${comprobante.beneficiarios.join(', ') || '—'}): ${extractApiErrorMessage(err)}`,
      )
    }
  }

  return fallos
}

async function handleSave(
  payload: ActaEntregaCreatePayload,
  comprobantesNuevos: ComprobanteC31FormPayload[],
) {
  saving.value = true
  saveError.value = ''
  try {
    const acta = editingActa.value
      ? await actasEntregaService.update(editingActa.value.id, payload)
      : await actasEntregaService.create(payload)

    const fallos = await crearComprobantesNuevos(acta.id, comprobantesNuevos)
    if (fallos.length > 0) {
      // El acta y los comprobantes que sí se pudieron crear ya quedaron guardados
      // (aparecerán en "Comprobantes ya registrados"). Los que fallaron deben
      // volver a añadirse manualmente.
      editingActa.value = await actasEntregaService.getById(acta.id)
      saveError.value = `${fallos.join(' ')} Vuelve a añadir las filas que fallaron; las demás ya quedaron guardadas.`
      return
    }

    modalOpen.value = false
    await loadRows()
  } catch (err) {
    saveError.value = extractApiErrorMessage(err, 'No se pudo guardar el acta de entrega.')
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: ActaEntrega) {
  if (!confirm(`¿Eliminar el acta de entrega ${row.numeroActa}?`)) return
  await actasEntregaService.remove(row.id)
  await loadRows()
}

onMounted(loadRows)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Actas de entrega (Tesorería)</h1>
        <p class="text-sm text-ink-400">
          Registro de lotes de ingreso de comprobantes y control de sus filas asociadas.
        </p>
      </div>
      <BaseButton @click="openCreate">+ Registrar acta</BaseButton>
    </div>

    <BaseDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="page"
      :total-pages="Math.max(1, Math.ceil(total / pageSize))"
      empty-message="Aún no se registraron actas de entrega."
      @update:page="
        (p) => {
          page = p
          loadRows()
        }
      "
      @row-click="openEdit"
    >
      <template #cell-fechaRecepcion="{ row }">
        {{ new Date(row.fechaRecepcion).toLocaleDateString('es-BO') }}
      </template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-2">
          <BaseButton variant="ghost" size="sm" @click="openEdit(row)">Editar</BaseButton>
          <BaseButton variant="danger" size="sm" @click="handleDelete(row)">Eliminar</BaseButton>
        </div>
      </template>
    </BaseDataTable>

    <ActaEntregaModal
      v-model="modalOpen"
      :acta="editingActa"
      :saving="saving"
      :server-error="saveError"
      @save="handleSave"
    />
  </div>
</template>
