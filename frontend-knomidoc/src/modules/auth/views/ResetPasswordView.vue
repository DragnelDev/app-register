<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CodigoInput from '../components/CodigoInput.vue'
import { extractApiErrorMessage } from '@/utils/http-error'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const form = reactive({
  email: (route.query.email as string) || '',
  codigo: '',
  password: '',
  confirmPassword: '',
})
const errorMessage = ref('')
const success = ref(false)

const passwordValida = (v: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(v)

async function handleSubmit() {
  errorMessage.value = ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()))
    return (errorMessage.value = 'Ingresa un correo válido.')
  if (!/^\d{6}$/.test(form.codigo))
    return (errorMessage.value = 'Ingresa los 6 dígitos del código.')
  if (!passwordValida(form.password))
    return (errorMessage.value =
      'La contraseña debe tener entre 8 y 72 caracteres, con al menos una letra y un número.')
  if (form.password !== form.confirmPassword)
    return (errorMessage.value = 'Las contraseñas no coinciden.')

  try {
    await auth.resetPassword(form.email.trim().toLowerCase(), form.codigo, form.password)
    success.value = true
    setTimeout(() => router.push({ name: 'login' }), 2500)
  } catch (err) {
    errorMessage.value = extractApiErrorMessage(err, 'El código no es válido o ha expirado.')
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-ink-950 px-4">
    <div class="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl">
      <div class="mb-6 text-center">
        <h1 class="font-display text-2xl font-semibold text-ink-900">Nueva contraseña</h1>
        <p class="mt-1 text-sm text-ink-400">
          Si el correo está registrado, te enviamos un código de 6 dígitos (vence en 10 minutos).
        </p>
      </div>

      <p
        v-if="success"
        class="rounded-md bg-emerald-50 px-3 py-3 text-center text-sm text-emerald-700"
        role="status"
      >
        Tu contraseña se actualizó correctamente. Serás redirigido al inicio de sesión…
      </p>

      <form v-else class="space-y-4" novalidate @submit.prevent="handleSubmit">
        <BaseInput v-model="form.email" type="email" label="Correo electrónico" required />
        <div>
          <label class="mb-1.5 block text-sm font-medium text-ink-700">Código de 6 dígitos</label>
          <CodigoInput v-model="form.codigo" />
        </div>
        <BaseInput
          v-model="form.password"
          type="password"
          label="Nueva contraseña"
          placeholder="Mínimo 8, con letra y número"
          required
        />
        <BaseInput
          v-model="form.confirmPassword"
          type="password"
          label="Confirmar contraseña"
          required
        />
        <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
        <BaseButton type="submit" class="w-full justify-center" :loading="auth.loading"
          >Guardar nueva contraseña</BaseButton
        >
        <p class="text-center text-sm">
          <RouterLink to="/forgot-password" class="text-ink-500 hover:underline"
            >Pedir otro código</RouterLink
          >
          ·
          <RouterLink to="/login" class="font-medium text-ink-700 hover:underline"
            >Iniciar sesión</RouterLink
          >
        </p>
      </form>
    </div>
  </div>
</template>
