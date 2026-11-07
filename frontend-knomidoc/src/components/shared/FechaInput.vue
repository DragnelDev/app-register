<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatFechaBo, parseFechaBo } from '@/utils/fecha'

/**
 * Fecha como se copia del SIGEP (dd/mm/aaaa, también con hora). Se puede
 * escribir o pegar; v-model es aaaa-mm-dd ('' si está vacío o no es válida).
 */
const model = defineModel<string>({ default: '' })
defineProps<{ id?: string; invalid?: boolean }>()

const texto = ref(formatFechaBo(model.value))
const error = ref('')

watch(model, (v) => {
  if (v !== (parseFechaBo(texto.value) ?? '')) texto.value = formatFechaBo(v)
})

function alEscribir() {
  error.value = ''
  const t = texto.value.trim()
  if (!t) {
    model.value = ''
    return
  }
  const iso = parseFechaBo(t)
  // Mientras escribe no se marca error; se valida al salir
  model.value = iso ?? ''
}

function alSalir() {
  const t = texto.value.trim()
  if (!t) return
  const iso = parseFechaBo(t)
  if (iso) texto.value = formatFechaBo(iso)
  else error.value = 'Fecha no válida. Use dd/mm/aaaa'
}
</script>

<template>
  <div>
    <input
      :id="id"
      v-model="texto"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      placeholder="dd/mm/aaaa"
      maxlength="30"
      :aria-invalid="invalid || !!error"
      class="w-full rounded-md border bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-seal-500 dark:bg-ink-950 dark:text-ink-100 dark:placeholder:text-ink-500"
      :class="invalid || error ? 'border-red-400' : 'border-ink-200 dark:border-white/10'"
      @input="alEscribir"
      @blur="alSalir"
    />
    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>
