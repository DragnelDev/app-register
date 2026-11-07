<script setup lang="ts">
import IconButton from '@/components/ui/IconButton.vue'
import BarcodeModal from '@/components/shared/BarcodeModal.vue'
import { imprimirEtiquetas, type EtiquetaArchivo } from '@/utils/etiquetas'
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import CarpetaModal from '../components/CarpetaModal.vue'
import { carpetasService } from '@/services/carpetas.service'
import { estantesService } from '@/services/archivo.service'
import { useAuthStore } from '@/stores/auth.store'
import { useResumenStore } from '@/stores/resumen.store'
import type { Estante } from '@/types/archivo.types'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { Carpeta, CarpetaCreatePayload, CarpetaUpdatePayload } from '@/types/c31.types'

const auth = useAuthStore()
const resumen = useResumenStore()
const route = useRoute()
const estantes = ref<Estante[]>([])
const estanteFiltro = ref<string | number>((route.query.estanteId as string) ?? '')
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
  { key: 'estanteId', label: 'Estante' },
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
      estanteId: estanteFiltro.value || undefined,
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
watch([search, estanteFiltro], () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadRows()
  }, 350)
})

// ── Códigos de barras ──
const barrasOpen = ref(false)
const etiquetaSel = ref<EtiquetaArchivo | null>(null)
const aEtiqueta = (row: (typeof rows.value)[number]): EtiquetaArchivo => ({
  codigo: row.codigoCarpeta,
  titulo: `Carpeta ${row.codigoCarpeta}`,
  subtitulo: row.estante ? `${row.estante.deposito?.codigo ?? ''} / ${row.estante.codigo}` : row.ubicacionFisica,
})
function verBarras(row: (typeof rows.value)[number]) {
  etiquetaSel.value = aEtiqueta(row)
  barrasOpen.value = true
}
function imprimirTodas() {
  if (!rows.value.length) return
  imprimirEtiquetas(rows.value.map(aEtiqueta), 'Etiquetas de carpetas')
}

function openCreate() {
  editingCarpeta.value = null
  formError.value = ''
  modalOpen.value = true
}

function openEdit(row: Carpeta) {
  if (!auth.puedeGestionarArchivo) return
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
    resumen.fetch()
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

onMounted(async () => {
  estantes.value = await estantesService.opciones().catch(() => [])
  await loadRows()
})
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
      <div class="flex flex-wrap gap-2">
        <BaseButton variant="secondary" :disabled="!rows.length" @click="imprimirTodas">
          <i class="fa-solid fa-barcode mr-1" aria-hidden="true" /> Imprimir etiquetas
        </BaseButton>
      <BaseButton v-if="auth.puedeGestionarArchivo" @click="openCreate">
        <i class="fa-solid fa-plus" aria-hidden="true" /> Registrar carpeta
      </BaseButton>
      </div>
    </div>

    <div class="flex flex-wrap items-end gap-3">
      <BaseInput v-model="search" placeholder="Buscar por código o ubicación…" class="w-72" />
      <BaseSelect
        v-model="estanteFiltro"
        placeholder="Todos los estantes"
        class="w-64"
        :options="
          estantes.map((e) => ({ value: e.id, label: `${e.deposito?.codigo ?? ''} / ${e.codigo}` }))
        "
      />
    </div>

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
      <template #cell-estanteId="{ row }">
        {{ row.estante ? `${row.estante.deposito?.codigo ?? ''} / ${row.estante.codigo}` : '—' }}
      </template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-2">
          <IconButton icon="fa-barcode" label="Ver código de barras" @click="verBarras(row)" />
          <IconButton v-if="auth.puedeGestionarArchivo" icon="fa-pen-to-square" label="Editar" @click="openEdit(row)" />
          <IconButton
            v-if="auth.puedeGestionarArchivo"
            icon="fa-trash-can"
            label="Eliminar"
            variant="danger"
            :disabled="row.estadoFisico === 'PRESTADO'"
            :loading="removingId === row.id"
            @click="handleRemove(row)"
          />
        </div>
      </template>
    </BaseDataTable>

    <CarpetaModal
      v-model="modalOpen"
      :carpeta="editingCarpeta"
      :estantes="estantes"
      :saving="saving"
      :error-message="formError"
      @create="handleCreate"
      @update="handleUpdate"
    />
    <BarcodeModal v-model="barrasOpen" :etiqueta="etiquetaSel" />
  </div>
</template>
