<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import FechaInput from '@/components/shared/FechaInput.vue'

interface Props {
  modelValue: string | number | null | undefined
  label?: string
  type?: string
  placeholder?: string
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  label: '',
  placeholder: '',
  error: '',
  hint: '',
  required: false,
  disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: string]; blur: [event: FocusEvent] }>()

const inputId = useId()

// Ojito para ver/ocultar contraseñas (el del navegador no respeta el modo oscuro)
const visible = ref(false)
const tipoReal = computed(() => (props.type === 'password' && visible.value ? 'text' : props.type))

// Fecha (dd/mm/aaaa) y fecha-hora (dd/mm/aaaa + hora en 24 h): independiente del idioma del navegador
const esFecha = computed(() => props.type === 'date')
const esFechaHora = computed(() => props.type === 'datetime-local')
const parteFecha = computed(() => String(props.modelValue ?? '').slice(0, 10))
const parteHora = computed(() => String(props.modelValue ?? '').slice(11, 16))
function cambiarFecha(v: string) {
  emit('update:modelValue', esFechaHora.value ? (v ? `${v}T${parteHora.value || '08:00'}` : '') : v)
}
function cambiarHora(v: string) {
  emit('update:modelValue', parteFecha.value ? `${parteFecha.value}T${v || '00:00'}` : '')
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="inputId" class="text-sm font-medium text-ink-700 dark:text-ink-200">
      {{ label }}
      <span v-if="required" class="text-seal-600">*</span>
    </label>

    <div v-if="esFecha" class="relative">
      <FechaInput :id="inputId" :disabled="disabled" :model-value="parteFecha" :invalid="Boolean(error)" @update:model-value="cambiarFecha" />
    </div>
    <div v-else-if="esFechaHora" class="flex gap-2">
      <FechaInput :id="inputId" class="flex-1" :model-value="parteFecha" :invalid="Boolean(error)" @update:model-value="cambiarFecha" />
      <input
        type="time"
        step="60"
        :value="parteHora"
        :disabled="!parteFecha"
        class="w-28 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
        @input="cambiarHora(($event.target as HTMLInputElement).value)"
      />
    </div>
    <div v-else class="relative">
      <input
        :id="inputId"
        :type="tipoReal"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined"
        class="w-full rounded-md border bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 disabled:bg-ink-50 disabled:text-ink-500 dark:border-white/10 dark:disabled:bg-white/5 dark:disabled:text-ink-300 dark:bg-ink-950 dark:text-ink-100 dark:placeholder:text-ink-500"
        :class="[
          type === 'password' ? 'pr-10' : '',
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-ink-200 focus:border-ink-400 dark:border-white/10 dark:focus:border-seal-400',
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-400 hover:text-ink-700 dark:text-ink-400 dark:hover:text-white"
        :aria-label="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        :title="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        @click="visible = !visible"
      >
        <i class="fa-solid" :class="visible ? 'fa-eye-slash' : 'fa-eye'" aria-hidden="true" />
      </button>
    </div>

    <p v-if="error" :id="`${inputId}-error`" class="text-xs text-red-600">{{ error }}</p>
    <p v-else-if="hint" :id="`${inputId}-hint`" class="text-xs text-ink-400 dark:text-ink-500">
      {{ hint }}
    </p>
  </div>
</template>
