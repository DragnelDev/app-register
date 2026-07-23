<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import PrestamoNotaForm from '../components/PrestamoNotaForm.vue'
import { usePrestamosStore } from '@/stores/prestamos.store'
import { prestamosService } from '@/services/prestamos.service'
import type { PrestamoNota, PrestamoNotaCreatePayload } from '@/types/prestamos.types'

const store = usePrestamosStore()
const modalOpen = ref(false)
const detailOpen = ref(false)
const saving = ref(false)
const selected = ref<PrestamoNota | null>(null)
const returningId = ref<string | null>(null)

const columns: DataTableColumn<PrestamoNota>[] = [
  { key: 'numeroNotaSolicitud', label: 'N° de nota', sortable: true },
  { key: 'unidadSolicitante', label: 'Unidad solicitante' },
  { key: 'aQuienSePresta', label: 'Responsable' },
  { key: 'estadoPrestamo', label: 'Estado' },
]

async function handleSubmit(payload: PrestamoNotaCreatePayload) {
  saving.value = true
  try {
    await prestamosService.createNota(payload)
    modalOpen.value = false
    await store.fetchNotas()
  } finally {
    saving.value = false
  }
}

function openDetail(row: PrestamoNota) {
  selected.value = row
  detailOpen.value = true
}

async function handleDevolverItem(detalleId: string) {
  if (!selected.value) return
  returningId.value = detalleId
  try {
    const updated = await prestamosService.devolverItemNota(selected.value.id, detalleId)
    selected.value = updated
    await store.fetchNotas()
  } finally {
    returningId.value = null
  }
}

onMounted(() => store.fetchNotas())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Préstamo — Nota / Oficio Oficial</h1>
        <p class="text-sm text-ink-400">
          Préstamo en lote de múltiples comprobantes o carpetas completas (ej. Auditoría Interna).
        </p>
      </div>
      <BaseButton @click="modalOpen = true">+ Registrar solicitud</BaseButton>
    </div>

    <BaseDataTable
      :columns="columns"
      :rows="store.notas"
      :loading="store.loadingNotas"
      empty-message="Aún no hay préstamos en lote registrados."
      @row-click="openDetail"
    >
      <template #cell-estadoPrestamo="{ row }"><BaseBadge :estado="row.estadoPrestamo" /></template>
      <template #actions="{ row }">
        <BaseButton variant="ghost" size="sm" @click="openDetail(row)">Ver ítems</BaseButton>
      </template>
    </BaseDataTable>

    <BaseModal v-model="modalOpen" title="Registrar préstamo en lote" size="lg">
      <PrestamoNotaForm :saving="saving" @submit="handleSubmit" />
    </BaseModal>

    <BaseModal v-model="detailOpen" :title="`Ítems de ${selected?.numeroNotaSolicitud ?? ''}`">
      <ul v-if="selected" class="divide-y divide-ink-100">
        <li
          v-for="detalle in selected.detalles"
          :key="detalle.id"
          class="flex items-center justify-between py-3 text-sm"
        >
          <span class="text-ink-700">
            {{ detalle.comprobanteId ? `Comprobante ${detalle.comprobanteId}` : `Carpeta ${detalle.carpetaId}` }}
          </span>
          <div class="flex items-center gap-2">
            <BaseBadge :estado="detalle.estadoItem" />
            <BaseButton
              v-if="detalle.estadoItem === 'PRESTADO'"
              variant="secondary"
              size="sm"
              :loading="returningId === detalle.id"
              @click="handleDevolverItem(detalle.id)"
            >
              Devolver
            </BaseButton>
          </div>
        </li>
      </ul>
    </BaseModal>
  </div>
</template>
