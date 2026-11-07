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
import { ROLES_ASIGNABLES, ROLES_INFO } from '@/constants/roles'

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

const roles = ROLES_ASIGNABLES

const form = reactive({
  username: '',
  nombreCompleto: '',
  email: '',
  cargo: '',
  unidadOArea: '',
  password: '',
  /** Perfiles del usuario; el primero es el perfil por defecto */
  roles: ['OPERADOR_ARCHIVOS'] as RolUsuario[],
})

function alternarRol(rol: RolUsuario) {
  const i = form.roles.indexOf(rol)
  if (i >= 0) form.roles.splice(i, 1)
  else form.roles.push(rol)
}

watch(
  () => props.usuario,
  (usuario) => {
    form.username = usuario?.username ?? ''
    form.nombreCompleto = usuario?.nombreCompleto ?? ''
    form.email = usuario?.email ?? ''
    form.cargo = usuario?.cargo ?? ''
    form.unidadOArea = usuario?.unidadOArea ?? ''
    form.password = ''
    form.roles = usuario?.rolesDisponibles?.length
      ? [...usuario.rolesDisponibles]
      : [usuario?.rol ?? 'OPERADOR_ARCHIVOS']
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
  if (form.roles.length === 0) return
  if (props.usuario) {
    // No se envía la contraseña si se dejó en blanco (no se quiere resetear)
    const payload: UsuarioUpdatePayload = {
      nombreCompleto: form.nombreCompleto,
      email: form.email,
      cargo: form.cargo || undefined,
      unidadOArea: form.unidadOArea || undefined,
      rol: form.roles[0],
      roles: [...form.roles],
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
      rol: form.roles[0],
      roles: [...form.roles],
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

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-1 text-sm font-medium text-ink-700 dark:text-ink-200">
          Perfiles (puede tener varios)
        </legend>
        <label
          v-for="rol in roles"
          :key="rol"
          class="flex cursor-pointer items-start gap-3 rounded-md border border-ink-200 p-3 text-sm dark:border-white/10"
          :class="form.roles.includes(rol) ? 'border-seal-500 bg-seal-50 dark:bg-seal-500/10' : ''"
        >
          <input
            type="checkbox"
            class="mt-1"
            :checked="form.roles.includes(rol)"
            @change="alternarRol(rol)"
          />
          <span>
            <span class="block font-medium text-ink-900 dark:text-white">
              {{ ROLES_INFO[rol].label }}
              <span
                v-if="form.roles[0] === rol && form.roles.length > 1"
                class="ml-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-normal text-ink-600 dark:bg-white/10 dark:text-ink-200"
                >por defecto</span
              >
            </span>
            <span class="block text-xs text-ink-500 dark:text-ink-300">{{ ROLES_INFO[rol].descripcion }}</span>
          </span>
        </label>
        <p v-if="intentado && form.roles.length === 0" class="text-xs text-red-600">
          Seleccione al menos un perfil.
        </p>
        <p class="text-xs text-ink-400">
          Con varios perfiles, al ingresar elegirá con cuál trabajar y podrá cambiar desde la barra
          superior. El primero que marque es el perfil por defecto.
        </p>
      </fieldset>
    </form>

    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)"
        >Cancelar</BaseButton
      >
      <BaseButton type="submit" form="usuario-form" :loading="saving">Guardar</BaseButton>
    </template>
  </BaseModal>
</template>
