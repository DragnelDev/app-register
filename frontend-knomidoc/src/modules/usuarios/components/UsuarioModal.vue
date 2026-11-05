<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  emailValido,
  maxLength,
  nombrePersona,
  passwordFuerte,
  required,
  runValidators,
  usernameValido,
} from '@/utils/validators'
import type { Usuario, UsuarioCreatePayload, UsuarioUpdatePayload } from '@/types/auth.types'
import type { RolUsuario } from '@/types/common.types'

const props = defineProps<{
  modelValue: boolean
  usuario?: Usuario | null
  saving?: boolean
  serverError?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  create: [payload: UsuarioCreatePayload]
  update: [id: string, payload: UsuarioUpdatePayload]
}>()

const roles: RolUsuario[] = [
  'ADMIN',
  'OPERADOR_ARCHIVOS',
  'ENCARGADO_PRESTAMOS',
  'CONSULTA_EXTERNA',
]

const form = reactive({
  username: '',
  nombreCompleto: '',
  email: '',
  cargo: '',
  unidadOArea: '',
  password: '',
  rol: 'OPERADOR_ARCHIVOS' as RolUsuario,
})

watch(
  () => props.usuario,
  (usuario) => {
    form.username = usuario?.username ?? ''
    form.nombreCompleto = usuario?.nombreCompleto ?? ''
    form.email = usuario?.email ?? ''
    form.cargo = usuario?.cargo ?? ''
    form.unidadOArea = usuario?.unidadOArea ?? ''
    form.password = ''
    form.rol = usuario?.rol ?? 'OPERADOR_ARCHIVOS'
  },
  { immediate: true },
)

const intentado = ref(false)
const errores = computed(() => ({
  username: props.usuario
    ? ''
    : (runValidators(form.username, [required('El usuario es obligatorio'), usernameValido()]) ??
      ''),
  nombreCompleto:
    runValidators(form.nombreCompleto, [
      required('El nombre es obligatorio'),
      nombrePersona(),
      maxLength(150),
    ]) ?? '',
  email:
    runValidators(form.email, [
      required('El correo es obligatorio'),
      emailValido(),
      maxLength(100),
    ]) ?? '',
  password:
    props.usuario && !form.password
      ? ''
      : (runValidators(form.password, [
          required('La contraseña es obligatoria'),
          passwordFuerte(),
        ]) ?? ''),
}))
const ver = (e: string) => (intentado.value ? e : '')

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) intentado.value = false
  },
)

function handleSubmit() {
  intentado.value = true
  if (Object.values(errores.value).some(Boolean)) return
  if (props.usuario) {
    // No se envía la contraseña si se dejó en blanco (no se quiere resetear)
    const payload: UsuarioUpdatePayload = {
      nombreCompleto: form.nombreCompleto,
      email: form.email,
      cargo: form.cargo || undefined,
      unidadOArea: form.unidadOArea || undefined,
      rol: form.rol,
      ...(form.password ? { password: form.password } : {}),
    }
    emit('update', props.usuario.id, payload)
  } else {
    emit('create', {
      username: form.username,
      nombreCompleto: form.nombreCompleto,
      email: form.email,
      cargo: form.cargo || undefined,
      unidadOArea: form.unidadOArea || undefined,
      password: form.password,
      rol: form.rol,
    })
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="usuario ? 'Editar usuario' : 'Registrar nuevo usuario'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="usuario-form" class="space-y-4" novalidate @submit.prevent="handleSubmit">
      <p
        v-if="serverError"
        class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
        role="alert"
      >
        {{ serverError }}
      </p>
      <BaseInput
        v-model="form.username"
        label="Usuario"
        placeholder="jperez"
        required
        :disabled="Boolean(usuario)"
        :error="ver(errores.username)"
      />
      <BaseInput
        v-model="form.nombreCompleto"
        label="Nombre completo"
        required
        :error="ver(errores.nombreCompleto)"
      />
      <BaseInput
        v-model="form.email"
        type="email"
        label="Correo electrónico"
        required
        :error="ver(errores.email)"
        :hint="
          usuario
            ? 'Si cambia el correo, deberá volver a verificarlo con un código.'
            : 'Recibirá un código de 6 dígitos para verificarlo al ingresar.'
        "
      />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput v-model="form.cargo" label="Cargo (opcional)" />
        <BaseInput v-model="form.unidadOArea" label="Unidad / área (opcional)" />
      </div>
      <BaseInput
        v-model="form.password"
        type="password"
        :label="usuario ? 'Nueva contraseña (opcional)' : 'Contraseña'"
        :hint="usuario ? 'Déjalo en blanco para mantener la contraseña actual.' : undefined"
        :required="!usuario"
        :error="ver(errores.password)"
      />

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-ink-700 dark:text-ink-200">Rol</label>
        <select
          v-model="form.rol"
          class="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option v-for="rol in roles" :key="rol" :value="rol">{{ rol }}</option>
        </select>
        <p class="text-xs text-ink-400">
          ADMIN gestiona todo el sistema · OPERADOR_ARCHIVOS registra actas y comprobantes C31 ·
          ENCARGADO_PRESTAMOS gestiona préstamos · CONSULTA_EXTERNA solo lectura.
        </p>
      </div>
    </form>

    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)"
        >Cancelar</BaseButton
      >
      <BaseButton type="submit" form="usuario-form" :loading="saving">Guardar</BaseButton>
    </template>
  </BaseModal>
</template>
