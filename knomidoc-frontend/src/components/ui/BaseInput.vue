<script setup lang="ts">
import { useId } from 'vue'

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

withDefaults(defineProps<Props>(), {
  type: 'text',
  label: '',
  placeholder: '',
  error: '',
  hint: '',
  required: false,
  disabled: false,
})

defineEmits<{ 'update:modelValue': [value: string] }>()

const inputId = useId()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="inputId" class="text-sm font-medium text-ink-700">
      {{ label }}
      <span v-if="required" class="text-seal-600">*</span>
    </label>

    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined"
      class="rounded-md border bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 disabled:bg-ink-50 disabled:text-ink-400"
      :class="error ? 'border-red-400 focus:border-red-500' : 'border-ink-200 focus:border-ink-400'"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <p v-if="error" :id="`${inputId}-error`" class="text-xs text-red-600">{{ error }}</p>
    <p v-else-if="hint" :id="`${inputId}-hint`" class="text-xs text-ink-400">{{ hint }}</p>
  </div>
</template>
