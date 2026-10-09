<script setup lang="ts">
import { reactive, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { Deposito, DepositoPayload } from '@/types/archivo.types'

const props = defineProps<{
  modelValue: boolean
  deposito?: Deposito | null
  saving?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [payload: DepositoPayload, id?: number]
}>()

const form = reactive({ codigo: '', nombre: '', ubicacion: '', descripcion: '', activo: true })

watch(
  () => [props.deposito, props.modelValue] as const,
  ([d]) => {
    form.codigo = d?.codigo ?? ''
    form.nombre = d?.nombre ?? ''
    form.ubicacion = d?.ubicacion ?? ''
    form.descripcion = d?.descripcion ?? ''
    form.activo = d?.activo ?? true
  },
  { immediate: true },
)

function handleSubmit() {
  emit(
    'save',
    {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      ubicacion: form.ubicacion.trim(),
      descripcion: form.descripcion.trim(),
      activo: form.activo,
    },
    props.deposito?.id,
  )
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="deposito ? 'Editar depósito' : 'Registrar depósito'"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="deposito-form" class="space-y-4" @submit.prevent="handleSubmit">
      <BaseInput v-model="form.codigo" label="Código" placeholder="DEP-01" required />
      <BaseInput v-model="form.nombre" label="Nombre" placeholder="Archivo Central" required />
      <BaseInput v-model="form.ubicacion" label="Ubicación" placeholder="Edificio principal, piso 1" />
      <BaseInput v-model="form.descripcion" label="Descripción" />
      <label v-if="deposito" class="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
        <input v-model="form.activo" type="checkbox" /> Depósito activo
      </label>
      <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)">Cancelar</BaseButton>
      <BaseButton type="submit" form="deposito-form" :loading="saving">Guardar</BaseButton>
    </template>
  </BaseModal>
</template>
