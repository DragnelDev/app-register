<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import BaseButton from '@/components/ui/BaseButton.vue'
import CodigoInput from '../components/CodigoInput.vue'
import { extractApiErrorMessage } from '@/utils/http-error'

const auth = useAuthStore()
const router = useRouter()

const codigo = ref('')
const error = ref('')
const aviso = ref('')
const verificando = ref(false)
const enviando = ref(false)
const espera = ref(0)
let reloj: ReturnType<typeof setInterval> | undefined

const correo = computed(() => auth.usuario?.email ?? '')

function iniciarEspera(segundos = 60) {
  espera.value = segundos
  clearInterval(reloj)
  reloj = setInterval(() => {
    espera.value -= 1
    if (espera.value <= 0) clearInterval(reloj)
  }, 1000)
}

async function enviar() {
  error.value = aviso.value = ''
  enviando.value = true
  try {
    const r = await auth.enviarCodigoVerificacion()
    aviso.value = r.mensaje
    iniciarEspera()
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo enviar el código.')
    if (/segundos/.test(error.value)) iniciarEspera(Number(error.value.match(/\d+/)?.[0] ?? 60))
  } finally {
    enviando.value = false
  }
}

async function verificar() {
  error.value = ''
  if (!/^\d{6}$/.test(codigo.value)) return (error.value = 'Ingrese los 6 dígitos del código.')
  verificando.value = true
  try {
    await auth.verificarEmail(codigo.value)
    router.replace({ name: 'dashboard' })
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo verificar el código.')
  } finally {
    verificando.value = false
  }
}

function salir() {
  auth.logout()
  router.replace({ name: 'login' })
}

onMounted(enviar)
onBeforeUnmount(() => clearInterval(reloj))
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-ink-950 px-4">
    <div class="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl dark:border dark:border-white/10 dark:bg-ink-900">
      <div class="mb-5 text-center">
        <h1 class="font-display text-2xl font-semibold text-ink-900 dark:text-white">Verifica tu correo</h1>
        <p class="mt-2 text-sm text-ink-500 dark:text-ink-400">
          Enviamos un código de 6 dígitos a <strong class="text-ink-800 dark:text-ink-100">{{ correo }}</strong
          >. Vence en 10 minutos.
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="verificar">
        <CodigoInput v-model="codigo" />
        <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
        <p v-if="aviso" class="text-sm text-emerald-700" role="status">{{ aviso }}</p>
        <BaseButton type="submit" class="w-full justify-center" :loading="verificando">
          Verificar correo
        </BaseButton>
      </form>

      <div class="mt-5 space-y-2 text-center text-sm">
        <button
          type="button"
          class="font-medium text-ink-700 dark:text-ink-200 hover:underline disabled:cursor-not-allowed disabled:text-ink-300 disabled:no-underline"
          :disabled="espera > 0 || enviando"
          @click="enviar"
        >
          {{ espera > 0 ? `Reenviar código en ${espera}s` : 'Reenviar código' }}
        </button>
        <p class="text-ink-400">
          ¿Correo equivocado?
          <RouterLink to="/perfil" class="font-medium text-ink-700 dark:text-ink-200 hover:underline"
            >Corrígelo en tu perfil</RouterLink
          >
        </p>
        <button type="button" class="text-ink-400 hover:underline" @click="salir">
          Cerrar sesión
        </button>
      </div>
    </div>
  </div>
</template>
