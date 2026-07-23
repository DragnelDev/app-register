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
import type { ComprobanteC31 } from '@/types/c31.types'

const store = useC31Store()
const auth = useAuthStore()
const detailOpen = ref(false)

const columns: DataTableColumn<ComprobanteC31>[] = [
  { key: 'descripcion', label: 'Descripción', sortable: true },
  { key: 'montoTotal', label: 'Monto (Bs)', sortable: true },
  { key: 'fechaElaboracion', label: 'Fecha', sortable: true },
  { key: 'estadoAprobacion', label: 'Aprobación' },
  { key: 'estadoFisico', label: 'Físico' },
]

function openDetail(row: ComprobanteC31) {
  store.selected = row
  detailOpen.value = true
}

onMounted(() => store.fetchList())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Comprobantes C31</h1>
        <p class="text-sm text-ink-400">Registro, custodia y trazabilidad de ejecución de gastos.</p>
      </div>
      <RouterLink
        v-if="auth.puedeRegistrar"
        to="/c31/nuevo"
        class="inline-flex items-center rounded-md bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900"
      >
        + Registrar comprobante
      </RouterLink>
    </div>

    <C31FilterBar v-model="store.filters" @apply="store.fetchList()" />

    <BaseDataTable
      :columns="columns"
      :rows="store.items"
      :loading="store.loading"
      :page="store.page"
      :total-pages="store.totalPages"
      empty-message="No hay comprobantes que coincidan con los filtros."
      @update:page="(p) => { store.page = p; store.fetchList() }"
      @row-click="openDetail"
    >
      <template #cell-montoTotal="{ row }">{{ row.montoTotal.toFixed(2) }}</template>
      <template #cell-estadoAprobacion="{ row }"><BaseBadge :estado="row.estadoAprobacion" /></template>
      <template #cell-estadoFisico="{ row }"><BaseBadge :estado="row.estadoFisico" /></template>
      <template #actions="{ row }">
        <BaseButton variant="ghost" size="sm" @click="openDetail(row)">Ver detalle</BaseButton>
      </template>
    </BaseDataTable>

    <C31DetailModal v-model="detailOpen" :comprobante="store.selected" />
  </div>
</template>
