<script setup lang="ts">
import FechaInput from '@/components/shared/FechaInput.vue'
import { useAuthStore } from '@/stores/auth.store'
import { reactive, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FuncionarioSelect from '@/components/shared/FuncionarioSelect.vue'
import type { CuadernoFilterState } from '@/types/prestamos.types'
import { useGestionStore } from '@/stores/gestion.store'

const gestionStore = useGestionStore()

const auth = useAuthStore()
const props = defineProps<{
  modelValue: CuadernoFilterState
  gestiones: number[]
  generandoPdf?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [value: CuadernoFilterState]
  limpiar: []
  pdf: []
}>()

const local = reactive<CuadernoFilterState>({ ...props.modelValue })
watch(
  () => props.modelValue,
  (v) => Object.assign(local, v),
  { deep: true },
)

const aplicar = () => emit('update:modelValue', { ...local })

function limpiar() {
  Object.assign(local, {
    gestion: gestionStore.seleccionada,
    fechaDesde: '',
    fechaHasta: '',
    funcionarioId: null,
    unidad: '',
    estado: '',
  })
  emit('limpiar')
}

const campo =
  'rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'
</script>

<template>
  <form class="card flex flex-wrap items-end gap-3 p-4" @submit.prevent="aplicar">
    <div>
      <label class="mb-1 block text-xs font-medium text-ink-500" for="cq-gestion">Gestión</label>
      <select id="cq-gestion" v-model="local.gestion" :class="campo">
        <option value="">Todas</option>
        <option v-for="g in gestiones" :key="g" :value="g">{{ g }}</option>
      </select>
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-ink-500" for="cq-desde">Salida desde</label>
      <FechaInput id="cq-desde" v-model="local.fechaDesde" />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-ink-500" for="cq-hasta">Salida hasta</label>
      <FechaInput id="cq-hasta" v-model="local.fechaHasta" />
    </div>
    <div class="w-64">
      <FuncionarioSelect v-model="local.funcionarioId" label="Funcionario" />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-ink-500" for="cq-unidad"
        >Unidad / área</label
      >
      <input
        id="cq-unidad"
        v-model="local.unidad"
        type="text"
        placeholder="Ej: Auditoría"
        :class="campo"
      />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-ink-500" for="cq-estado">Estado</label>
      <select id="cq-estado" v-model="local.estado" :class="campo">
        <option value="">Todos</option>
        <option value="PENDIENTE">Pendientes de devolución</option>
        <option value="VENCIDO">Vencidos</option>
        <option value="DEVUELTO">Devueltos</option>
      </select>
    </div>
    <div class="flex gap-2">
      <BaseButton type="submit" size="sm">Filtrar</BaseButton>
      <BaseButton variant="secondary" size="sm" @click="limpiar">Limpiar</BaseButton>
      <BaseButton
        v-if="auth.puedeExportar"
        variant="secondary"
        size="sm"
        :loading="generandoPdf"
        @click="emit('pdf')"
      >
        <i class="fa-solid fa-file-pdf" aria-hidden="true" /> Reporte PDF
      </BaseButton>
    </div>
  </form>
</template>
