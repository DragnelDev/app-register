<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import { ESTADO_C31_LABEL, fechaCorta, fechaHora } from '@/utils/estados'
import type { Perfil } from '@/types/auth.types'

const auth = useAuthStore()
const perfil = ref<Perfil | null>(null)
const cargando = ref(true)
const errorCarga = ref('')

const ROL: Record<string, string> = {
  ADMIN: 'Administrador',
  OPERADOR_ARCHIVOS: 'Operador de archivos',
  ENCARGADO_PRESTAMOS: 'Encargado de préstamos',
  CONSULTA_EXTERNA: 'Consulta externa',
}

// --- Datos personales ---
const datos = reactive({ nombreCompleto: '', email: '', cargo: '', unidadOArea: '', telefono: '' })
const guardandoDatos = ref(false)
const msgDatos = ref('')
const errDatos = ref('')

// --- Contraseña ---
const clave = reactive({ actual: '', nueva: '', repetir: '' })
const guardandoClave = ref(false)
const msgClave = ref('')
const errClave = ref('')

const iniciales = computed(() =>
  (perfil.value?.nombreCompleto ?? '')
    .split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?',
)

function rellenar(p: Perfil) {
  datos.nombreCompleto = p.nombreCompleto ?? ''
  datos.email = p.email ?? ''
  datos.cargo = p.cargo ?? ''
  datos.unidadOArea = p.unidadOArea ?? ''
  datos.telefono = p.telefono ?? ''
}

async function cargar() {
  cargando.value = true
  try {
    perfil.value = await authService.perfil()
    rellenar(perfil.value)
  } catch (err) {
    errorCarga.value = extractApiErrorMessage(err, 'No se pudo cargar el perfil.')
  } finally {
    cargando.value = false
  }
}

async function guardarDatos() {
  msgDatos.value = errDatos.value = ''
  if (!datos.nombreCompleto.trim()) return (errDatos.value = 'El nombre no puede quedar vacío.')
  if (!/^\S+@\S+\.\S+$/.test(datos.email.trim())) return (errDatos.value = 'Ingrese un correo válido.')
  guardandoDatos.value = true
  try {
    await auth.actualizarPerfil({
      nombreCompleto: datos.nombreCompleto,
      email: datos.email,
      cargo: datos.cargo,
      unidadOArea: datos.unidadOArea,
      telefono: datos.telefono,
    })
    msgDatos.value = 'Datos actualizados.'
    await cargar()
  } catch (err) {
    errDatos.value = extractApiErrorMessage(err, 'No se pudieron guardar los datos.')
  } finally {
    guardandoDatos.value = false
  }
}

async function cambiarClave() {
  msgClave.value = errClave.value = ''
  if (clave.nueva.length < 8) return (errClave.value = 'La nueva contraseña debe tener al menos 8 caracteres.')
  if (clave.nueva !== clave.repetir) return (errClave.value = 'Las contraseñas nuevas no coinciden.')
  guardandoClave.value = true
  try {
    await authService.cambiarPassword({ passwordActual: clave.actual, passwordNueva: clave.nueva })
    msgClave.value = 'Contraseña actualizada.'
    clave.actual = clave.nueva = clave.repetir = ''
  } catch (err) {
    errClave.value = extractApiErrorMessage(err, 'No se pudo cambiar la contraseña.')
  } finally {
    guardandoClave.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Mi perfil</h1>
      <p class="text-sm text-ink-500 dark:text-ink-400">Tus datos de contacto, tu contraseña y tu actividad en el sistema.</p>
    </div>

    <p v-if="errorCarga" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{{ errorCarga }}</p>

    <template v-if="perfil">
      <div class="card flex flex-wrap items-center gap-4 p-5">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-seal-400 to-seal-600 text-lg font-bold text-white">{{ iniciales }}</div>
        <div class="min-w-0">
          <p class="text-lg font-semibold text-ink-900 dark:text-white">{{ perfil.nombreCompleto }}</p>
          <p class="text-sm text-ink-600 dark:text-ink-300">
            {{ ROL[perfil.rol] ?? perfil.rol }} · usuario <span class="font-mono">{{ perfil.username }}</span>
            <span v-if="perfil.fechaCreacion"> · desde {{ fechaCorta(perfil.fechaCreacion) }}</span>
          </p>
        </div>
        <div class="ml-auto flex gap-6 text-center">
          <div><p class="text-xl font-semibold">{{ perfil.actividad.comprobantesRegistrados }}</p><p class="text-xs text-ink-500">C31 registrados</p></div>
          <div><p class="text-xl font-semibold">{{ perfil.actividad.cambiosDeEstado }}</p><p class="text-xs text-ink-500">cambios de estado</p></div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form class="card space-y-4 p-5" @submit.prevent="guardarDatos">
          <h2 class="text-base font-semibold">Datos personales</h2>
          <p v-if="errDatos" class="text-sm text-red-600" role="alert">{{ errDatos }}</p>
          <p v-if="msgDatos" class="text-sm text-emerald-700 dark:text-emerald-300" role="status">{{ msgDatos }}</p>
          <BaseInput v-model="datos.nombreCompleto" label="Nombre completo" required />
          <BaseInput v-model="datos.email" type="email" label="Correo electrónico" required hint="También sirve para recuperar tu contraseña." />
          <BaseInput v-model="datos.cargo" label="Cargo" />
          <BaseInput v-model="datos.unidadOArea" label="Unidad o área" />
          <BaseInput v-model="datos.telefono" label="Teléfono" />
          <p class="text-xs text-ink-400">El rol y el nombre de usuario los administra un administrador.</p>
          <BaseButton type="submit" :loading="guardandoDatos">Guardar datos</BaseButton>
        </form>

        <form class="card space-y-4 self-start p-5" @submit.prevent="cambiarClave">
          <h2 class="text-base font-semibold">Cambiar contraseña</h2>
          <p v-if="errClave" class="text-sm text-red-600" role="alert">{{ errClave }}</p>
          <p v-if="msgClave" class="text-sm text-emerald-700 dark:text-emerald-300" role="status">{{ msgClave }}</p>
          <BaseInput v-model="clave.actual" type="password" label="Contraseña actual" required />
          <BaseInput v-model="clave.nueva" type="password" label="Nueva contraseña" required hint="Mínimo 8 caracteres." />
          <BaseInput v-model="clave.repetir" type="password" label="Repite la nueva contraseña" required />
          <BaseButton type="submit" :loading="guardandoClave">Actualizar contraseña</BaseButton>
        </form>
      </div>

      <div class="card p-5">
        <h2 class="mb-3 text-base font-semibold">Mi actividad reciente</h2>
        <p v-if="!perfil.actividad.recientes.length" class="text-sm text-ink-400">Todavía no registraste movimientos.</p>
        <ul v-else class="divide-y divide-ink-100 text-sm dark:divide-white/10">
          <li v-for="(r, i) in perfil.actividad.recientes" :key="i" class="flex flex-wrap justify-between gap-2 py-2">
            <span>Comprobante #{{ r.comprobanteId }} → <strong>{{ ESTADO_C31_LABEL[r.estadoNuevo] ?? r.estadoNuevo }}</strong><span v-if="r.referencia" class="text-ink-500"> · {{ r.referencia }}</span></span>
            <span class="text-xs text-ink-500">{{ fechaHora(r.fecha) }}</span>
          </li>
        </ul>
      </div>
    </template>
    <p v-else-if="cargando" class="text-sm text-ink-400">Cargando…</p>
  </div>
</template>
