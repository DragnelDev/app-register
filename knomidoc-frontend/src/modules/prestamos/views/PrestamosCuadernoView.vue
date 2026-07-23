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
  { key: 'gestion', label: 'Gestión', sortable: true },
  { key: 'comprobanteId', label: 'Comprobante' },
  { key: 'quienRemite', label: 'Quién remite' },
  { key: 'aQuienSePresta', label: 'A quién se presta' },
  { key: 'fechaEntrega', label: 'Fecha entrega', sortable: true },
  { key: 'estadoPrestamo', label: 'Estado' },
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

onMounted(() => store.fetchCuaderno())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Préstamo — Cuaderno Bitácora</h1>
        <p class="text-sm text-ink-400">
          Préstamo individual y rápido de comprobantes registrados por gestión.
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
      <template #cell-fechaEntrega="{ row }">
        {{ new Date(row.fechaEntrega).toLocaleString('es-BO') }}
      </template>
      <template #cell-estadoPrestamo="{ row }"><BaseBadge :estado="row.estadoPrestamo" /></template>
      <template #actions="{ row }">
        <BaseButton
          v-if="row.estadoPrestamo === 'PRESTADO'"
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
