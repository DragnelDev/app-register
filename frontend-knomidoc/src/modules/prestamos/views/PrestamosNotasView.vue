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
const saving = ref(false)
const returningId = ref<string | null>(null)

// El backend crea un registro de préstamo por cada comprobante incluido en la nota,
// así que la tabla muestra una fila por comprobante (agrupables visualmente por N° de nota).
const columns: DataTableColumn<PrestamoNota>[] = [
  { key: 'numeroNotaSolicitud', label: 'N° de nota', sortable: true },
  { key: 'institucionSolicitante', label: 'Institución solicitante' },
  { key: 'funcionarioResponsable', label: 'Funcionario responsable' },
  { key: 'comprobanteId', label: 'Comprobante' },
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

async function handleDevolver(row: PrestamoNota) {
  returningId.value = row.id
  try {
    await store.devolverNota(row.id)
  } finally {
    returningId.value = null
  }
}

function nombreComprobante(row: PrestamoNota) {
  return row.comprobante?.numeroComprobante ?? row.comprobante?.numeroFolio ?? row.comprobanteId
}

onMounted(() => store.fetchNotas())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Préstamo — Nota / Oficio Oficial</h1>
        <p class="text-sm text-ink-400">
          Préstamo formal de uno o varios comprobantes mediante una nota de solicitud (ej. Auditoría
          Interna).
        </p>
      </div>
      <BaseButton @click="modalOpen = true">+ Registrar solicitud</BaseButton>
    </div>

    <BaseDataTable
      :columns="columns"
      :rows="store.notas"
      :loading="store.loadingNotas"
      empty-message="Aún no hay préstamos por nota registrados."
    >
      <template #cell-comprobanteId="{ row }">{{ nombreComprobante(row) }}</template>
      <template #cell-estadoPrestamo="{ row }"><BaseBadge :estado="row.estadoPrestamo" /></template>
      <template #actions="{ row }">
        <BaseButton
          v-if="row.estadoPrestamo === 'ENTREGADO'"
          variant="secondary"
          size="sm"
          :loading="returningId === row.id"
          @click="handleDevolver(row)"
        >
          Marcar devuelto
        </BaseButton>
      </template>
    </BaseDataTable>

    <BaseModal v-model="modalOpen" title="Registrar préstamo por nota" size="lg">
      <PrestamoNotaForm :saving="saving" @submit="handleSubmit" />
    </BaseModal>
  </div>
</template>
