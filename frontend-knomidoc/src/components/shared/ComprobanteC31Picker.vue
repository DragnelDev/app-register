<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { c31Service } from '@/services/c31.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { ComprobanteC31 } from '@/types/c31.types'

const props = withDefaults(
  defineProps<{
    /** IDs a excluir de los resultados (ya seleccionados en el formulario actual) */
    excludeIds?: (string | number)[]
    /** Excluye comprobantes ya APROBADOS (no se pueden reasignar a una acta) */
    excludeAprobados?: boolean
    /** Excluye comprobantes que ya pertenecen a otra acta de entrega */
    excludeAsignadosAActa?: boolean
    /** ID de la acta actual (si se está editando una), para no excluir sus propios comprobantes */
    actaActualId?: string | number | null
    placeholder?: string
  }>(),
  {
    excludeIds: () => [],
    excludeAprobados: false,
    excludeAsignadosAActa: false,
    actaActualId: null,
    placeholder: 'Buscar por descripción / glosa del comprobante…',
  },
)

const emit = defineEmits<{ select: [comprobante: ComprobanteC31] }>()

const search = ref('')
const results = ref<ComprobanteC31[]>([])
const loading = ref(false)
const open = ref(false)
const errorMessage = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | undefined

async function runSearch(term: string) {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await c31Service.list({ search: term, pageSize: 10 })
    results.value = res.data.filter((c) => {
      if (props.excludeIds.some((id) => String(id) === String(c.id))) return false
      if (
        props.excludeAsignadosAActa &&
        c.actaEntregaId &&
        String(c.actaEntregaId) !== String(props.actaActualId ?? '')
      )
        return false
      return true
    })
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

function pick(comprobante: ComprobanteC31) {
  emit('select', comprobante)
  search.value = ''
  results.value = []
  open.value = false
}

function formatMonto(monto: number) {
  return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2 }).format(monto)
}

function joinNombres(items: { nombreBeneficiario?: string }[] | undefined) {
  return (
    (items ?? [])
      .map((i) => i.nombreBeneficiario)
      .filter(Boolean)
      .join(', ') || '—'
  )
}

function joinNumeros(
  items: { numeroPreventivo?: string; numeroDevengado?: string }[] | undefined,
  key: 'numeroPreventivo' | 'numeroDevengado',
) {
  return (
    (items ?? [])
      .map((i) => i[key])
      .filter(Boolean)
      .join(', ') || '—'
  )
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
        v-for="comprobante in results"
        v-else
        :key="comprobante.id"
        type="button"
        class="block w-full border-b border-ink-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-ink-50 dark:border-white/10 dark:hover:bg-white/5"
        @click="pick(comprobante)"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium text-ink-800 dark:text-ink-100">
            Comprobante N°
            {{ comprobante.numeroComprobante ?? comprobante.numeroFolio ?? comprobante.id }}
          </span>
          <span class="whitespace-nowrap text-ink-600 dark:text-ink-300"
            >Bs {{ formatMonto(comprobante.montoTotal) }}</span
          >
        </div>
        <p class="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">
          {{ comprobante.descripcion }}
        </p>
        <p class="mt-0.5 text-xs text-ink-400 dark:text-ink-500">
          Prev: {{ joinNumeros(comprobante.preventivos, 'numeroPreventivo') }} · Dev:
          {{ joinNumeros(comprobante.devengados, 'numeroDevengado') }} · Beneficiario:
          {{ joinNombres(comprobante.beneficiarios) }}
        </p>
      </button>
    </div>
  </div>
</template>
