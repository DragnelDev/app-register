<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { c31Service } from '@/services/c31.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { Carpeta } from '@/types/c31.types'

const props = withDefaults(
  defineProps<{
    excludeIds?: (string | number)[]
    placeholder?: string
  }>(),
  { excludeIds: () => [], placeholder: 'Buscar carpeta por código o ubicación…' },
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
    const res = await c31Service.listCarpetas({ search: term, pageSize: 10 })
    results.value = res.data.filter(
      (c) => !props.excludeIds.some((id) => String(id) === String(c.id)),
    )
  } catch (err) {
    errorMessage.value = extractApiErrorMessage(err, 'No se pudo buscar carpetas.')
    results.value = []
  } finally {
    loading.value = false
  }
}

watch(search, (term) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  const trimmed = term.trim()
  if (trimmed.length < 1) {
    results.value = []
    open.value = false
    return
  }
  open.value = true
  debounceTimer = setTimeout(() => runSearch(trimmed), 300)
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
      @focus="open = results.length > 0 || search.trim().length >= 1"
    />

    <div
      v-if="open"
      class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-ink-200 bg-white shadow-lg dark:border-white/10 dark:bg-ink-950"
    >
      <p v-if="loading" class="px-3 py-2 text-sm text-ink-400">Buscando…</p>
      <p v-else-if="errorMessage" class="px-3 py-2 text-sm text-red-600">{{ errorMessage }}</p>
      <p v-else-if="results.length === 0" class="px-3 py-2 text-sm text-ink-400">
        No se encontraron carpetas.
      </p>
      <button
        v-for="carpeta in results"
        v-else
        :key="carpeta.id"
        type="button"
        class="block w-full border-b border-ink-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-ink-50 dark:border-white/10 dark:hover:bg-white/5"
        @click="pick(carpeta)"
      >
        <span class="font-medium text-ink-800 dark:text-ink-100">{{ carpeta.codigoCarpeta }}</span>
        <span class="ml-2 text-xs text-ink-400 dark:text-ink-500">{{ carpeta.ubicacionFisica }}</span>
      </button>
    </div>
  </div>
</template>
