<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import CarpetaModal from '../components/CarpetaModal.vue'
import { carpetasService } from '@/services/carpetas.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { Carpeta, CarpetaCreatePayload, CarpetaUpdatePayload } from '@/types/c31.types'

const rows = ref<Carpeta[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const search = ref('')
const loading = ref(false)
const modalOpen = ref(false)
const saving = ref(false)
const editingCarpeta = ref<Carpeta | null>(null)
const formError = ref('')
const listError = ref('')
const removingId = ref<string | number | null>(null)

const columns: DataTableColumn<Carpeta>[] = [
  { key: 'codigoCarpeta', label: 'Código', sortable: true },
  { key: 'ubicacionFisica', label: 'Ubicación física' },
  { key: 'estadoFisico', label: 'Estado' },
]

async function loadRows() {
  loading.value = true
  listError.value = ''
  try {
    const res = await carpetasService.list({
      page: page.value,
      pageSize,
      search: search.value || undefined,
    })
    rows.value = res.data
    total.value = res.total
  } catch (err) {
    listError.value = extractApiErrorMessage(err, 'No se pudieron cargar las carpetas.')
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadRows()
  }, 350)
})

function openCreate() {
  editingCarpeta.value = null
  formError.value = ''
  modalOpen.value = true
}

function openEdit(row: Carpeta) {
  editingCarpeta.value = row
  formError.value = ''
  modalOpen.value = true
}

async function handleCreate(payload: CarpetaCreatePayload) {
  saving.value = true
  formError.value = ''
  try {
    await carpetasService.create(payload)
    modalOpen.value = false
    await loadRows()
  } catch (err) {
    formError.value = extractApiErrorMessage(err, 'No se pudo registrar la carpeta.')
  } finally {
    saving.value = false
  }
}

async function handleUpdate(id: string | number, payload: CarpetaUpdatePayload) {
  saving.value = true
  formError.value = ''
  try {
    await carpetasService.update(id, payload)
    modalOpen.value = false
    await loadRows()
  } catch (err) {
    formError.value = extractApiErrorMessage(err, 'No se pudo actualizar la carpeta.')
  } finally {
    saving.value = false
  }
}

async function handleRemove(row: Carpeta) {
  if (!confirm(`¿Eliminar la carpeta "${row.codigoCarpeta}"?`)) return
  removingId.value = row.id
  listError.value = ''
  try {
    await carpetasService.remove(row.id)
    await loadRows()
  } catch (err) {
    listError.value = extractApiErrorMessage(err, 'No se pudo eliminar la carpeta.')
  } finally {
    removingId.value = null
  }
}

onMounted(loadRows)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Carpetas</h1>
        <p class="text-sm text-ink-400">
          Códigos y ubicación física del archivo, usados para asignar comprobantes C31.
        </p>
      </div>
      <BaseButton @click="openCreate">+ Registrar carpeta</BaseButton>
    </div>

    <BaseInput v-model="search" placeholder="Buscar por código o ubicación…" class="max-w-xs" />

    <p v-if="listError" class="text-sm text-red-600">{{ listError }}</p>

    <BaseDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="page"
      :total-pages="Math.max(1, Math.ceil(total / pageSize))"
      empty-message="Aún no hay carpetas registradas."
      @update:page="
        (p) => {
          page = p
          loadRows()
        }
      "
      @row-click="openEdit"
    >
      <template #cell-estadoFisico="{ row }">
        <BaseBadge :estado="row.estadoFisico ?? 'EN_ARCHIVO'" />
      </template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-2">
          <BaseButton variant="ghost" size="sm" @click="openEdit(row)">Editar</BaseButton>
          <BaseButton
            variant="danger"
            size="sm"
            :disabled="row.estadoFisico === 'PRESTADO'"
            :loading="removingId === row.id"
            @click="handleRemove(row)"
          >
            Eliminar
          </BaseButton>
        </div>
      </template>
    </BaseDataTable>

    <CarpetaModal
      v-model="modalOpen"
      :carpeta="editingCarpeta"
      :saving="saving"
      :error-message="formError"
      @create="handleCreate"
      @update="handleUpdate"
    />
  </div>
</template>
