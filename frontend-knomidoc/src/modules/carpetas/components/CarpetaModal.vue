<script setup lang="ts">
import { reactive, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { Carpeta, CarpetaCreatePayload, CarpetaUpdatePayload } from '@/types/c31.types'

const props = defineProps<{
  modelValue: boolean
  carpeta?: Carpeta | null
  saving?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  create: [payload: CarpetaCreatePayload]
  update: [id: string | number, payload: CarpetaUpdatePayload]
}>()

const form = reactive({
  codigoCarpeta: '',
  ubicacionFisica: '',
  estadoFisico: 'EN_ARCHIVO' as 'EN_ARCHIVO' | 'PRESTADO',
})

watch(
  () => props.carpeta,
  (carpeta) => {
    form.codigoCarpeta = carpeta?.codigoCarpeta ?? ''
    form.ubicacionFisica = carpeta?.ubicacionFisica ?? ''
    form.estadoFisico = (carpeta?.estadoFisico as 'EN_ARCHIVO' | 'PRESTADO') ?? 'EN_ARCHIVO'
  },
  { immediate: true },
)

function handleSubmit() {
  if (props.carpeta) {
    const payload: CarpetaUpdatePayload = {
      codigoCarpeta: form.codigoCarpeta,
      ubicacionFisica: form.ubicacionFisica,
      estadoFisico: form.estadoFisico,
    }
    emit('update', props.carpeta.id, payload)
  } else {
    emit('create', {
      codigoCarpeta: form.codigoCarpeta,
      ubicacionFisica: form.ubicacionFisica,
      estadoFisico: form.estadoFisico,
    })
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="carpeta ? 'Editar carpeta' : 'Registrar nueva carpeta'"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="carpeta-form" class="space-y-4" @submit.prevent="handleSubmit">
      <BaseInput
        v-model="form.codigoCarpeta"
        label="Código de carpeta"
        placeholder="CARP-2026-001"
        required
      />
      <BaseInput
        v-model="form.ubicacionFisica"
        label="Ubicación física"
        placeholder="Estante 4, Caja 12"
        required
      />
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-ink-700 dark:text-ink-200">Estado</label>
        <select
          v-model="form.estadoFisico"
          class="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option value="EN_ARCHIVO">En archivo</option>
          <option value="PRESTADO">Prestado</option>
        </select>
      </div>
      <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
    </form>

    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)"
        >Cancelar</BaseButton
      >
      <BaseButton type="submit" form="carpeta-form" :loading="saving">Guardar</BaseButton>
    </template>
  </BaseModal>
</template>
