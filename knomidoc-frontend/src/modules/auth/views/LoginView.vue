<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ email: '', password: '' })
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  try {
    await auth.login(form)
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch {
    errorMessage.value = 'Credenciales inválidas. Verifica tu correo y contraseña.'
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-ink-950 px-4">
    <div class="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl">
      <div class="mb-6 text-center">
        <h1 class="font-display text-2xl font-semibold text-ink-900">KnomiDoc</h1>
        <!-- Imagen centrada desde assets/images -->
        <img src="@/assets/images/logo.png" alt="KnomiDoc Logo" class="mx-auto mb-3 h-12 w-auto object-contain" />
        <p class="mt-1 text-sm text-ink-400">Gestión de comprobantes C31 y préstamos</p>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <BaseInput v-model="form.email" type="email" label="Correo electrónico" placeholder="usuario@institucion.gob"
          required />
        <BaseInput v-model="form.password" type="password" label="Contraseña" placeholder="••••••••" required />

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <BaseButton type="submit" class="w-full justify-center" :loading="auth.loading">
          Ingresar
        </BaseButton>
      </form>
    </div>
  </div>
</template>
