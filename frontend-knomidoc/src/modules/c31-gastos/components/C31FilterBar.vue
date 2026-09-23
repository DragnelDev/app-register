<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { C31FilterState } from '@/types/c31.types'

const props = defineProps<{ modelValue: C31FilterState; gestiones: number[] }>()
const emit = defineEmits<{
  'update:modelValue': [value: C31FilterState]
  export: []
}>()

const local = reactive<C31FilterState>({ ...props.modelValue })

watch(
  () => props.modelValue,
  (val) => Object.assign(local, val),
  { deep: true },
)

function apply() {
  emit('update:modelValue', { ...local })
}

function reset() {
  local.search = ''
  local.estadoFisico = ''
  local.tipoC31 = ''
  local.fechaDesde = ''
  local.fechaHasta = ''
  local.gestion = ''
  apply()
}
</script>

<template>
  <form class="card flex flex-wrap items-end gap-3 p-4" @submit.prevent="apply">
    <div class="min-w-[220px] flex-1">
      <label class="mb-1 block text-xs font-medium text-ink-500">Buscar</label>
      <input
        v-model="local.search"
        type="text"
        placeholder="Descripción, N° comprobante, beneficiario…"
        class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
      />
    </div>

    <div>
      <label class="mb-1 block text-xs font-medium text-ink-500">Gestión</label>
      <select
        v-model="local.gestion"
        class="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
      >
        <option value="">Todas</option>
        <option v-for="g in gestiones" :key="g" :value="g">{{ g }}</option>
      </select>
    </div>

    <div>
      <label class="mb-1 block text-xs font-medium text-ink-500">Tipo C31</label>
      <select
        v-model="local.tipoC31"
        class="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
      >
        <option value="">Todos</option>
        <option value="CON_IMPUTACION">Con imputación</option>
        <option value="SIN_IMPUTACION">Sin imputación</option>
      </select>
    </div>

    <div>
      <label class="mb-1 block text-xs font-medium text-ink-500">Estado físico</label>
      <select
        v-model="local.estadoFisico"
        class="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
      >
        <option value="">Todos</option>
        <option value="EN_TRAMITE">En Trámite / Revisión</option>
        <option value="EN_ARCHIVO">En archivo</option>
        <option value="PRESTADO">Prestado</option>
        <option value="ANULADO">Anulado</option>
      </select>
    </div>

    <div>
      <label class="mb-1 block text-xs font-medium text-ink-500">Desde</label>
      <input
        v-model="local.fechaDesde"
        type="date"
        class="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
      />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-ink-500">Hasta</label>
      <input
        v-model="local.fechaHasta"
        type="date"
        class="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
      />
    </div>

    <div class="flex gap-2">
      <button
        type="submit"
        class="rounded-md bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900 dark:bg-seal-500 dark:hover:bg-seal-600"
      >
        Filtrar
      </button>
      <button
        type="button"
        class="rounded-md border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50 dark:border-white/10 dark:text-ink-300 dark:hover:bg-white/5"
        @click="reset"
      >
        Limpiar
      </button>
      <button
        type="button"
        class="rounded-md border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50 dark:border-white/10 dark:text-ink-300 dark:hover:bg-white/5"
        @click="emit('export')"
      >
        ⬇ Exportar Excel
      </button>
    </div>
  </form>
</template>
