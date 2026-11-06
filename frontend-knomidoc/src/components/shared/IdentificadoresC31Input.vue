<script setup lang="ts">
import { reactive, ref } from 'vue'

/**
 * Un C31 puede unir varios preventivos (ej. PREV 3 y 7 como un solo comprobante)
 * y/o devengados (PREV + DEV juntos). Se agregan como etiquetas.
 */
const preventivos = defineModel<string[]>('preventivos', { required: true })
const devengados = defineModel<string[]>('devengados', { required: true })
defineProps<{ error?: string }>()

const CODIGO = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .\/\-_]+$/
const nuevos = reactive({ preventivo: '', devengado: '' })
const mensaje = ref('')

function agregar(lista: string[], tipo: 'preventivo' | 'devengado') {
  const n = nuevos[tipo].trim().replace(/\s+/g, ' ')
  mensaje.value = ''
  if (!n) return
  if (n.length > 50) return void (mensaje.value = 'Máximo 50 caracteres')
  if (!CODIGO.test(n)) return void (mensaje.value = 'Solo letras, números, espacios y . / - _')
  if (lista.some((x) => x.toUpperCase() === n.toUpperCase()))
    return void (mensaje.value = `El N° ${n} ya está en la lista`)
  if (lista.length >= 20) return void (mensaje.value = 'Máximo 20 números')
  lista.push(n)
  nuevos[tipo] = ''
}

/** Si quedó un número escrito sin pulsar "Agregar", se toma como agregado. */
function confirmarPendientes() {
  agregar(preventivos.value, 'preventivo')
  agregar(devengados.value, 'devengado')
}
defineExpose({ confirmarPendientes })

const campo =
  'w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'
const etiqueta = 'mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-200'
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div
        v-for="g in [
          { t: 'Preventivo(s)', lista: preventivos, nuevo: 'preventivo', ph: 'Ej: 3' },
          { t: 'Devengado(s)', lista: devengados, nuevo: 'devengado', ph: 'Ej: 45' },
        ]"
        :key="g.t"
      >
        <label :class="etiqueta">N° de {{ g.t }}</label>
        <div class="flex gap-2">
          <input
            v-model="nuevos[g.nuevo]"
            type="text"
            :class="campo"
            :placeholder="g.ph"
            @keydown.enter.prevent="agregar(g.lista, g.nuevo)"
          />
          <button
            type="button"
            class="shrink-0 rounded-md bg-seal-600 px-3 py-2 text-sm font-medium text-white hover:bg-seal-700"
            @click="agregar(g.lista, g.nuevo)"
          >
            Agregar
          </button>
        </div>
        <ul v-if="g.lista.length" class="mt-2 flex flex-wrap gap-1.5">
          <li
            v-for="(n, i) in g.lista"
            :key="n"
            class="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-800 dark:bg-white/10 dark:text-ink-100"
          >
            {{ n }}
            <button
              type="button"
              class="text-ink-400 hover:text-red-600"
              :aria-label="`Quitar ${n}`"
              @click="g.lista.splice(i, 1)"
            >
              ×
            </button>
          </li>
        </ul>
      </div>
    </div>
    <p class="text-xs text-ink-400 dark:text-ink-500">
      Puede unir varios números en un mismo comprobante. Con al menos un preventivo es
      <strong>Con imputación</strong>; solo con devengados, <strong>Sin imputación</strong>.
    </p>
    <p v-if="mensaje" class="text-xs text-red-600">{{ mensaje }}</p>
    <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
  </div>
</template>
