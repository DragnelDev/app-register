<script setup lang="ts">
import BaseInput from '@/components/ui/BaseInput.vue'
import type { C31FilterState } from '@/types/c31.types'

const filters = defineModel<C31FilterState>({ required: true })

const emit = defineEmits<{ apply: [] }>()
</script>

<template>
  <div class="card flex flex-wrap items-end gap-3 p-4">
    <BaseInput v-model="filters.search" label="Buscar" placeholder="Descripción, folio…" class="w-56" />

    <div class="flex flex-col gap-1.5">
      <label class="text-sm font-medium text-ink-700">Estado de aprobación</label>
      <select v-model="filters.estadoAprobacion" class="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm">
        <option value="">Todos</option>
        <option value="PENDIENTE">Pendiente</option>
        <option value="APROBADO">Aprobado</option>
        <option value="RECHAZADO">Rechazado</option>
      </select>
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-sm font-medium text-ink-700">Estado físico</label>
      <select v-model="filters.estadoFisico" class="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm">
        <option value="">Todos</option>
        <option value="EN_ARCHIVO">En archivo</option>
        <option value="PRESTADO">Prestado</option>
      </select>
    </div>

    <BaseInput v-model="filters.fechaDesde" type="date" label="Desde" />
    <BaseInput v-model="filters.fechaHasta" type="date" label="Hasta" />

    <button
      type="button"
      class="rounded-md bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900"
      @click="emit('apply')"
    >
      Filtrar
    </button>
  </div>
</template>
