<script setup lang="ts">
import { reactive, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import type { Deposito, Estante, EstantePayload } from '@/types/archivo.types'

const props = defineProps<{
  modelValue: boolean
  estante?: Estante | null
  depositos: Deposito[]
  saving?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [payload: EstantePayload, id?: number]
}>()

const form = reactive({
  codigo: '',
  depositoId: '' as string | number,
  descripcion: '',
  niveles: '' as string | number,
  activo: true,
})

watch(
  () => [props.estante, props.modelValue] as const,
  ([e]) => {
    form.codigo = e?.codigo ?? ''
    form.depositoId = e?.depositoId ?? ''
    form.descripcion = e?.descripcion ?? ''
    form.niveles = e?.niveles ?? ''
    form.activo = e?.activo ?? true
  },
  { immediate: true },
)

function handleSubmit() {
  emit(
    'save',
    {
      codigo: form.codigo.trim(),
      depositoId: form.depositoId === '' ? null : Number(form.depositoId),
      descripcion: form.descripcion.trim(),
      niveles: form.niveles === '' ? null : Number(form.niveles),
      activo: form.activo,
    },
    props.estante?.id,
  )
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="estante ? 'Editar estante' : 'Registrar estante'"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="estante-form" class="space-y-4" @submit.prevent="handleSubmit">
      <BaseInput v-model="form.codigo" label="Código" placeholder="EST-01" required />
      <BaseSelect
        v-model="form.depositoId"
        label="Depósito"
        placeholder="Seleccione un depósito…"
        required
        :options="depositos.map((d) => ({ value: d.id, label: `${d.codigo} — ${d.nombre}` }))"
      />
      <BaseInput
        v-model="form.descripcion"
        label="Descripción"
        placeholder="Pasillo B, lado izquierdo"
      />
      <BaseInput
        v-model="form.niveles"
        type="number"
        label="Niveles / repisas"
        hint="Opcional, entre 1 y 50"
      />
      <label v-if="estante" class="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
        <input v-model="form.activo" type="checkbox" /> Estante activo
      </label>
      <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)"
        >Cancelar</BaseButton
      >
      <BaseButton type="submit" form="estante-form" :loading="saving">Guardar</BaseButton>
    </template>
  </BaseModal>
</template>
