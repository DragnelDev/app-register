<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { ComprobanteC31 } from '@/types/c31.types'

const props = withDefaults(
  defineProps<{
    items: ComprobanteC31[]
    emptyMessage?: string
    /** Cuando es true no muestra la columna de "Quitar" (para comprobantes ya guardados) */
    readonly?: boolean
  }>(),
  { readonly: false },
)

const emit = defineEmits<{ remove: [id: string] }>()

const total = computed(() => props.items.reduce((sum, c) => sum + Number(c.montoTotal || 0), 0))
const colspan = computed(() => (props.readonly ? 5 : 6))

function formatMonto(monto: number) {
  return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2 }).format(monto)
}

function joinNombres(items: { nombreBeneficiario?: string }[] | undefined) {
  return (
    (items ?? [])
      .map((i) => i.nombreBeneficiario)
      .filter(Boolean)
      .join(', ') || '—'
  )
}

function joinNumeros(
  items: { numeroPreventivo?: string; numeroDevengado?: string }[] | undefined,
  key: 'numeroPreventivo' | 'numeroDevengado',
) {
  return (
    (items ?? [])
      .map((i) => i[key])
      .filter(Boolean)
      .join(', ') || '—'
  )
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-ink-100 dark:border-white/10">
    <table class="w-full border-collapse text-sm">
      <thead class="border-b border-ink-100 bg-ink-50/60 dark:border-white/10 dark:bg-ink-950/80">
        <tr>
          <th class="table-header-cell">N° Comprobante</th>
          <th class="table-header-cell">N° Prev</th>
          <th class="table-header-cell">N° Dev</th>
          <th class="table-header-cell">Beneficiario</th>
          <th class="table-header-cell text-right">Monto (Bs)</th>
          <th v-if="!readonly" class="table-header-cell text-right">Quitar</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-ink-100 dark:divide-white/10">
        <tr v-if="items.length === 0">
          <td :colspan="colspan" class="table-cell py-6 text-center text-ink-400 dark:text-ink-500">
            {{ emptyMessage ?? 'Aún no añadiste comprobantes.' }}
          </td>
        </tr>
        <tr v-for="comprobante in items" :key="comprobante.id" class="dark:bg-ink-950">
          <td class="table-cell">
            {{ comprobante.numeroComprobante ?? comprobante.numeroFolio ?? comprobante.id }}
          </td>
          <td class="table-cell">{{ joinNumeros(comprobante.preventivos, 'numeroPreventivo') }}</td>
          <td class="table-cell">{{ joinNumeros(comprobante.devengados, 'numeroDevengado') }}</td>
          <td class="table-cell">{{ joinNombres(comprobante.beneficiarios) }}</td>
          <td class="table-cell text-right">{{ formatMonto(comprobante.montoTotal) }}</td>
          <td v-if="!readonly" class="table-cell text-right">
            <BaseButton
              variant="ghost"
              size="sm"
              type="button"
              @click="emit('remove', comprobante.id)"
            >
              ✕
            </BaseButton>
          </td>
        </tr>
      </tbody>
      <tfoot v-if="items.length > 0">
        <tr class="border-t border-ink-100 font-medium dark:border-white/10">
          <td colspan="4" class="table-cell text-right">Total</td>
          <td class="table-cell text-right">{{ formatMonto(total) }}</td>
          <td v-if="!readonly" class="table-cell"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
