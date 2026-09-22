<script setup lang="ts">
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import type { ComprobanteC31 } from '@/types/c31.types'

defineProps<{
  modelValue: boolean
  comprobante: ComprobanteC31 | null
}>()

defineEmits<{ 'update:modelValue': [value: boolean] }>()

const tipoC31Label: Record<string, string> = {
  CON_IMPUTACION: 'Con imputación',
  SIN_IMPUTACION: 'Sin imputación',
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Detalle del comprobante C31"
    size="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="comprobante" class="space-y-5 text-sm">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-lg font-semibold text-ink-900">{{ comprobante.descripcion }}</p>
          <p class="text-ink-400">
            Bs {{ Number(comprobante.montoTotal).toFixed(2) }} ·
            {{ comprobante.fechaElaboracion }} · Gestión {{ comprobante.gestion }}
          </p>
          <p v-if="comprobante.numeroComprobante" class="text-ink-400">
            N° comprobante: {{ comprobante.numeroComprobante }}
          </p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <BaseBadge :estado="comprobante.estadoFisico" />
          <span class="text-xs font-medium text-ink-500">
            {{ tipoC31Label[comprobante.tipoC31] ?? comprobante.tipoC31 }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <h4 class="mb-1 font-semibold text-ink-700">N° de Preventivo</h4>
          <ul v-if="comprobante.preventivos.length" class="list-inside list-disc text-ink-600">
            <li v-for="p in comprobante.preventivos" :key="p.id ?? p.numeroPreventivo">
              {{ p.numeroPreventivo }}
            </li>
          </ul>
          <p v-else class="text-ink-400">—</p>
        </div>
        <div>
          <h4 class="mb-1 font-semibold text-ink-700">N° de Devengado</h4>
          <ul v-if="comprobante.devengados.length" class="list-inside list-disc text-ink-600">
            <li v-for="d in comprobante.devengados" :key="d.id ?? d.numeroDevengado">
              {{ d.numeroDevengado }}
            </li>
          </ul>
          <p v-else class="text-ink-400">—</p>
        </div>
        <div>
          <h4 class="mb-1 font-semibold text-ink-700">Beneficiarios</h4>
          <ul v-if="comprobante.beneficiarios.length" class="list-inside list-disc text-ink-600">
            <li v-for="b in comprobante.beneficiarios" :key="b.id ?? b.nombreBeneficiario">
              {{ b.nombreBeneficiario }}
            </li>
          </ul>
          <p v-else class="text-ink-400">—</p>
        </div>
        <div>
          <h4 class="mb-1 font-semibold text-ink-700">Cheques</h4>
          <p v-if="comprobante.cheques.length === 0" class="text-ink-400">Sin cheques asociados.</p>
          <ul v-else class="list-inside list-disc text-ink-600">
            <li v-for="c in comprobante.cheques" :key="c.id ?? c.numeroCheque">
              {{ c.numeroCheque }}
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h4 class="mb-1 font-semibold text-ink-700">Ubicación física</h4>
        <p class="text-ink-600">{{ comprobante.ubicacionFisica || 'Sin asignar aún.' }}</p>
      </div>

      <div v-if="comprobante.observaciones">
        <h4 class="mb-1 font-semibold text-ink-700">Observaciones</h4>
        <p class="text-ink-600">{{ comprobante.observaciones }}</p>
      </div>
    </div>
  </BaseModal>
</template>
