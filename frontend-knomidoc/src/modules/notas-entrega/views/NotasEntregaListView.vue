<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import NotaEntregaModal from '../components/NotaEntregaModal.vue'
import { notasEntregaService } from '@/services/notas-entrega.service'
import { c31Service } from '@/services/c31.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { NotaEntrega, NotaEntregaCreatePayload } from '@/types/notas-entrega.types'
import type { ComprobanteC31FormPayload } from '@/types/c31.types'

const rows = ref<NotaEntrega[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const loading = ref(false)
const modalOpen = ref(false)
const saving = ref(false)
const editingNota = ref<NotaEntrega | null>(null)
const saveError = ref('')

const columns: DataTableColumn<NotaEntrega>[] = [
  { key: 'numeroNota', label: 'N° de acta', sortable: true },
  { key: 'oficinaOrigen', label: 'Oficina de origen' },
  { key: 'fechaEntrega', label: 'Fecha de entrega', sortable: true },
]

async function loadRows() {
  loading.value = true
  try {
    const res = await notasEntregaService.list({ page: page.value, pageSize })
    rows.value = res.data
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingNota.value = null
  saveError.value = ''
  modalOpen.value = true
}

async function openEdit(row: NotaEntrega) {
  saveError.value = ''
  // El listado paginado no trae los comprobantes vinculados; se pide el detalle completo.
  editingNota.value = await notasEntregaService.getById(row.id)
  modalOpen.value = true
}

/** Crea, como comprobantes C31 nuevos, cada fila añadida en el formulario y los vincula a la acta. */
async function crearComprobantesNuevos(notaId: string, comprobantes: ComprobanteC31FormPayload[]) {
  const fallos: string[] = []

  for (const comprobante of comprobantes) {
    try {
      await c31Service.create({ ...comprobante, actaEntregaId: notaId })
    } catch (err) {
      fallos.push(
        `No se pudo registrar el comprobante (beneficiario: ${comprobante.beneficiarios.join(', ') || '—'}): ${extractApiErrorMessage(err)}`,
      )
    }
  }

  return fallos
}

async function handleSave(
  payload: NotaEntregaCreatePayload,
  comprobantesNuevos: ComprobanteC31FormPayload[],
) {
  saving.value = true
  saveError.value = ''
  try {
    const nota = editingNota.value
      ? await notasEntregaService.update(editingNota.value.id, payload)
      : await notasEntregaService.create(payload)

    const fallos = await crearComprobantesNuevos(nota.id, comprobantesNuevos)
    if (fallos.length > 0) {
      // La acta y los comprobantes que sí se pudieron crear ya quedaron guardados
      // (aparecerán en "Comprobantes ya registrados"). Los que fallaron deben
      // volver a añadirse manualmente.
      editingNota.value = await notasEntregaService.getById(nota.id)
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

async function handleDelete(row: NotaEntrega) {
  if (!confirm(`¿Eliminar el acta de entrega ${row.numeroNota}?`)) return
  await notasEntregaService.remove(row.id)
  await loadRows()
}

onMounted(loadRows)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Actas de entrega</h1>
        <p class="text-sm text-ink-400">Registro y control de actas de entrega.</p>
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
      <template #cell-fechaEntrega="{ row }">
        {{ new Date(row.fechaEntrega).toLocaleDateString('es-BO') }}
      </template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-2">
          <BaseButton variant="ghost" size="sm" @click="openEdit(row)">Editar</BaseButton>
          <BaseButton variant="danger" size="sm" @click="handleDelete(row)">Eliminar</BaseButton>
        </div>
      </template>
    </BaseDataTable>

    <NotaEntregaModal
      v-model="modalOpen"
      :nota="editingNota"
      :saving="saving"
      :server-error="saveError"
      @save="handleSave"
    />
  </div>
</template>
