<script setup lang="ts">
import { computed } from 'vue'

// Cubre los estados usados en el MER: aprobación, físico y préstamo
type EstadoConocido =
  | 'APROBADO' | 'PENDIENTE' | 'RECHAZADO'
  | 'EN_ARCHIVO' | 'PRESTADO' | 'DEVUELTO'

interface Props {
  estado: EstadoConocido | string
}

const props = defineProps<Props>()

const stylesByEstado: Record<string, string> = {
  APROBADO: 'bg-emerald-50 text-emerald-700',
  DEVUELTO: 'bg-emerald-50 text-emerald-700',
  EN_ARCHIVO: 'bg-ink-100 text-ink-700',
  PENDIENTE: 'bg-seal-100 text-seal-700',
  PRESTADO: 'bg-seal-100 text-seal-700',
  RECHAZADO: 'bg-red-50 text-red-700',
}

const labelByEstado: Record<string, string> = {
  APROBADO: 'Aprobado',
  DEVUELTO: 'Devuelto',
  EN_ARCHIVO: 'En archivo',
  PENDIENTE: 'Pendiente',
  PRESTADO: 'Prestado',
  RECHAZADO: 'Rechazado',
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
