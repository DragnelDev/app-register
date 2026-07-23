<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useC31Store } from '@/stores/c31.store'
import type { ComprobanteC31 } from '@/types/c31.types'

const store = useC31Store()

const rejectModalOpen = ref(false)
const rejectTarget = ref<ComprobanteC31 | null>(null)
const rejectMotivo = ref('')
const processingId = ref<string | null>(null)

const columns: DataTableColumn<ComprobanteC31>[] = [
  { key: 'descripcion', label: 'Descripción', sortable: true },
  { key: 'montoTotal', label: 'Monto (Bs)', sortable: true },
  { key: 'fechaElaboracion', label: 'Fecha', sortable: true },
  { key: 'estadoAprobacion', label: 'Estado' },
]

async function loadPendientes() {
  store.setFilters({ estadoAprobacion: 'PENDIENTE' })
  await store.fetchList()
}

async function handleAprobar(row: ComprobanteC31) {
  processingId.value = row.id
  try {
    await store.aprobar(row.id)
    store.items = store.items.filter((c) => c.id !== row.id)
  } finally {
    processingId.value = null
  }
}

function openReject(row: ComprobanteC31) {
  rejectTarget.value = row
  rejectMotivo.value = ''
  rejectModalOpen.value = true
}

async function confirmReject() {
  if (!rejectTarget.value) return
  processingId.value = rejectTarget.value.id
  try {
    await store.rechazar(rejectTarget.value.id, rejectMotivo.value)
    store.items = store.items.filter((c) => c.id !== rejectTarget.value?.id)
    rejectModalOpen.value = false
  } finally {
    processingId.value = null
  }
}

onMounted(loadPendientes)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold">Aprobaciones de comprobantes C31</h1>
      <p class="text-sm text-ink-400">Revisión y aprobación de comprobantes pendientes.</p>
    </div>

    <BaseDataTable
      :columns="columns"
      :rows="store.items"
      :loading="store.loading"
      empty-message="No hay comprobantes pendientes de aprobación."
    >
      <template #cell-montoTotal="{ row }">{{ row.montoTotal.toFixed(2) }}</template>
      <template #cell-estadoAprobacion="{ row }"><BaseBadge :estado="row.estadoAprobacion" /></template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-2">
          <BaseButton
            size="sm"
            :loading="processingId === row.id"
            @click="handleAprobar(row)"
          >
            Aprobar
          </BaseButton>
          <BaseButton variant="danger" size="sm" @click="openReject(row)">Rechazar</BaseButton>
        </div>
      </template>
    </BaseDataTable>

    <BaseModal v-model="rejectModalOpen" title="Rechazar comprobante">
      <div class="space-y-3">
        <p class="text-sm text-ink-600">
          Indica el motivo de rechazo para <strong>{{ rejectTarget?.descripcion }}</strong>.
        </p>
        <BaseInput v-model="rejectMotivo" label="Motivo" placeholder="Ej: Falta respaldo de devengado" required />
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="rejectModalOpen = false">Cancelar</BaseButton>
        <BaseButton
          variant="danger"
          :disabled="!rejectMotivo"
          :loading="processingId === rejectTarget?.id"
          @click="confirmReject"
        >
          Confirmar rechazo
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
