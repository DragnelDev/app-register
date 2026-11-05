<script setup lang="ts">
/**
 * Botón de acción solo con ícono (Font Awesome). El texto va en `label`:
 * se muestra como tooltip y lo leen los lectores de pantalla.
 */
withDefaults(
  defineProps<{
    /** Nombre del ícono sin el prefijo fa-solid, p. ej. "fa-pen-to-square" */
    icon: string
    label: string
    variant?: 'default' | 'primary' | 'success' | 'danger'
    disabled?: boolean
    loading?: boolean
  }>(),
  { variant: 'default', disabled: false, loading: false },
)

const estilos = {
  default:
    'text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-white/10 dark:hover:text-white',
  primary: 'text-seal-600 hover:bg-seal-50 dark:text-seal-300 dark:hover:bg-seal-400/10',
  success:
    'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-400/10',
  danger: 'text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10',
} as const
</script>

<template>
  <button
    type="button"
    :title="label"
    :aria-label="label"
    :disabled="disabled || loading"
    class="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-seal-500 disabled:cursor-not-allowed disabled:opacity-40"
    :class="estilos[variant]"
  >
    <i class="fa-solid" :class="loading ? 'fa-spinner fa-spin' : icon" aria-hidden="true" />
  </button>
</template>
