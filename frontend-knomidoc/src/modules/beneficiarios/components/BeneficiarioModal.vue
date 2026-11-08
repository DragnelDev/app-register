<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { Beneficiario, BeneficiarioPayload } from '@/types/beneficiarios.types'

const props = defineProps<{
  modelValue: boolean
  beneficiario: Beneficiario | null
  saving?: boolean
  serverError?: string
}>()
const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  create: [p: BeneficiarioPayload]
  update: [id: number, p: Partial<BeneficiarioPayload>]
}>()

const vacio = () => ({
  tipoPersona: 'NATURAL',
  nombre: '',
  tipoDocumento: 'CI',
  numeroDocumento: '',
  telefono: '',
  email: '',
  direccion: '',
  estado: 'ACTIVO',
})
const form = reactive(vacio())
const error = ref('')

watch(
  () => props.modelValue,
  (abierto) => {
    if (!abierto) return
    error.value = ''
    const b = props.beneficiario
    Object.assign(
      form,
      vacio(),
      b
        ? {
            tipoPersona: b.tipoPersona,
            nombre: b.nombre,
            tipoDocumento: b.tipoDocumento,
            numeroDocumento: b.numeroDocumento ?? '',
            telefono: b.telefono ?? '',
            email: b.email ?? '',
            direccion: b.direccion ?? '',
            estado: b.estado,
          }
        : {},
    )
  },
)

// Persona jurídica → NIT por defecto
watch(
  () => form.tipoPersona,
  (t) => {
    if (props.beneficiario) return
    if (t === 'JURIDICA' && form.tipoDocumento === 'CI') form.tipoDocumento = 'NIT'
    if (t === 'NATURAL' && form.tipoDocumento === 'NIT') form.tipoDocumento = 'CI'
  },
)

function guardar() {
  error.value = ''
  const nombre = form.nombre.trim().replace(/\s+/g, ' ').toUpperCase()
  if (nombre.length < 2) {
    error.value = 'El nombre o razón social es obligatorio'
    return
  }
  const sinDoc = form.tipoDocumento === 'SIN_DOCUMENTO'
  if (!sinDoc && !form.numeroDocumento.trim()) {
    error.value = 'Indique el número de documento o elija "Sin documento"'
    return
  }
  const payload: BeneficiarioPayload = {
    tipoPersona: form.tipoPersona as 'NATURAL',
    nombre,
    tipoDocumento: form.tipoDocumento as 'CI',
    numeroDocumento: sinDoc ? undefined : form.numeroDocumento.trim(),
    telefono: form.telefono.trim() || undefined,
    email: form.email.trim() || undefined,
    direccion: form.direccion.trim() || undefined,
    estado: form.estado as 'ACTIVO',
  }
  if (props.beneficiario) emit('update', props.beneficiario.id, payload)
  else emit('create', payload)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="beneficiario ? 'Editar beneficiario' : 'Registrar beneficiario'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form
      id="form-beneficiario"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2"
      @submit.prevent="guardar"
    >
      <p
        v-if="error || serverError"
        class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ error || serverError }}
      </p>
      <BaseSelect
        v-model="form.tipoPersona"
        label="Tipo de persona"
        :options="[
          { value: 'NATURAL', label: 'Natural' },
          { value: 'JURIDICA', label: 'Jurídica (empresa)' },
        ]"
      />
      <BaseSelect
        v-model="form.tipoDocumento"
        label="Documento"
        :options="[
          { value: 'CI', label: 'CI' },
          { value: 'NIT', label: 'NIT' },
          { value: 'OTRO', label: 'Otro' },
          { value: 'SIN_DOCUMENTO', label: 'Sin documento' },
        ]"
      />
      <div class="sm:col-span-2">
        <BaseInput v-model="form.nombre" label="Nombre completo o razón social" required />
      </div>
      <BaseInput
        v-model="form.numeroDocumento"
        label="N° de documento"
        :disabled="form.tipoDocumento === 'SIN_DOCUMENTO'"
      />
      <BaseInput v-model="form.telefono" label="Teléfono (opcional)" />
      <BaseInput v-model="form.email" label="Correo (opcional)" type="email" />
      <BaseInput v-model="form.direccion" label="Dirección (opcional)" />
      <BaseSelect
        v-if="beneficiario"
        v-model="form.estado"
        label="Estado"
        :options="[
          { value: 'ACTIVO', label: 'Activo' },
          { value: 'INACTIVO', label: 'Inactivo' },
        ]"
      />
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)"
        >Cancelar</BaseButton
      >
      <BaseButton type="submit" form="form-beneficiario" :loading="saving">Guardar</BaseButton>
    </template>
  </BaseModal>
</template>
