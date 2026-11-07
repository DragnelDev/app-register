<script setup lang="ts">
import { computed, ref, useId } from 'vue'

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

defineEmits<{ 'update:modelValue': [value: string]; blur: [event: FocusEvent] }>()

const inputId = useId()

// Ojito para ver/ocultar contraseñas (el del navegador no respeta el modo oscuro)
const visible = ref(false)
const tipoReal = computed(() => (props.type === 'password' && visible.value ? 'text' : props.type))
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="inputId" class="text-sm font-medium text-ink-700 dark:text-ink-200">
      {{ label }}
      <span v-if="required" class="text-seal-600">*</span>
    </label>

    <div class="relative">
      <input
        :id="inputId"
        :type="tipoReal"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined"
        class="w-full rounded-md border bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 disabled:bg-ink-50 disabled:text-ink-400 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100 dark:placeholder:text-ink-500"
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
