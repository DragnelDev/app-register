<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import apiClient from '@/services/api.client'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { Carpeta } from '@/types/c31.types'
import type { PaginatedResponse } from '@/types/common.types'

const props = withDefaults(
  defineProps<{
    /** IDs a excluir de los resultados (ya seleccionados en el formulario actual) */
    excludeIds?: (string | number)[]
    placeholder?: string
  }>(),
  {
    excludeIds: () => [],
    placeholder: 'Buscar por código de carpeta…',
  },
)

const emit = defineEmits<{ select: [carpeta: Carpeta] }>()

const search = ref('')
const results = ref<Carpeta[]>([])
const loading = ref(false)
const open = ref(false)
const errorMessage = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | undefined

async function runSearch(term: string) {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await apiClient.get<PaginatedResponse<Carpeta>>('/carpetas', {
      params: { search: term, pageSize: 10 },
    })
    results.value = response.data.data.filter(
      (c) => !props.excludeIds.some((id) => String(id) === String(c.id)),
    )
  } catch (err) {
    errorMessage.value = extractApiErrorMessage(err, 'No se pudo buscar comprobantes.')
    results.value = []
  } finally {
    loading.value = false
  }
}

watch(search, (term) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  const trimmed = term.trim()
  if (trimmed.length < 2) {
    results.value = []
    open.value = false
    return
  }
  open.value = true
  debounceTimer = setTimeout(() => runSearch(trimmed), 350)
})

function pick(carpeta: Carpeta) {
  emit('select', carpeta)
  search.value = ''
  results.value = []
  open.value = false
}

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="relative">
    <input
      v-model="search"
      type="text"
      :placeholder="placeholder"
      class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-ink-400 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100 dark:placeholder:text-ink-500 dark:focus:border-seal-400"
      @focus="open = results.length > 0 || search.trim().length >= 2"
    />

    <div
      v-if="open"
      class="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-ink-200 bg-white shadow-lg dark:border-white/10 dark:bg-ink-950"
    >
      <p v-if="loading" class="px-3 py-3 text-sm text-ink-400">Buscando…</p>
      <p v-else-if="errorMessage" class="px-3 py-3 text-sm text-red-600">{{ errorMessage }}</p>
      <p v-else-if="results.length === 0" class="px-3 py-3 text-sm text-ink-400">
        No se encontraron comprobantes que coincidan con la búsqueda.
      </p>
      <button
        v-for="carpeta in results"
        v-else
        :key="carpeta.id"
        type="button"
        class="block w-full border-b border-ink-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-ink-50 dark:border-white/10 dark:hover:bg-white/5"
        @click="pick(carpeta)"
      >
        <p class="font-medium text-ink-800 dark:text-ink-100">{{ carpeta.codigoCarpeta }}</p>
        <p class="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
          {{ carpeta.ubicacionFisica ?? 'Sin ubicación registrada' }}
        </p>
      </button>
    </div>
  </div>
</template>
