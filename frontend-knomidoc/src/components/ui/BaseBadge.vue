<script setup lang="ts">
import { computed } from 'vue'

// Cubre estado_fisico de comprobantes_c31 y estado_prestamo de prestamos_nota / cuaderno
type EstadoConocido = 'EN_ARCHIVO' | 'PRESTADO' | 'ANULADO' | 'ENTREGADO' | 'DEVUELTO'

interface Props {
  estado: EstadoConocido | string
}

const props = defineProps<Props>()

const stylesByEstado: Record<string, string> = {
  EN_ARCHIVO: 'bg-emerald-50 text-emerald-700',
  DEVUELTO: 'bg-emerald-50 text-emerald-700',
  PRESTADO: 'bg-seal-100 text-seal-700',
  ENTREGADO: 'bg-seal-100 text-seal-700',
  ANULADO: 'bg-red-50 text-red-700',
}

const labelByEstado: Record<string, string> = {
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
