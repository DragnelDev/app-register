<script setup lang="ts" generic="T extends Record<string, any>">
import { ref, computed } from 'vue'
import BaseButton from './BaseButton.vue'

export interface DataTableColumn<T> {
  key: keyof T & string
  label: string
  sortable?: boolean
}

interface Props {
  columns: DataTableColumn<T>[]
  rows: T[]
  loading?: boolean
  emptyMessage?: string
  page?: number
  totalPages?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyMessage: 'No se encontraron registros.',
  page: 1,
  totalPages: 1,
})

const emit = defineEmits<{
  'update:page': [value: number]
  'row-click': [row: T]
}>()

const sortKey = ref<string | null>(null)
const sortAsc = ref(true)

function toggleSort(column: DataTableColumn<T>) {
  if (!column.sortable) return
  if (sortKey.value === column.key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = column.key
    sortAsc.value = true
  }
}

const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows
  const key = sortKey.value
  return [...props.rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (av === bv) return 0
    const result = av > bv ? 1 : -1
    return sortAsc.value ? result : -result
  })
})
</script>

<template>
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead class="border-b border-ink-100 bg-ink-50/60">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              class="table-header-cell"
              :class="{ 'cursor-pointer select-none': column.sortable }"
              @click="toggleSort(column)"
            >
              <span class="inline-flex items-center gap-1">
                {{ column.label }}
                <span v-if="column.sortable && sortKey === column.key">
                  {{ sortAsc ? '↑' : '↓' }}
                </span>
              </span>
            </th>
            <th v-if="$slots.actions" class="table-header-cell text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          <tr v-if="loading">
            <td :colspan="columns.length + 1" class="table-cell py-8 text-center text-ink-400">
              Cargando registros…
            </td>
          </tr>
          <tr v-else-if="sortedRows.length === 0">
            <td :colspan="columns.length + 1" class="table-cell py-8 text-center text-ink-400">
              {{ emptyMessage }}
            </td>
          </tr>
          <tr
            v-for="(row, idx) in sortedRows"
            v-else
            :key="idx"
            class="hover:bg-ink-50/60"
            @click="emit('row-click', row)"
          >
            <td v-for="column in columns" :key="column.key" class="table-cell">
              <slot :name="`cell-${column.key}`" :row="row">
                {{ row[column.key] }}
              </slot>
            </td>
            <td v-if="$slots.actions" class="table-cell text-right" @click.stop>
              <slot name="actions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="totalPages > 1"
      class="flex items-center justify-between border-t border-ink-100 px-4 py-3"
    >
      <span class="text-xs text-ink-400">Página {{ page }} de {{ totalPages }}</span>
      <div class="flex gap-2">
        <BaseButton
          variant="secondary"
          size="sm"
          :disabled="page <= 1"
          @click="emit('update:page', page - 1)"
        >
          Anterior
        </BaseButton>
        <BaseButton
          variant="secondary"
          size="sm"
          :disabled="page >= totalPages"
          @click="emit('update:page', page + 1)"
        >
          Siguiente
        </BaseButton>
      </div>
    </div>
  </div>
</template>
