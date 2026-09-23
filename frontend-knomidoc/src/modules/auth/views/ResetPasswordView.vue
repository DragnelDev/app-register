<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const token = (route.query.token as string) || ''

const form = reactive({ password: '', confirmPassword: '' })
const errorMessage = ref('')
const success = ref(false)

async function handleSubmit() {
  errorMessage.value = ''

  if (!token) {
    errorMessage.value = 'El enlace no es válido. Solicita uno nuevo.'
    return
  }
  if (form.password.length < 8) {
    errorMessage.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }
  if (form.password !== form.confirmPassword) {
    errorMessage.value = 'Las contraseñas no coinciden.'
    return
  }

  try {
    await auth.resetPassword(token, form.password)
    success.value = true
    setTimeout(() => router.push({ name: 'login' }), 2500)
  } catch {
    errorMessage.value = 'El enlace no es válido o ha expirado. Solicita uno nuevo.'
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-ink-950 px-4">
    <div class="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl">
      <div class="mb-6 text-center">
        <h1 class="font-display text-2xl font-semibold text-ink-900">Nueva contraseña</h1>
        <p class="mt-1 text-sm text-ink-400">Crea una nueva contraseña para tu cuenta.</p>
      </div>

      <div v-if="success" class="space-y-4 text-center">
        <p class="rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          Tu contraseña se actualizó correctamente. Serás redirigido al inicio de sesión…
        </p>
      </div>

      <template v-else>
        <p v-if="!token" class="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          El enlace no contiene un token válido. Solicita uno nuevo.
        </p>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <BaseInput
            v-model="form.password"
            type="password"
            label="Nueva contraseña"
            placeholder="Mínimo 8 caracteres"
            required
          />
          <BaseInput
            v-model="form.confirmPassword"
            type="password"
            label="Confirmar contraseña"
            placeholder="Repite la contraseña"
            required
          />

          <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

          <BaseButton
            type="submit"
            class="w-full justify-center"
            :loading="auth.loading"
            :disabled="!token"
          >
            Guardar nueva contraseña
          </BaseButton>

          <p class="text-center text-sm">
            <RouterLink to="/login" class="font-medium text-ink-700 hover:underline">
              Volver a iniciar sesión
            </RouterLink>
          </p>
        </form>
      </template>
    </div>
  </div>
</template>
