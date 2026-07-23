<script setup lang="ts">
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import type { ComprobanteC31 } from '@/types/c31.types'

defineProps<{
  modelValue: boolean
  comprobante: ComprobanteC31 | null
}>()

defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Detalle del comprobante C31"
    size="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="comprobante" class="space-y-5 text-sm">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-lg font-semibold text-ink-900">{{ comprobante.descripcion }}</p>
          <p class="text-ink-400">Bs {{ comprobante.montoTotal.toFixed(2) }} · {{ comprobante.fechaElaboracion }}</p>
        </div>
        <div class="flex gap-2">
          <BaseBadge :estado="comprobante.estadoAprobacion" />
          <BaseBadge :estado="comprobante.estadoFisico" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <h4 class="mb-1 font-semibold text-ink-700">N° de Preventivo</h4>
          <ul class="list-inside list-disc text-ink-600">
            <li v-for="p in comprobante.preventivos" :key="p.numeroPreventivo">{{ p.numeroPreventivo }}</li>
          </ul>
        </div>
        <div>
          <h4 class="mb-1 font-semibold text-ink-700">N° de Devengado</h4>
          <ul class="list-inside list-disc text-ink-600">
            <li v-for="d in comprobante.devengados" :key="d.numeroDevengado">{{ d.numeroDevengado }}</li>
          </ul>
        </div>
        <div>
          <h4 class="mb-1 font-semibold text-ink-700">Beneficiarios</h4>
          <ul class="list-inside list-disc text-ink-600">
            <li v-for="b in comprobante.beneficiarios" :key="b.nombreBeneficiario">{{ b.nombreBeneficiario }}</li>
          </ul>
        </div>
        <div>
          <h4 class="mb-1 font-semibold text-ink-700">Cheques</h4>
          <p v-if="comprobante.cheques.length === 0" class="text-ink-400">Sin cheques asociados.</p>
          <ul v-else class="list-inside list-disc text-ink-600">
            <li v-for="c in comprobante.cheques" :key="c.numeroCheque">{{ c.numeroCheque }}</li>
          </ul>
        </div>
      </div>

      <div>
        <h4 class="mb-1 font-semibold text-ink-700">Ubicación física</h4>
        <ul class="list-inside list-disc text-ink-600">
          <li v-for="u in comprobante.carpetasUbicacion" :key="`${u.carpetaId}-${u.numeroParte}`">
            Carpeta {{ u.carpeta?.codigoCarpeta ?? u.carpetaId }} — Parte {{ u.numeroParte }} de {{ comprobante.cantidadCarpetas }}
          </li>
        </ul>
      </div>
    </div>
  </BaseModal>
</template>
