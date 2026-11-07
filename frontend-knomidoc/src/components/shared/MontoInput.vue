<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatMontoBo, parseMontoBo } from '@/utils/monto'

/**
 * Monto en formato contable boliviano: se puede escribir o pegar "12.345,67",
 * "12345,67" o "12345.67". Al salir del campo se muestra como 12.345,67.
 * v-model: número (o '' si está vacío).
 */
const model = defineModel<number | string>({ default: '' })
defineProps<{ id?: string; invalid?: boolean }>()

const texto = ref(typeof model.value === 'number' ? formatMontoBo(model.value) : '')
const error = ref('')

watch(model, (v) => {
  const actual = parseMontoBo(texto.value)
  if (v === '' || v === null || v === undefined) {
    if (actual !== null) return // el usuario está escribiendo
    texto.value = ''
  } else if (Number(v) !== actual) {
    texto.value = formatMontoBo(Number(v))
  }
})

function alEscribir() {
  error.value = ''
  const t = texto.value.trim()
  if (!t) {
    model.value = ''
    return
  }
  const n = parseMontoBo(t)
  if (n === null) {
    error.value = 'Formato no válido. Ej: 12.345,67'
    model.value = ''
  } else model.value = n
}

function alSalir() {
  const n = parseMontoBo(texto.value)
  if (n !== null) texto.value = formatMontoBo(n)
}
</script>

<template>
  <div>
    <input
      :id="id"
      v-model="texto"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      placeholder="0,00"
      :aria-invalid="invalid || !!error"
      class="w-full rounded-md border bg-white px-3 py-2 text-right text-sm tabular-nums text-ink-900 placeholder:text-ink-300 focus:border-seal-500 dark:bg-ink-950 dark:text-ink-100 dark:placeholder:text-ink-500"
      :class="invalid || error ? 'border-red-400' : 'border-ink-200 dark:border-white/10'"
      @input="alEscribir"
      @blur="alSalir"
    />
    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>
