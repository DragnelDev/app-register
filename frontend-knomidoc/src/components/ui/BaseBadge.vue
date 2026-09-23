<script setup lang="ts">
import { computed } from 'vue'

// Cubre estado_fisico de comprobantes_c31 y estado_prestamo de prestamos_nota / cuaderno
type EstadoConocido =
  'EN_TRAMITE' | 'EN_ARCHIVO' | 'PRESTADO' | 'ANULADO' | 'ENTREGADO' | 'DEVUELTO'

interface Props {
  estado: EstadoConocido | string
}

const props = defineProps<Props>()

const stylesByEstado: Record<string, string> = {
  EN_TRAMITE: 'bg-amber-50 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  EN_ARCHIVO: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
  DEVUELTO: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
  PRESTADO: 'bg-seal-100 text-seal-800 dark:bg-seal-400/15 dark:text-seal-300',
  ENTREGADO: 'bg-seal-100 text-seal-800 dark:bg-seal-400/15 dark:text-seal-300',
  ANULADO: 'bg-red-50 text-red-800 dark:bg-red-400/15 dark:text-red-300',
}

const labelByEstado: Record<string, string> = {
  EN_TRAMITE: 'En Trámite / Revisión',
  EN_ARCHIVO: 'En archivo',
  DEVUELTO: 'Devuelto',
  PRESTADO: 'Prestado',
  ENTREGADO: 'Prestado',
  ANULADO: 'Anulado',
}

const classes = computed(() => stylesByEstado[props.estado] ?? 'bg-ink-100 text-ink-700')
const label = computed(() => labelByEstado[props.estado] ?? props.estado)
</script>

<template>
  <span class="badge" :class="classes">
    <span class="h-1.5 w-1.5 rounded-full bg-current" />
    <slot>{{ label }}</slot>
  </span>
</template>
