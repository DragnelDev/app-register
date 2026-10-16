<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { CondicionDevolucion } from '@/types/prestamos.types'

const props = defineProps<{ modelValue: boolean; saving?: boolean; titulo?: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [payload: { condicion: CondicionDevolucion; observaciones?: string }]
}>()

const condicion = ref<CondicionDevolucion>('CONFORME')
const observaciones = ref('')
const error = ref('')

watch(() => props.modelValue, (abierto) => {
  if (abierto) { condicion.value = 'CONFORME'; observaciones.value = ''; error.value = '' }
})

function confirmar() {
  if (condicion.value === 'CON_NOVEDAD' && !observaciones.value.trim()) {
    error.value = 'Describa la novedad (daños, hojas faltantes, etc.).'
    return
  }
  emit('confirm', { condicion: condicion.value, observaciones: observaciones.value.trim() || undefined })
}
</script>

<template>
  <BaseModal :model-value="modelValue" :title="titulo ?? 'Registrar devolución'" size="sm" @update:model-value="emit('update:modelValue', $event)">
    <div class="space-y-4 text-sm">
      <p class="text-ink-600 dark:text-ink-300">Revise el comprobante al recibirlo. Volverá a “Archivado correctamente”.</p>
      <div class="flex gap-5 text-ink-800 dark:text-ink-100">
        <label class="flex items-center gap-2"><input v-model="condicion" type="radio" value="CONFORME" /> Conforme</label>
        <label class="flex items-center gap-2"><input v-model="condicion" type="radio" value="CON_NOVEDAD" /> Con novedad</label>
      </div>
      <div>
        <label class="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">Observaciones{{ condicion === 'CON_NOVEDAD' ? ' (obligatorio)' : ' (opcional)' }}</label>
        <textarea v-model="observaciones" rows="3" class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100" />
      </div>
      <p v-if="error" class="text-red-600">{{ error }}</p>
    </div>
    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)">Cancelar</BaseButton>
      <BaseButton :loading="saving" @click="confirmar">Confirmar devolución</BaseButton>
    </template>
  </BaseModal>
</template>
