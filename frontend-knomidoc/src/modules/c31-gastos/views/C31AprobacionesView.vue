<script setup lang="ts">
import { onMounted } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import { useC31Store } from '@/stores/c31.store'
import type { ComprobanteC31 } from '@/types/c31.types'

const store = useC31Store()

const columns: DataTableColumn<ComprobanteC31>[] = [
  { key: 'descripcion', label: 'Descripción', sortable: true },
  { key: 'montoTotal', label: 'Monto (Bs)', sortable: true },
  { key: 'fechaElaboracion', label: 'Fecha', sortable: true },
  { key: 'estadoFisico', label: 'Estado' },
]

async function loadPendientes() {
  store.setFilters({ estadoFisico: 'EN_ARCHIVO' })
  await store.fetchList()
}

onMounted(loadPendientes)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold">Comprobantes C31 en archivo</h1>
      <p class="text-sm text-ink-400">Comprobantes disponibles en el archivo físico.</p>
    </div>

    <BaseDataTable
      :columns="columns"
      :rows="store.items"
      :loading="store.loading"
      empty-message="No hay comprobantes en archivo."
    >
      <template #cell-montoTotal="{ row }">{{ Number(row.montoTotal).toFixed(2) }}</template>
      <template #cell-estadoFisico="{ row }"><BaseBadge :estado="row.estadoFisico" /></template>
    </BaseDataTable>
  </div>
</template>
