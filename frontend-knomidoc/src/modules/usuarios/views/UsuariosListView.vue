<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
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
  { key: 'email', label: 'Correo' },
  { key: 'rol', label: 'Rol' },
  { key: 'estado', label: 'Estado' },
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
    await usuariosService.create(payload)
    modalOpen.value = false
    await loadRows()
  } finally {
    saving.value = false
  }
}

async function handleUpdate(id: string, payload: UsuarioUpdatePayload) {
  saving.value = true
  try {
    await usuariosService.update(id, payload)
    modalOpen.value = false
    await loadRows()
  } finally {
    saving.value = false
  }
}

async function handleToggleEstado(row: Usuario) {
  if (row.id === auth.usuario?.id) {
    alert('No puedes desactivar tu propia cuenta.')
    return
  }
  togglingId.value = row.id
  try {
    await usuariosService.toggleEstado(row.id, !row.estado)
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

    <BaseDataTable :columns="columns" :rows="rows" :loading="loading" :page="page"
      :total-pages="Math.max(1, Math.ceil(total / pageSize))" empty-message="Aún no hay usuarios registrados."
      @update:page="(p) => { page = p; loadRows() }" @row-click="openEdit">
      <template #cell-estado="{ row }">
        <BaseBadge :estado="row.estado ? 'APROBADO' : 'RECHAZADO'">
          {{ row.estado ? 'Activo' : 'Inactivo' }}
        </BaseBadge>
      </template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-2">
          <BaseButton variant="ghost" size="sm" @click="openEdit(row)">Editar</BaseButton>
          <BaseButton :variant="row.estado ? 'danger' : 'secondary'" size="sm" :disabled="row.id === auth.usuario?.id"
            :loading="togglingId === row.id" @click="handleToggleEstado(row)">
            {{ row.estado ? 'Desactivar' : 'Activar' }}
          </BaseButton>
        </div>
      </template>
    </BaseDataTable>

    <UsuarioModal v-model="modalOpen" :usuario="editingUsuario" :saving="saving" @create="handleCreate"
      @update="handleUpdate" />
  </div>
</template>
