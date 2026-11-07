<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { beneficiariosService } from '@/services/beneficiarios.service'
import { documentoBeneficiario, type Beneficiario } from '@/types/beneficiarios.types'

/**
 * Autocompletado sobre el directorio de beneficiarios. El texto escrito es el
 * valor: si el nombre no existe en el directorio, el sistema lo registra al
 * guardar (alta rápida). `elegir` se emite al escoger una sugerencia.
 */
const props = defineProps<{
  modelValue: string
  placeholder?: string
  inputClass?: string
  id?: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  elegir: [b: Beneficiario]
  enter: []
}>()

const sugerencias = ref<Beneficiario[]>([])
const abierto = ref(false)
let t: ReturnType<typeof setTimeout> | undefined

function alEscribir(e: Event) {
  const v = (e.target as HTMLInputElement).value
  emit('update:modelValue', v)
  clearTimeout(t)
  if (v.trim().length < 2) {
    sugerencias.value = []
    abierto.value = false
    return
  }
  t = setTimeout(async () => {
    try {
      const r = await beneficiariosService.list({ search: v.trim(), pageSize: 8, estado: 'ACTIVO' })
      sugerencias.value = r.data
      abierto.value = r.data.length > 0
    } catch {
      sugerencias.value = []
    }
  }, 250)
}

function elegir(b: Beneficiario) {
  emit('update:modelValue', b.nombre)
  emit('elegir', b)
  abierto.value = false
}

function cerrarConRetraso() {
  setTimeout(() => (abierto.value = false), 150)
}
onBeforeUnmount(() => clearTimeout(t))
</script>

<template>
  <div class="relative w-full">
    <input
      :id="id"
      :value="props.modelValue"
      type="text"
      maxlength="200"
      autocomplete="off"
      :placeholder="placeholder ?? 'Buscar por nombre, CI o NIT…'"
      :class="
        inputClass ??
        'w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'
      "
      @input="alEscribir"
      @blur="cerrarConRetraso"
      @keydown.enter.prevent="emit('enter')"
    />
    <ul
      v-if="abierto"
      class="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-md border border-ink-200 bg-white text-sm shadow-lg dark:border-white/10 dark:bg-ink-900"
    >
      <li v-for="b in sugerencias" :key="b.id">
        <button
          type="button"
          class="flex w-full flex-col px-3 py-2 text-left hover:bg-ink-50 dark:hover:bg-white/10"
          @mousedown.prevent="elegir(b)"
        >
          <span class="font-medium text-ink-900 dark:text-ink-100">{{ b.nombre }}</span>
          <span class="text-xs text-ink-500 dark:text-ink-400">{{ documentoBeneficiario(b) }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
