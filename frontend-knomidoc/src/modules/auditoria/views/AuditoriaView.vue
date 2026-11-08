<script setup lang="ts">
import { fechaHora } from '@/utils/estados'
import IconButton from '@/components/ui/IconButton.vue'
import { onMounted, reactive, ref, watch } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { auditoriaService } from '@/services/gestion.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { AuditoriaFiltros, AuditoriaLog } from '@/types/gestion.types'

const rows = ref<AuditoriaLog[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const error = ref('')
const opciones = ref<AuditoriaFiltros>({ entidades: [], acciones: [] })
const detalle = ref<AuditoriaLog | null>(null)
const detalleOpen = ref(false)

const filtros = reactive({ search: '', entidad: '', accion: '', fechaDesde: '', fechaHasta: '' })

const columns: DataTableColumn<AuditoriaLog>[] = [
  { key: 'fecha', label: 'Fecha y hora' },
  { key: 'usuarioNombre', label: 'Usuario' },
  { key: 'accion', label: 'Acción' },
  { key: 'entidad', label: 'Recurso' },
  { key: 'registroId', label: 'Registro' },
]

const TONOS: Record<string, string> = {
  CREAR: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
  ACTUALIZAR: 'bg-seal-100 text-seal-800 dark:bg-seal-400/15 dark:text-seal-300',
  ELIMINAR: 'bg-red-50 text-red-800 dark:bg-red-400/15 dark:text-red-300',
  LOGIN: 'bg-ink-100 text-ink-700 dark:bg-white/10 dark:text-ink-200',
}

const formatoFecha = (iso: string) =>
  fechaHora(iso)

async function loadRows() {
  loading.value = true
  error.value = ''
  try {
    const res = await auditoriaService.list({ page: page.value, pageSize, ...filtros })
    rows.value = res.data
    total.value = res.total
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo cargar el historial.')
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(filtros, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    loadRows()
  }, 350)
})

function limpiar() {
  Object.assign(filtros, { search: '', entidad: '', accion: '', fechaDesde: '', fechaHasta: '' })
}

function ver(row: AuditoriaLog) {
  detalle.value = row
  detalleOpen.value = true
}

onMounted(async () => {
  opciones.value = await auditoriaService.filtros().catch(() => ({ entidades: [], acciones: [] }))
  await loadRows()
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold">Auditoría / Historial</h1>
      <p class="text-sm text-ink-500 dark:text-ink-400">
        Bitácora de quién hizo qué y cuándo. Se registra automáticamente toda alta, edición,
        eliminación e inicio de sesión.
      </p>
    </div>

    <div class="card flex flex-wrap items-end gap-3 p-4">
      <BaseInput
        v-model="filtros.search"
        label="Buscar"
        placeholder="Usuario, ruta o N° de registro…"
        class="w-64"
      />
      <BaseSelect
        v-model="filtros.entidad"
        label="Recurso"
        placeholder="Todos"
        class="w-52"
        :options="opciones.entidades.map((e) => ({ value: e, label: e }))"
      />
      <BaseSelect
        v-model="filtros.accion"
        label="Acción"
        placeholder="Todas"
        class="w-44"
        :options="opciones.acciones.map((a) => ({ value: a, label: a }))"
      />
      <BaseInput v-model="filtros.fechaDesde" type="date" label="Desde" />
      <BaseInput v-model="filtros.fechaHasta" type="date" label="Hasta" />
      <BaseButton variant="secondary" @click="limpiar">Limpiar</BaseButton>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <BaseDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="page"
      :total-pages="Math.max(1, Math.ceil(total / pageSize))"
      empty-message="No hay registros de auditoría con esos filtros."
      @update:page="
        (p) => {
          page = p
          loadRows()
        }
      "
      @row-click="ver"
    >
      <template #cell-fecha="{ row }">{{ formatoFecha(row.fecha) }}</template>
      <template #cell-usuarioNombre="{ row }">
        {{ row.usuarioNombre ?? '—' }}
        <span v-if="row.rol" class="block text-xs text-ink-500 dark:text-ink-400">{{
          row.rol
        }}</span>
      </template>
      <template #cell-accion="{ row }">
        <span
          class="badge"
          :class="
            TONOS[row.accion] ??
            'bg-amber-50 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300'
          "
          >{{ row.accion }}</span
        >
      </template>
      <template #cell-registroId="{ row }">{{ row.registroId ?? '—' }}</template>
      <template #actions="{ row }">
        <IconButton icon="fa-eye" label="Ver detalle" @click="ver(row)" />
      </template>
    </BaseDataTable>

    <BaseModal v-model="detalleOpen" title="Detalle del evento" size="md">
      <dl v-if="detalle" class="space-y-2 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-ink-500">Fecha</dt>
          <dd>{{ formatoFecha(detalle.fecha) }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-ink-500">Usuario</dt>
          <dd>{{ detalle.usuarioNombre ?? '—' }} ({{ detalle.rol ?? '—' }})</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-ink-500">Operación</dt>
          <dd class="font-mono text-xs">{{ detalle.metodo }} {{ detalle.ruta }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-ink-500">IP</dt>
          <dd>{{ detalle.ip ?? '—' }}</dd>
        </div>
        <div>
          <dt class="mb-1 text-ink-500">Datos enviados</dt>
          <dd>
            <pre
              v-if="detalle.detalle"
              class="max-h-64 overflow-auto rounded-md bg-ink-50 p-3 text-xs dark:bg-ink-950"
              >{{ JSON.stringify(detalle.detalle, null, 2) }}</pre>
            <span v-else class="text-ink-500">Sin datos adicionales.</span>
          </dd>
        </div>
      </dl>
    </BaseModal>
  </div>
</template>
