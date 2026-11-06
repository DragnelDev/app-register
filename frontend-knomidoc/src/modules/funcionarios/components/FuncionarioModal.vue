<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  required,
  maxLength,
  minLength,
  telefonoValido,
  pattern,
  runValidators,
} from '@/utils/validators'
import { REGEX_NOMBRE } from '@/utils/validators'
import type { Funcionario, FuncionarioPayload } from '@/types/funcionarios.types'

const props = defineProps<{
  modelValue: boolean
  funcionario: Funcionario | null
  saving?: boolean
  serverError?: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  create: [payload: FuncionarioPayload]
  update: [id: number, payload: Partial<FuncionarioPayload>]
}>()

const vacio = () => ({
  ci: '',
  nombres: '',
  apellidos: '',
  cargo: '',
  unidadOficina: '',
  telefono: '',
  estado: 'ACTIVO' as 'ACTIVO' | 'INACTIVO',
})
const form = reactive(vacio())
const errors = reactive<Record<string, string>>({})

const nombreOk = pattern(REGEX_NOMBRE, "Solo letras, espacios y . , ' ( ) -")

const rules = {
  ci: [
    required('El CI es obligatorio'),
    maxLength(20),
    pattern(/^[A-Za-z0-9-]+$/, 'Solo letras, números y guion'),
  ],
  nombres: [required('Los nombres son obligatorios'), minLength(2), nombreOk, maxLength(100)],
  apellidos: [
    required('Los apellidos son obligatorios'),
    minLength(2),
    nombreOk,
    maxLength(100),
  ],
  cargo: [required('El cargo es obligatorio'), maxLength(150)],
  unidadOficina: [required('La unidad u oficina es obligatoria'), maxLength(150)],
} as const

const telefonoRegla = [telefonoValido(), maxLength(30)]

watch(
  () => props.modelValue,
  (abierto) => {
    if (!abierto) return
    Object.keys(errors).forEach((k) => delete errors[k])
    Object.assign(form, vacio(), {
      ...(props.funcionario
        ? { ...props.funcionario, telefono: props.funcionario.telefono ?? '' }
        : {}),
    })
  },
)

const esEdicion = () => props.funcionario !== null

function validar(): boolean {
  let ok = true
  ;(Object.keys(rules) as (keyof typeof rules)[]).forEach((campo) => {
    const msg = runValidators(form[campo], rules[campo] as never) ?? ''
    errors[campo] = msg
    if (msg) ok = false
  })
  if (form.telefono) {
    const msg = runValidators(form.telefono, telefonoRegla) ?? ''
    errors.telefono = msg
    if (msg) ok = false
  } else errors.telefono = ''
  return ok
}

const intentado = ref(false)

function guardar() {
  intentado.value = true
  if (!validar()) return
  const payload: FuncionarioPayload = {
    ci: form.ci.trim(),
    nombres: form.nombres.trim(),
    apellidos: form.apellidos.trim(),
    cargo: form.cargo.trim(),
    unidadOficina: form.unidadOficina.trim(),
    telefono: form.telefono.trim() || undefined,
    estado: form.estado,
  }
  if (props.funcionario) emit('update', props.funcionario.id, payload)
  else emit('create', payload)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="esEdicion() ? 'Editar funcionario' : 'Registrar funcionario'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="form-funcionario" class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="guardar">
      <p v-if="serverError" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2 dark:bg-red-950/40 dark:text-red-300">
        {{ serverError }}
      </p>
      <BaseInput v-model="form.ci" label="CI" required :error="errors.ci" @blur="validar" />
      <BaseInput v-model="form.telefono" label="Teléfono (opcional)" :error="errors.telefono" />
      <BaseInput v-model="form.nombres" label="Nombres" required :error="errors.nombres" />
      <BaseInput v-model="form.apellidos" label="Apellidos" required :error="errors.apellidos" />
      <BaseInput v-model="form.cargo" label="Cargo" required :error="errors.cargo" />
      <BaseInput
        v-model="form.unidadOficina"
        label="Unidad / oficina"
        placeholder="Ej: Obras Públicas, Auditoría Interna"
        required
        :error="errors.unidadOficina"
      />
      <BaseSelect
        v-if="esEdicion()"
        v-model="form.estado"
        label="Estado"
        :options="[
          { value: 'ACTIVO', label: 'Activo' },
          { value: 'INACTIVO', label: 'Inactivo' },
        ]"
      />
    </form>
    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)">Cancelar</BaseButton>
      <BaseButton type="submit" form="form-funcionario" :loading="saving">Guardar</BaseButton>
    </template>
  </BaseModal>
</template>
