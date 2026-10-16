<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { bs } from '@/utils/estados'
import { identificadorC31 } from '@/types/c31.types'
import type { ActaAprobarPayload, ActaEntrega } from '@/types/actas-entrega.types'

const props = defineProps<{ modelValue: boolean; acta: ActaEntrega | null; saving?: boolean; serverError?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; confirm: [payload: ActaAprobarPayload] }>()

/** Decisión del archivista por comprobante: recibido o devuelto con observación. */
const decisiones = reactive<Record<number, { recibido: boolean; motivo: string }>>({})
const fechaRecepcion = ref('')
const error = ref('')

type Decision = { recibido: boolean; motivo: string }
const dec = (c: { id: string | number }) => decisiones[Number(c.id)] as Decision

const items = computed(() => props.acta?.comprobantesC31 ?? [])

watch(
  () => [props.modelValue, props.acta],
  () => {
    if (!props.modelValue) return
    Object.keys(decisiones).forEach((k) => delete decisiones[Number(k)])
    items.value.forEach((c) => (decisiones[Number(c.id)] = { recibido: true, motivo: '' }))
    fechaRecepcion.value = new Date().toISOString().slice(0, 10)
    error.value = ''
  },
  { immediate: true },
)

const recibidos = computed(() => items.value.filter((c) => dec(c).recibido).length)

function confirmar() {
  error.value = ''
  const observados = items.value
    .filter((c) => !dec(c).recibido)
    .map((c) => ({ comprobanteId: Number(c.id), motivo: dec(c).motivo.trim() }))
  if (observados.some((o) => !o.motivo)) return (error.value = 'Indique el motivo de cada comprobante observado.')
  if (recibidos.value === 0) return (error.value = 'Debe recibir al menos un comprobante.')
  emit('confirm', {
    recibidos: items.value.filter((c) => dec(c).recibido).map((c) => Number(c.id)),
    observados,
    fechaRecepcion: fechaRecepcion.value || undefined,
  })
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="`Recibir acta ${acta?.numeroActa ?? ''}`"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-4 text-sm">
      <p class="text-ink-600 dark:text-ink-300">
        Verifique físicamente cada comprobante. Los recibidos pasan a <strong>En archivo</strong>; los que tengan fallas
        vuelven como <strong>Observado</strong> con el motivo que indique.
      </p>
      <p v-if="error || serverError" class="rounded-md bg-red-50 px-3 py-2 text-red-700 dark:bg-red-950/40 dark:text-red-300">{{ error || serverError }}</p>

      <BaseInput v-model="fechaRecepcion" type="date" label="Fecha de recepción" class="max-w-xs" />

      <ul class="space-y-2">
        <li v-for="c in items" :key="c.id" class="rounded-md border border-ink-100 p-3 dark:border-white/10">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="font-medium text-ink-900 dark:text-white">N° {{ identificadorC31(c) ?? c.id }} · Bs {{ bs(c.montoTotal) }}</p>
              <p class="text-xs text-ink-500">{{ c.beneficiarios.map((b) => b.nombreBeneficiario).join(', ') }}</p>
            </div>
            <div class="flex gap-4">
              <label class="flex items-center gap-1.5"><input v-model="decisiones[Number(c.id)]!.recibido" type="radio" :value="true" :name="`d${c.id}`" /> Recibido</label>
              <label class="flex items-center gap-1.5"><input v-model="decisiones[Number(c.id)]!.recibido" type="radio" :value="false" :name="`d${c.id}`" /> Observado</label>
            </div>
          </div>
          <input
            v-if="decisiones[Number(c.id)] && !dec(c).recibido"
            v-model="decisiones[Number(c.id)]!.motivo"
            type="text"
            placeholder="Motivo (ej. falta sello del Director Financiero)"
            class="mt-2 w-full rounded-md border border-orange-300 bg-white px-3 py-1.5 text-sm dark:border-orange-500/40 dark:bg-ink-950 dark:text-ink-100"
          />
        </li>
      </ul>
      <p class="text-xs text-ink-600 dark:text-ink-300">{{ recibidos }} de {{ items.length }} comprobantes se recibirán.</p>
    </div>
    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)">Cancelar</BaseButton>
      <BaseButton :loading="saving" @click="confirmar">Aprobar recepción</BaseButton>
    </template>
  </BaseModal>
</template>
