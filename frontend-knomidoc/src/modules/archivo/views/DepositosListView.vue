<script setup lang="ts">
import IconButton from '@/components/ui/IconButton.vue'
import { onMounted, ref, watch } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import DepositoModal from '../components/DepositoModal.vue'
import { depositosService } from '@/services/archivo.service'
import { useAuthStore } from '@/stores/auth.store'
import { useResumenStore } from '@/stores/resumen.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { Deposito, DepositoPayload } from '@/types/archivo.types'

const auth = useAuthStore()
const resumen = useResumenStore()

const rows = ref<Deposito[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const search = ref('')
const loading = ref(false)
const modalOpen = ref(false)
const saving = ref(false)
const editing = ref<Deposito | null>(null)
const formError = ref('')
const listError = ref('')

const columns: DataTableColumn<Deposito>[] = [
  { key: 'codigo', label: 'Código', sortable: true },
  { key: 'nombre', label: 'Nombre', sortable: true },
  { key: 'ubicacion', label: 'Ubicación' },
  { key: 'totalEstantes', label: 'Estantes' },
  { key: 'activo', label: 'Estado' },
]

async function loadRows() {
  loading.value = true
  listError.value = ''
  try {
    const res = await depositosService.list({
      page: page.value,
      pageSize,
      search: search.value || undefined,
    })
    rows.value = res.data
    total.value = res.total
  } catch (err) {
    listError.value = extractApiErrorMessage(err, 'No se pudieron cargar los depósitos.')
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    loadRows()
  }, 350)
})

function openCreate() {
  editing.value = null
  formError.value = ''
  modalOpen.value = true
}

function openEdit(row: Deposito) {
  if (!auth.puedeGestionarArchivo) return
  editing.value = row
  formError.value = ''
  modalOpen.value = true
}

async function handleSave(payload: DepositoPayload, id?: number) {
  saving.value = true
  formError.value = ''
  try {
    if (id) await depositosService.update(id, payload)
    else await depositosService.create(payload)
    modalOpen.value = false
    await loadRows()
    resumen.fetch()
  } catch (err) {
    formError.value = extractApiErrorMessage(err, 'No se pudo guardar el depósito.')
  } finally {
    saving.value = false
  }
}

async function handleRemove(row: Deposito) {
  if (!confirm(`¿Eliminar el depósito "${row.codigo}"?`)) return
  listError.value = ''
  try {
    await depositosService.remove(row.id)
    await loadRows()
    resumen.fetch()
  } catch (err) {
    listError.value = extractApiErrorMessage(err, 'No se pudo eliminar el depósito.')
  }
}

onMounted(loadRows)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Depósitos de archivo</h1>
        <p class="text-sm text-ink-500 dark:text-ink-400">
          Ambientes físicos que contienen los estantes y carpetas del archivo.
        </p>
      </div>
      <BaseButton v-if="auth.puedeGestionarArchivo" @click="openCreate">
        <i class="fa-solid fa-plus" aria-hidden="true" /> Registrar depósito
      </BaseButton>
    </div>

    <BaseInput
      v-model="search"
      placeholder="Buscar por código, nombre o ubicación…"
      class="max-w-xs"
    />
    <p v-if="listError" class="text-sm text-red-600">{{ listError }}</p>

    <BaseDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="page"
      :total-pages="Math.max(1, Math.ceil(total / pageSize))"
      empty-message="Aún no hay depósitos registrados."
      @update:page="
        (p) => {
          page = p
          loadRows()
        }
      "
      @row-click="openEdit"
    >
      <template #cell-ubicacion="{ row }">{{ row.ubicacion || '—' }}</template>
      <template #cell-totalEstantes="{ row }">
        <RouterLink
          class="font-medium text-seal-600 hover:underline dark:text-seal-300"
          :to="{ path: '/archivo/estantes', query: { depositoId: row.id } }"
          @click.stop
        >
          {{ row.totalEstantes ?? 0 }}
        </RouterLink>
      </template>
      <template #cell-activo="{ row }">
        <span
          class="badge"
          :class="
            row.activo
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300'
              : 'bg-ink-100 text-ink-600 dark:bg-white/10 dark:text-ink-300'
          "
        >
          {{ row.activo ? 'Activo' : 'Inactivo' }}
        </span>
      </template>
      <template v-if="auth.puedeGestionarArchivo" #actions="{ row }">
        <div class="flex justify-end gap-2">
          <IconButton icon="fa-pen-to-square" label="Editar" @click="openEdit(row)" />
          <IconButton
            v-if="auth.isAdmin"
            icon="fa-trash-can"
            label="Eliminar"
            variant="danger"
            @click="handleRemove(row)"
          />
        </div>
      </template>
    </BaseDataTable>

    <DepositoModal
      v-model="modalOpen"
      :deposito="editing"
      :saving="saving"
      :error-message="formError"
      @save="handleSave"
    />
  </div>
</template>
