<script setup lang="ts">
import { rolLabel } from '@/constants/roles'
import IconButton from '@/components/ui/IconButton.vue'
import { onMounted, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { extractApiErrorMessage } from '@/utils/http-error'
import UsuarioModal from '../components/UsuarioModal.vue'
import { usuariosService } from '@/services/usuarios.service'
import { useAuthStore } from '@/stores/auth.store'
import type { Usuario, UsuarioCreatePayload, UsuarioUpdatePayload } from '@/types/auth.types'

const auth = useAuthStore()

const rows = ref<Usuario[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const loading = ref(false)
const modalOpen = ref(false)
const saving = ref(false)
const editingUsuario = ref<Usuario | null>(null)
const togglingId = ref<string | null>(null)

const columns: DataTableColumn<Usuario>[] = [
  { key: 'nombreCompleto', label: 'Nombre', sortable: true },
  { key: 'username', label: 'Usuario' },
  { key: 'email', label: 'Correo' },
  { key: 'rol', label: 'Rol' },
  { key: 'activo', label: 'Estado' },
]

async function loadRows() {
  loading.value = true
  try {
    const res = await usuariosService.list({ page: page.value, pageSize })
    rows.value = res.data
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingUsuario.value = null
  modalOpen.value = true
}

function openEdit(row: Usuario) {
  editingUsuario.value = row
  modalOpen.value = true
}

async function handleCreate(payload: UsuarioCreatePayload) {
  saving.value = true
  try {
    saveError.value = ''
    await usuariosService.create(payload)
    modalOpen.value = false
    await loadRows()
  } catch (err) {
    saveError.value = extractApiErrorMessage(err, 'No se pudo guardar el usuario.')
  } finally {
    saving.value = false
  }
}

const saveError = ref('')

async function handleUpdate(id: string, payload: UsuarioUpdatePayload) {
  saving.value = true
  try {
    saveError.value = ''
    await usuariosService.update(id, payload)
    modalOpen.value = false
    await loadRows()
  } catch (err) {
    saveError.value = extractApiErrorMessage(err, 'No se pudo guardar el usuario.')
  } finally {
    saving.value = false
  }
}

async function handleToggleActivo(row: Usuario) {
  if (row.id === auth.usuario?.id) {
    alert('No puedes desactivar tu propia cuenta.')
    return
  }
  togglingId.value = row.id
  try {
    await usuariosService.toggleActivo(row.id, !row.activo)
    await loadRows()
  } finally {
    togglingId.value = null
  }
}

onMounted(loadRows)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Usuarios</h1>
        <p class="text-sm text-ink-400">
          Registro y control de acceso al sistema. Solo visible para el rol ADMIN.
        </p>
      </div>
      <BaseButton @click="openCreate">+ Registrar usuario</BaseButton>
    </div>

    <BaseDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="page"
      :total-pages="Math.max(1, Math.ceil(total / pageSize))"
      empty-message="Aún no hay usuarios registrados."
      @update:page="
        (p) => {
          page = p
          loadRows()
        }
      "
      @row-click="openEdit"
    >
      <template #cell-rol="{ row }">
        <div class="flex flex-wrap gap-1">
          <span
            v-for="r in row.rolesDisponibles?.length ? row.rolesDisponibles : [row.rol]"
            :key="r"
            class="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700 dark:bg-white/10 dark:text-ink-200"
          >
            {{ rolLabel(r) }}
          </span>
        </div>
      </template>
      <template #cell-email="{ row }">
        <span>{{ row.email }}</span>
        <span
          class="ml-2 rounded-full px-2 py-0.5 text-xs font-medium"
          :class="
            row.emailVerificado
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300'
          "
          >{{ row.emailVerificado ? 'Verificado' : 'Sin verificar' }}</span
        >
      </template>
      <template #cell-activo="{ row }">
        <BaseBadge :estado="row.activo ? 'EN_ARCHIVO' : 'ANULADO'">
          {{ row.activo ? 'Activo' : 'Inactivo' }}
        </BaseBadge>
      </template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-2">
          <IconButton icon="fa-pen-to-square" label="Editar" @click="openEdit(row)" />
          <IconButton
            :icon="row.activo ? 'fa-user-slash' : 'fa-user-check'"
            :label="row.activo ? 'Desactivar usuario' : 'Activar usuario'"
            :variant="row.activo ? 'danger' : 'success'"
            :disabled="row.id === auth.usuario?.id"
            :loading="togglingId === row.id"
            @click="handleToggleActivo(row)"
          />
        </div>
      </template>
    </BaseDataTable>

    <UsuarioModal
      :server-error="saveError"
      v-model="modalOpen"
      :usuario="editingUsuario"
      :saving="saving"
      @create="handleCreate"
      @update="handleUpdate"
    />
  </div>
</template>
