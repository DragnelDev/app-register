<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import IconButton from '@/components/ui/IconButton.vue'
import FuncionarioModal from '../components/FuncionarioModal.vue'
import { useFuncionariosStore } from '@/stores/funcionarios.store'
import { useAuthStore } from '@/stores/auth.store'
import { funcionariosService } from '@/services/funcionarios.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { Funcionario, FuncionarioPayload } from '@/types/funcionarios.types'

const store = useFuncionariosStore()
const auth = useAuthStore()

const modalOpen = ref(false)
const editando = ref<Funcionario | null>(null)
const saving = ref(false)
const saveError = ref('')
const listError = ref('')
const togglingId = ref<number | null>(null)

const columns: DataTableColumn<Funcionario>[] = [
  { key: 'ci', label: 'CI' },
  { key: 'apellidos', label: 'Funcionario', sortable: true },
  { key: 'cargo', label: 'Cargo' },
  { key: 'unidadOficina', label: 'Unidad / oficina' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'huellaRegistradaEn', label: 'Huella' },
  { key: 'estado', label: 'Estado' },
]

const unidades = ref<string[]>([])
const campo =
  'rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'

function filtrar() {
  store.page = 1
  cargar()
}
function limpiarFiltros() {
  store.setFilters({ search: '', estado: '', unidad: '', cargo: '', conHuella: '', conPrestamosActivos: '' })
  cargar()
}

async function cargar() {
  try {
    listError.value = ''
    await store.fetchList()
  } catch (err) {
    listError.value = extractApiErrorMessage(err, 'No se pudo cargar el directorio.')
  }
}

function nuevo() {
  editando.value = null
  saveError.value = ''
  modalOpen.value = true
}

function editar(f: Funcionario) {
  editando.value = f
  saveError.value = ''
  modalOpen.value = true
}

async function crear(payload: FuncionarioPayload) {
  saving.value = true
  saveError.value = ''
  try {
    await store.crear(payload)
    modalOpen.value = false
  } catch (err) {
    saveError.value = extractApiErrorMessage(err, 'No se pudo guardar el funcionario.')
  } finally {
    saving.value = false
  }
}

async function actualizar(id: number, payload: Partial<FuncionarioPayload>) {
  saving.value = true
  saveError.value = ''
  try {
    await store.actualizar(id, payload)
    modalOpen.value = false
  } catch (err) {
    saveError.value = extractApiErrorMessage(err, 'No se pudo guardar el funcionario.')
  } finally {
    saving.value = false
  }
}

async function alCambiarHuella() {
  await cargar()
  if (editando.value) editando.value = store.items.find((x) => x.id === editando.value?.id) ?? editando.value
}

async function alternarEstado(f: Funcionario) {
  togglingId.value = f.id
  try {
    await store.actualizar(f.id, { estado: f.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' })
  } catch (err) {
    listError.value = extractApiErrorMessage(err, 'No se pudo cambiar el estado.')
  } finally {
    togglingId.value = null
  }
}

async function eliminar(f: Funcionario) {
  if (!confirm(`¿Eliminar a ${f.nombres} ${f.apellidos}? Esta acción no se puede deshacer.`)) return
  try {
    await store.eliminar(f.id)
  } catch (err) {
    listError.value = extractApiErrorMessage(err, 'No se pudo eliminar el funcionario.')
  }
}

onMounted(() => {
  store.setFilters({ search: '', estado: '', unidad: '', cargo: '', conHuella: '', conPrestamosActivos: '' })
  cargar()
  funcionariosService.unidades().then((u) => (unidades.value = u)).catch(() => {})
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Funcionarios</h1>
        <p class="text-sm text-ink-500 dark:text-ink-400">
          Directorio interno de quienes solicitan préstamos o reciben documentación. No tienen
          acceso al sistema.
        </p>
      </div>
      <BaseButton @click="nuevo">+ Registrar funcionario</BaseButton>
    </div>

    <form class="card flex flex-wrap items-end gap-3 p-4" @submit.prevent="filtrar">
      <div class="min-w-[220px] flex-1">
        <label class="mb-1 block text-xs font-medium text-ink-500" for="f-buscar">Buscar</label>
        <input id="f-buscar" v-model="store.search" type="search" placeholder="CI, nombre, apellido o unidad…" :class="[campo, 'w-full']" />
      </div>
      <div class="w-56">
        <label class="mb-1 block text-xs font-medium text-ink-500" for="f-unidad">Unidad / oficina</label>
        <select id="f-unidad" v-model="store.unidad" :class="[campo, 'w-full']">
          <option value="">Todas</option>
          <option v-for="u in unidades" :key="u" :value="u">{{ u }}</option>
        </select>
      </div>
      <div class="w-44">
        <label class="mb-1 block text-xs font-medium text-ink-500" for="f-cargo">Cargo</label>
        <input id="f-cargo" v-model="store.cargo" type="text" placeholder="Ej: Jefe…" :class="[campo, 'w-full']" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-ink-500" for="f-estado">Estado</label>
        <select id="f-estado" v-model="store.estado" :class="campo">
          <option value="">Todos</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-ink-500" for="f-huella">Huella</label>
        <select id="f-huella" v-model="store.conHuella" :class="campo">
          <option value="">Todas</option>
          <option value="true">Con huella</option>
          <option value="false">Sin huella</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-ink-500" for="f-prest">Préstamos</label>
        <select id="f-prest" v-model="store.conPrestamosActivos" :class="campo">
          <option value="">Todos</option>
          <option value="true">Con documentos prestados</option>
        </select>
      </div>
      <BaseButton type="submit" size="sm"><i class="fa-solid fa-filter mr-1" aria-hidden="true" /> Filtrar</BaseButton>
      <BaseButton type="button" variant="secondary" size="sm" @click="limpiarFiltros">Limpiar</BaseButton>
    </form>

    <p v-if="listError" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
      {{ listError }}
    </p>

    <BaseDataTable
      :columns="columns"
      :rows="store.items"
      :loading="store.loading"
      :page="store.page"
      :total-pages="store.totalPages"
      empty-message="No hay funcionarios que coincidan."
      @update:page="(p) => { store.page = p; cargar() }"
      @row-click="editar"
    >
      <template #cell-apellidos="{ row }">{{ row.nombres }} {{ row.apellidos }}</template>
      <template #cell-telefono="{ row }">{{ row.telefono || '—' }}</template>
      <template #cell-huellaRegistradaEn="{ row }">
        <i
          class="fa-solid fa-fingerprint"
          :class="row.huellaRegistradaEn ? 'text-emerald-500' : 'text-ink-300 dark:text-ink-600'"
          :title="row.huellaRegistradaEn ? 'Huella registrada' : 'Sin huella'"
          aria-hidden="true"
        />
      </template>
      <template #cell-estado="{ row }">
        <BaseBadge :estado="row.estado === 'ACTIVO' ? 'EN_ARCHIVO' : 'ANULADO'">
          {{ row.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
        </BaseBadge>
      </template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-1">
          <IconButton icon="fa-pen-to-square" label="Editar" @click="editar(row)" />
          <IconButton
            :icon="row.estado === 'ACTIVO' ? 'fa-user-slash' : 'fa-user-check'"
            :label="row.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'"
            :variant="row.estado === 'ACTIVO' ? 'danger' : 'success'"
            :loading="togglingId === row.id"
            @click="alternarEstado(row)"
          />
          <IconButton
            v-if="auth.isAdmin"
            icon="fa-trash"
            label="Eliminar (solo sin préstamos)"
            variant="danger"
            @click="eliminar(row)"
          />
        </div>
      </template>
    </BaseDataTable>

    <FuncionarioModal
      v-model="modalOpen"
      :funcionario="editando"
      :saving="saving"
      :server-error="saveError"
      @create="crear"
      @update="actualizar"
      @huella="alCambiarHuella"
    />
  </div>
</template>
