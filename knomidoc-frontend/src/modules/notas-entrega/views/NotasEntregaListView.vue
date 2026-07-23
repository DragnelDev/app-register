<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import NotaEntregaModal from '../components/NotaEntregaModal.vue'
import { notasEntregaService } from '@/services/notas-entrega.service'
import type { NotaEntrega, NotaEntregaCreatePayload } from '@/types/notas-entrega.types'

const rows = ref<NotaEntrega[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const loading = ref(false)
const modalOpen = ref(false)
const saving = ref(false)
const editingNota = ref<NotaEntrega | null>(null)

const columns: DataTableColumn<NotaEntrega>[] = [
  { key: 'numeroNota', label: 'N° de nota', sortable: true },
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
  modalOpen.value = true
}

function openEdit(row: NotaEntrega) {
  editingNota.value = row
  modalOpen.value = true
}

async function handleSave(payload: NotaEntregaCreatePayload) {
  saving.value = true
  try {
    if (editingNota.value) {
      await notasEntregaService.update(editingNota.value.id, payload)
    } else {
      await notasEntregaService.create(payload)
    }
    modalOpen.value = false
    await loadRows()
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: NotaEntrega) {
  if (!confirm(`¿Eliminar la nota de entrega ${row.numeroNota}?`)) return
  await notasEntregaService.remove(row.id)
  await loadRows()
}

onMounted(loadRows)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Notas de entrega</h1>
        <p class="text-sm text-ink-400">Carga inicial y respaldo digitalizado de comprobantes.</p>
      </div>
      <BaseButton @click="openCreate">+ Registrar nota</BaseButton>
    </div>

    <BaseDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="page"
      :total-pages="Math.max(1, Math.ceil(total / pageSize))"
      empty-message="Aún no se registraron notas de entrega."
      @update:page="(p) => { page = p; loadRows() }"
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
      @save="handleSave"
    />
  </div>
</template>
