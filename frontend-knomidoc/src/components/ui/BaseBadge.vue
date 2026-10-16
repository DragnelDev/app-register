<script setup lang="ts">
import { computed } from 'vue'

// Cubre el estado del comprobante, del préstamo, del acta y del pago
interface Props {
  estado: string
}

const props = defineProps<Props>()

const amarillo = 'bg-amber-50 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300'
const verde = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300'
const azul = 'bg-seal-100 text-seal-800 dark:bg-seal-400/15 dark:text-seal-300'
const rojo = 'bg-red-50 text-red-800 dark:bg-red-400/15 dark:text-red-300'
const celeste = 'bg-sky-50 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300'
const naranja = 'bg-orange-50 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300'
const gris = 'bg-ink-100 text-ink-700 dark:bg-white/10 dark:text-ink-200'

const stylesByEstado: Record<string, string> = {
  EN_TRAMITE: amarillo,
  EN_REVISION: celeste,
  EN_ARCHIVO: verde,
  ARCHIVADO: verde,
  PRESTADO: azul,
  OBSERVADO: naranja,
  ANULADO: rojo,
  // préstamos
  ENTREGADO: azul,
  DEVUELTO: verde,
  // actas
  BORRADOR: amarillo,
  RECIBIDA: verde,
  ANULADA: rojo,
  // pagos
  PENDIENTE: amarillo,
  PAGADO: verde,
}

const labelByEstado: Record<string, string> = {
  EN_TRAMITE: 'En trámite',
  EN_REVISION: 'En revisión / firmado',
  EN_ARCHIVO: 'En archivo',
  ARCHIVADO: 'Archivado correctamente',
  PRESTADO: 'Prestado',
  OBSERVADO: 'Observado',
  ANULADO: 'Anulado',
  DEVUELTO: 'Devuelto',
  ENTREGADO: 'Prestado',
  BORRADOR: 'Borrador',
  RECIBIDA: 'Recibida',
  ANULADA: 'Anulada',
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
}

const classes = computed(() => stylesByEstado[props.estado] ?? gris)
const label = computed(() => labelByEstado[props.estado] ?? props.estado)
</script>

<template>
  <span class="badge" :class="classes">
    <span class="h-1.5 w-1.5 rounded-full bg-current" />
    <slot>{{ label }}</slot>
  </span>
</template>
