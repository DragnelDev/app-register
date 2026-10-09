<script setup lang="ts">
import { useId } from 'vue'

interface Option {
  value: string | number
  label: string
}

interface Props {
  modelValue: string | number | null | undefined
  options: Option[]
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  hint?: string
}

withDefaults(defineProps<Props>(), { label: '', placeholder: '', hint: '' })
defineEmits<{ 'update:modelValue': [value: string] }>()

const selectId = useId()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="selectId" class="text-sm font-medium text-ink-700 dark:text-ink-200">
      {{ label }}
      <span v-if="required" class="text-seal-600">*</span>
    </label>
    <select
      :id="selectId"
      :value="modelValue ?? ''"
      :disabled="disabled"
      :required="required"
      class="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 disabled:bg-ink-50 disabled:text-ink-400 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <p v-if="hint" class="text-xs text-ink-400">{{ hint }}</p>
  </div>
</template>
