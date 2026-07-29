<script setup lang="ts">
import { reactive, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { NotaEntrega, NotaEntregaCreatePayload } from '@/types/notas-entrega.types'

const props = defineProps<{
  modelValue: boolean
  nota?: NotaEntrega | null
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [payload: NotaEntregaCreatePayload]
}>()

const form = reactive<NotaEntregaCreatePayload>({
  numeroNota: '',
  oficinaOrigen: '',
  fechaEntrega: '',
})

watch(
  () => props.nota,
  (nota) => {
    form.numeroNota = nota?.numeroNota ?? ''
    form.oficinaOrigen = nota?.oficinaOrigen ?? ''
    form.fechaEntrega = nota?.fechaEntrega ?? ''
  },
  { immediate: true },
)

function handleSubmit() {
  emit('save', { ...form })
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="nota ? 'Editar acta de entrega' : 'Registrar acta de entrega'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="nota-entrega-form" class="space-y-4" @submit.prevent="handleSubmit">
      <BaseInput v-model="form.numeroNota" label="N° de acta" placeholder="AE-2026-001" required />
      <BaseInput
        v-model="form.oficinaOrigen"
        label="Oficina de origen"
        placeholder="Tesorería"
        required
      />
      <BaseInput v-model="form.fechaEntrega" type="date" label="Fecha de entrega" required />
    </form>

    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)"
        >Cancelar</BaseButton
      >
      <BaseButton type="submit" form="nota-entrega-form" :loading="saving">Guardar</BaseButton>
    </template>
  </BaseModal>
</template>
