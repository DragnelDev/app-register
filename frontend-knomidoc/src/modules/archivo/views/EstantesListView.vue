<script setup lang="ts">
import IconButton from '@/components/ui/IconButton.vue'
import BarcodeModal from '@/components/shared/BarcodeModal.vue'
import { imprimirEtiquetas, type EtiquetaArchivo } from '@/utils/etiquetas'
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import EstanteModal from '../components/EstanteModal.vue'
import { depositosService, estantesService } from '@/services/archivo.service'
import { useAuthStore } from '@/stores/auth.store'
import { useResumenStore } from '@/stores/resumen.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { Deposito, Estante, EstantePayload } from '@/types/archivo.types'

const auth = useAuthStore()
const resumen = useResumenStore()
const route = useRoute()

const rows = ref<Estante[]>([])
const depositos = ref<Deposito[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const search = ref('')
const depositoId = ref<string | number>((route.query.depositoId as string) ?? '')
const loading = ref(false)
const modalOpen = ref(false)
const saving = ref(false)
const editing = ref<Estante | null>(null)
const formError = ref('')
const listError = ref('')

const columns: DataTableColumn<Estante>[] = [
  { key: 'codigo', label: 'Código', sortable: true },
  { key: 'depositoId', label: 'Depósito' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'niveles', label: 'Niveles' },
  { key: 'totalCarpetas', label: 'Carpetas' },
  { key: 'activo', label: 'Estado' },
]

async function loadRows() {
  loading.value = true
  listError.value = ''
  try {
    const res = await estantesService.list({
      page: page.value,
      pageSize,
      search: search.value || undefined,
      depositoId: depositoId.value || undefined,
    })
    rows.value = res.data
    total.value = res.total
  } catch (err) {
    listError.value = extractApiErrorMessage(err, 'No se pudieron cargar los estantes.')
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch([search, depositoId], () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    loadRows()
  }, 300)
})

// ── Códigos de barras ──
const barrasOpen = ref(false)
const etiquetaSel = ref<EtiquetaArchivo | null>(null)
const aEtiqueta = (row: (typeof rows.value)[number]): EtiquetaArchivo => ({
  codigo: row.codigo,
  titulo: `Estante ${row.codigo}`,
  subtitulo: row.deposito ? `Depósito ${row.deposito.codigo}` : undefined,
})
function verBarras(row: (typeof rows.value)[number]) {
  etiquetaSel.value = aEtiqueta(row)
  barrasOpen.value = true
}
function imprimirTodas() {
  if (!rows.value.length) return
  imprimirEtiquetas(rows.value.map(aEtiqueta), 'Etiquetas de estantes')
}

function openCreate() {
  editing.value = null
  formError.value = ''
  modalOpen.value = true
}

function openEdit(row: Estante) {
  if (!auth.puedeGestionarArchivo) return
  editing.value = row
  formError.value = ''
  modalOpen.value = true
}

async function handleSave(payload: EstantePayload, id?: number) {
  saving.value = true
  formError.value = ''
  try {
    if (id) await estantesService.update(id, payload)
    else await estantesService.create(payload)
    modalOpen.value = false
    await loadRows()
    resumen.fetch()
  } catch (err) {
    formError.value = extractApiErrorMessage(err, 'No se pudo guardar el estante.')
  } finally {
    saving.value = false
  }
}

async function handleRemove(row: Estante) {
  if (!confirm(`¿Eliminar el estante "${row.codigo}"?`)) return
  listError.value = ''
  try {
    await estantesService.remove(row.id)
    await loadRows()
    resumen.fetch()
  } catch (err) {
    listError.value = extractApiErrorMessage(err, 'No se pudo eliminar el estante.')
  }
}

onMounted(async () => {
  depositos.value = await depositosService.opciones().catch(() => [])
  await loadRows()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Estantes</h1>
        <p class="text-sm text-ink-500 dark:text-ink-400">
          Estantes de cada depósito; las carpetas se ubican dentro de un estante.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <BaseButton variant="secondary" :disabled="!rows.length" @click="imprimirTodas">
          <i class="fa-solid fa-barcode mr-1" aria-hidden="true" /> Imprimir etiquetas
        </BaseButton>
        <BaseButton v-if="auth.puedeGestionarArchivo" @click="openCreate">
          <i class="fa-solid fa-plus" aria-hidden="true" /> Registrar estante
        </BaseButton>
      </div>
    </div>

    <div class="flex flex-wrap items-end gap-3">
      <BaseInput v-model="search" placeholder="Buscar por código o descripción…" class="w-72" />
      <BaseSelect
        v-model="depositoId"
        placeholder="Todos los depósitos"
        class="w-64"
        :options="depositos.map((d) => ({ value: d.id, label: `${d.codigo} — ${d.nombre}` }))"
      />
    </div>
    <p v-if="listError" class="text-sm text-red-600">{{ listError }}</p>

    <BaseDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="page"
      :total-pages="Math.max(1, Math.ceil(total / pageSize))"
      empty-message="No hay estantes que coincidan."
      @update:page="
        (p) => {
          page = p
          loadRows()
        }
      "
      @row-click="openEdit"
    >
      <template #cell-depositoId="{ row }">{{
        row.deposito ? `${row.deposito.codigo} — ${row.deposito.nombre}` : '—'
      }}</template>
      <template #cell-descripcion="{ row }">{{ row.descripcion || '—' }}</template>
      <template #cell-niveles="{ row }">{{ row.niveles ?? '—' }}</template>
      <template #cell-totalCarpetas="{ row }">
        <RouterLink
          class="font-medium text-seal-600 hover:underline dark:text-seal-300"
          :to="{ path: '/carpetas', query: { estanteId: row.id } }"
          @click.stop
        >
          {{ row.totalCarpetas ?? 0 }}
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
      <template #actions="{ row }">
        <div class="flex justify-end gap-2">
          <IconButton icon="fa-barcode" label="Ver código de barras" @click="verBarras(row)" />
          <IconButton
            v-if="auth.puedeGestionarArchivo"
            icon="fa-pen-to-square"
            label="Editar"
            @click="openEdit(row)"
          />
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

    <EstanteModal
      v-model="modalOpen"
      :estante="editing"
      :depositos="depositos"
      :saving="saving"
      :error-message="formError"
      @save="handleSave"
    />
    <BarcodeModal v-model="barrasOpen" :etiqueta="etiquetaSel" />
  </div>
</template>
