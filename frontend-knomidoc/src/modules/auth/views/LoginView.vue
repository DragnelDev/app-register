<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ username: '', password: '' })
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  try {
    await auth.login(form)
    // Con varios perfiles se elige con cuál trabajar antes de entrar
    if (auth.perfilPendiente) {
      router.push({ name: 'seleccionar-perfil' })
      return
    }
    const redirect = (route.query.redirect as string) || auth.rutaInicial
    router.push(redirect)
  } catch {
    errorMessage.value = 'Credenciales inválidas. Verifica tu usuario y contraseña.'
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-ink-950 px-4">
    <div
      class="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl dark:border dark:border-white/10 dark:bg-ink-900"
    >
      <div class="mb-6 text-center">
        <h1 class="font-display text-2xl font-semibold text-ink-900 dark:text-white">KnomiDoc</h1>
        <!-- Imagen centrada desde assets/images -->
        <img
          src="@/assets/images/logo.png"
          alt="KnomiDoc Logo"
          class="mx-auto mb-3 h-12 w-auto object-contain"
        />
        <p class="mt-1 text-sm text-ink-400">Gestión de comprobantes C31 y préstamos</p>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <BaseInput
          v-model="form.username"
          type="text"
          label="Usuario"
          placeholder="usuario o correo"
          required
        />
        <BaseInput
          v-model="form.password"
          type="password"
          label="Contraseña"
          placeholder="••••••••"
          required
        />

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <BaseButton type="submit" class="w-full justify-center" :loading="auth.loading">
          Ingresar
        </BaseButton>

        <p class="text-center text-sm">
          <RouterLink
            to="/forgot-password"
            class="font-medium text-ink-700 dark:text-ink-200 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>
