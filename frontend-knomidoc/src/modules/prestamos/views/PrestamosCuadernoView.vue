<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import PrestamoCuadernoForm from '../components/PrestamoCuadernoForm.vue'
import { usePrestamosStore } from '@/stores/prestamos.store'
import { prestamosService } from '@/services/prestamos.service'
import type { PrestamoCuaderno, PrestamoCuadernoCreatePayload } from '@/types/prestamos.types'

const store = usePrestamosStore()
const modalOpen = ref(false)
const saving = ref(false)
const returningId = ref<string | null>(null)

const columns: DataTableColumn<PrestamoCuaderno>[] = [
  { key: 'comprobanteId', label: 'Comprobante' },
  { key: 'solicitanteId', label: 'Solicitante' },
  { key: 'areaUnidad', label: 'Área / unidad' },
  { key: 'fechaHoraSalida', label: 'Salida', sortable: true },
  { key: 'devuelto', label: 'Estado' },
]

async function handleSubmit(payload: PrestamoCuadernoCreatePayload) {
  saving.value = true
  try {
    await prestamosService.createCuaderno(payload)
    modalOpen.value = false
    await store.fetchCuaderno()
  } finally {
    saving.value = false
  }
}

async function handleDevolver(row: PrestamoCuaderno) {
  returningId.value = row.id
  try {
    await store.devolverCuaderno(row.id)
  } finally {
    returningId.value = null
  }
}

function nombreComprobante(row: PrestamoCuaderno) {
  return row.comprobante?.numeroComprobante ?? row.comprobante?.numeroFolio ?? row.comprobanteId
}

function nombreSolicitante(row: PrestamoCuaderno) {
  return row.solicitante?.nombreCompleto ?? row.solicitanteId
}

onMounted(() => store.fetchCuaderno())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Préstamo — Cuaderno Bitácora</h1>
        <p class="text-sm text-ink-400">
          Préstamo individual y rápido de comprobantes ya en archivo.
        </p>
      </div>
      <BaseButton @click="modalOpen = true">+ Registrar préstamo</BaseButton>
    </div>

    <BaseDataTable
      :columns="columns"
      :rows="store.cuaderno"
      :loading="store.loadingCuaderno"
      empty-message="Aún no hay préstamos registrados en el cuaderno."
    >
      <template #cell-comprobanteId="{ row }">{{ nombreComprobante(row) }}</template>
      <template #cell-solicitanteId="{ row }">{{ nombreSolicitante(row) }}</template>
      <template #cell-fechaHoraSalida="{ row }">
        {{ new Date(row.fechaHoraSalida).toLocaleString('es-BO') }}
      </template>
      <template #cell-devuelto="{ row }">
        <BaseBadge :estado="row.devuelto ? 'DEVUELTO' : 'PRESTADO'" />
      </template>
      <template #actions="{ row }">
        <BaseButton
          v-if="!row.devuelto"
          variant="secondary"
          size="sm"
          :loading="returningId === row.id"
          @click="handleDevolver(row)"
        >
          Marcar devuelto
        </BaseButton>
      </template>
    </BaseDataTable>

    <BaseModal v-model="modalOpen" title="Registrar préstamo (cuaderno bitácora)">
      <PrestamoCuadernoForm :saving="saving" @submit="handleSubmit" />
    </BaseModal>
  </div>
</template>
