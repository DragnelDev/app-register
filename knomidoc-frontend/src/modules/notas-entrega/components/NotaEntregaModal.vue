<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
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
  imagenFile: null,
})

const previewUrl = ref<string | null>(null)
const MAX_SIZE_MB = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB ?? 5)
const fileError = ref('')

watch(
  () => props.nota,
  (nota) => {
    form.numeroNota = nota?.numeroNota ?? ''
    form.oficinaOrigen = nota?.oficinaOrigen ?? ''
    form.fechaEntrega = nota?.fechaEntrega ?? ''
    form.imagenFile = null
    previewUrl.value = nota?.imagenUrl ?? null
    fileError.value = ''
  },
  { immediate: true },
)

function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    fileError.value = `La imagen debe pesar menos de ${MAX_SIZE_MB}MB.`
    return
  }

  fileError.value = ''
  form.imagenFile = file
  previewUrl.value = URL.createObjectURL(file)
}

function handleSubmit() {
  if (fileError.value) return
  emit('save', { ...form })
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="nota ? 'Editar nota de entrega' : 'Registrar nota de entrega'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="nota-entrega-form" class="space-y-4" @submit.prevent="handleSubmit">
      <BaseInput v-model="form.numeroNota" label="N° de nota" placeholder="NE-2026-001" required />
      <BaseInput v-model="form.oficinaOrigen" label="Oficina de origen" placeholder="Tesorería" required />
      <BaseInput v-model="form.fechaEntrega" type="date" label="Fecha de entrega" required />

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-ink-700">Respaldo digitalizado (máx. {{ MAX_SIZE_MB }}MB)</label>
        <input
          type="file"
          accept="image/*"
          class="text-sm text-ink-600 file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200"
          @change="handleFileChange"
        />
        <p v-if="fileError" class="text-xs text-red-600">{{ fileError }}</p>
        <img v-if="previewUrl" :src="previewUrl" alt="Vista previa de la nota de entrega" class="mt-2 h-32 rounded-md border border-ink-100 object-cover" />
      </div>
    </form>

    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)">Cancelar</BaseButton>
      <BaseButton type="submit" form="nota-entrega-form" :loading="saving">Guardar</BaseButton>
    </template>
  </BaseModal>
</template>
