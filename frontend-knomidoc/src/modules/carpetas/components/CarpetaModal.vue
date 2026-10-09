<script setup lang="ts">
import { reactive, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import type { Estante } from '@/types/archivo.types'
import type { Carpeta, CarpetaCreatePayload, CarpetaUpdatePayload } from '@/types/c31.types'

const props = defineProps<{
  modelValue: boolean
  carpeta?: Carpeta | null
  estantes: Estante[]
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
  estanteId: '' as string | number,
  estadoFisico: 'EN_ARCHIVO' as 'EN_ARCHIVO' | 'PRESTADO',
})

watch(
  () => props.carpeta,
  (carpeta) => {
    form.codigoCarpeta = carpeta?.codigoCarpeta ?? ''
    form.ubicacionFisica = carpeta?.ubicacionFisica ?? ''
    form.estanteId = carpeta?.estanteId ?? ''
    form.estadoFisico = (carpeta?.estadoFisico as 'EN_ARCHIVO' | 'PRESTADO') ?? 'EN_ARCHIVO'
  },
  { immediate: true },
)

function handleSubmit() {
  const estanteId = form.estanteId === '' ? null : Number(form.estanteId)
  if (props.carpeta) {
    // Si cambia de estante, la referencia se rearma en el servidor sobre el nuevo estante
    const cambioEstante = estanteId !== null && estanteId !== (props.carpeta.estanteId ?? null)
    const payload: CarpetaUpdatePayload = {
      codigoCarpeta: form.codigoCarpeta,
      ...(cambioEstante ? {} : { ubicacionFisica: form.ubicacionFisica }),
      ...(estanteId !== null ? { estanteId } : {}),
      estadoFisico: form.estadoFisico,
    }
    emit('update', props.carpeta.id, payload)
  } else {
    emit('create', {
      codigoCarpeta: form.codigoCarpeta,
      ubicacionFisica: form.ubicacionFisica || undefined,
      estanteId,
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
      <BaseSelect
        v-model="form.estanteId"
        label="Estante"
        placeholder="Sin estante asignado"
        hint="Define el depósito y estante donde se guarda la carpeta."
        :options="
          estantes.map((e) => ({
            value: e.id,
            label: `${e.deposito?.codigo ?? ''} / ${e.codigo}${e.descripcion ? ' — ' + e.descripcion : ''}`,
          }))
        "
      />
      <BaseInput
        v-if="!carpeta || !form.estanteId || Number(form.estanteId) === carpeta.estanteId"
        v-model="form.ubicacionFisica"
        :label="form.estanteId ? 'Referencia física' : 'Ubicación física'"
        placeholder="Caja 12"
        :required="!form.estanteId"
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
