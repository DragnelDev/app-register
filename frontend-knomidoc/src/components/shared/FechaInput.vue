<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatFechaBo, parseFechaBo } from '@/utils/fecha'

/**
 * Fecha como se copia del SIGEP (dd/mm/aaaa, también con hora). Se puede
 * escribir o pegar; v-model es aaaa-mm-dd ('' si está vacío o no es válida).
 */
const model = defineModel<string>({ default: '' })
defineProps<{ id?: string; invalid?: boolean; disabled?: boolean }>()

const calendario = ref<HTMLInputElement | null>(null)
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

function abrirCalendario() {
  const el = calendario.value
  if (!el) return
  try {
    el.showPicker()
  } catch {
    el.focus()
    el.click()
  }
}

function alElegir(e: Event) {
  const v = (e.target as HTMLInputElement).value
  error.value = ''
  model.value = v
  texto.value = formatFechaBo(v)
}
</script>

<template>
  <div>
    <div class="relative">
      <input
        :id="id"
        v-model="texto"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        placeholder="dd/mm/aaaa"
        maxlength="30"
        :disabled="disabled"
        :aria-invalid="invalid || !!error"
        class="w-full rounded-md border bg-white py-2 pl-3 pr-10 text-sm text-ink-900 placeholder:text-ink-300 focus:border-seal-500 dark:bg-ink-950 dark:text-ink-100 dark:placeholder:text-ink-500"
        :class="invalid || error ? 'border-red-400' : 'border-ink-200 dark:border-white/10'"
        @input="alEscribir"
        @blur="alSalir"
      />
      <!-- Calendario: elegir la fecha con el selector del navegador -->
      <button
        type="button"
        class="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-ink-400 hover:text-seal-600 disabled:opacity-40"
        :disabled="disabled"
        title="Elegir en el calendario"
        aria-label="Abrir calendario"
        @click="abrirCalendario"
      >
        <i class="fa-regular fa-calendar" aria-hidden="true" />
      </button>
      <input
        ref="calendario"
        type="date"
        tabindex="-1"
        aria-hidden="true"
        :value="model"
        class="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
        @change="alElegir"
      />
    </div>
    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>
