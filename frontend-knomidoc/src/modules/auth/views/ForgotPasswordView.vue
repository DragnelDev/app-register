<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()

const email = ref('')
const errorMessage = ref('')
const sent = ref(false)

async function handleSubmit() {
  errorMessage.value = ''
  try {
    await auth.forgotPassword(email.value)
    // Se muestra el mismo mensaje exista o no el correo (evita filtrar qué
    // correos están registrados en el sistema).
    sent.value = true
  } catch {
    errorMessage.value = 'No se pudo procesar la solicitud. Intenta nuevamente.'
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-ink-950 px-4">
    <div class="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl">
      <div class="mb-6 text-center">
        <h1 class="font-display text-2xl font-semibold text-ink-900">Recuperar contraseña</h1>
        <p class="mt-1 text-sm text-ink-400">
          Ingresa tu correo registrado y te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

      <div v-if="sent" class="space-y-4 text-center">
        <p class="rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          Si el correo está registrado, en unos minutos recibirás un enlace para restablecer tu
          contraseña. Revisa también tu bandeja de spam.
        </p>
        <RouterLink to="/login" class="text-sm font-medium text-ink-700 hover:underline">
          Volver a iniciar sesión
        </RouterLink>
      </div>

      <form v-else class="space-y-4" @submit.prevent="handleSubmit">
        <BaseInput
          v-model="email"
          type="email"
          label="Correo electrónico"
          placeholder="usuario@knomidoc.com"
          required
        />

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <BaseButton type="submit" class="w-full justify-center" :loading="auth.loading">
          Enviar enlace de recuperación
        </BaseButton>

        <p class="text-center text-sm">
          <RouterLink to="/login" class="font-medium text-ink-700 hover:underline">
            Volver a iniciar sesión
          </RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>
