<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { extractApiErrorMessage } from '@/utils/http-error'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const errorMessage = ref('')

const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

async function handleSubmit() {
  errorMessage.value = ''
  if (!emailValido(email.value)) {
    errorMessage.value = 'Ingresa un correo válido.'
    return
  }
  try {
    await auth.forgotPassword(email.value.trim().toLowerCase())
    // Responde igual exista o no el correo (no revela qué correos están registrados)
    router.push({ name: 'reset-password', query: { email: email.value.trim().toLowerCase() } })
  } catch (err) {
    errorMessage.value = extractApiErrorMessage(
      err,
      'No se pudo procesar la solicitud. Intenta nuevamente.',
    )
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-ink-950 px-4">
    <div class="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl dark:border dark:border-white/10 dark:bg-ink-900">
      <div class="mb-6 text-center">
        <h1 class="font-display text-2xl font-semibold text-ink-900 dark:text-white">Recuperar contraseña</h1>
        <p class="mt-1 text-sm text-ink-400">
          Ingresa tu correo registrado y te enviaremos un código de 6 dígitos.
        </p>
      </div>

      <form class="space-y-4" novalidate @submit.prevent="handleSubmit">
        <BaseInput
          v-model="email"
          type="email"
          label="Correo electrónico"
          placeholder="usuario@knomidoc.com"
          required
        />
        <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
        <BaseButton type="submit" class="w-full justify-center" :loading="auth.loading"
          >Enviar código</BaseButton
        >
        <p class="text-center text-sm">
          <RouterLink to="/login" class="font-medium text-ink-700 dark:text-ink-200 hover:underline"
            >Volver a iniciar sesión</RouterLink
          >
        </p>
      </form>
    </div>
  </div>
</template>
