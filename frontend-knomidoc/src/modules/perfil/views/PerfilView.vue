<script setup lang="ts">
import { rolLabel } from '@/constants/roles'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import UserAvatar from '@/components/shared/UserAvatar.vue'
import { reducirImagen } from '@/utils/imagen'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import {
  emailValido,
  maxLength,
  nombrePersona,
  passwordFuerte,
  required,
  runValidators,
  telefonoValido,
} from '@/utils/validators'
import { ESTADO_C31_LABEL, fechaCorta, fechaHora } from '@/utils/estados'
import type { Perfil } from '@/types/auth.types'

const auth = useAuthStore()
const router = useRouter()
const perfil = ref<Perfil | null>(null)
const cargando = ref(true)
const errorCarga = ref('')

const ROL = new Proxy({} as Record<string, string>, { get: (_t, k) => rolLabel(String(k)) })

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
  const err =
    runValidators(datos.nombreCompleto, [
      required('El nombre no puede quedar vacío.'),
      nombrePersona(),
      maxLength(150),
    ]) ??
    runValidators(datos.email, [
      required('El correo es obligatorio.'),
      emailValido(),
      maxLength(100),
    ]) ??
    runValidators(datos.cargo, [maxLength(100)]) ??
    runValidators(datos.unidadOArea, [maxLength(150)]) ??
    runValidators(datos.telefono, [telefonoValido()])
  if (err) return (errDatos.value = err)
  guardandoDatos.value = true
  try {
    await auth.actualizarPerfil({
      nombreCompleto: datos.nombreCompleto,
      email: datos.email,
      cargo: datos.cargo,
      unidadOArea: datos.unidadOArea,
      telefono: datos.telefono,
    })
    // Un correo nuevo exige confirmarlo con un código antes de seguir usando el sistema
    if (auth.emailPendiente) {
      router.push({ name: 'verificar-email' })
      return
    }
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
  const errPass = runValidators(clave.nueva, [passwordFuerte()])
  if (errPass) return (errClave.value = errPass)
  if (clave.nueva !== clave.repetir)
    return (errClave.value = 'Las contraseñas nuevas no coinciden.')
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

// --- Foto de perfil (subir imagen o pegar una URL) ---
const fotoUrl = ref('')
const guardandoFoto = ref(false)
const msgFoto = ref('')
const errFoto = ref('')
const inputArchivo = ref<HTMLInputElement | null>(null)

async function guardarFoto(valor: string, mensaje: string) {
  msgFoto.value = errFoto.value = ''
  guardandoFoto.value = true
  try {
    await auth.actualizarPerfil({ foto: valor })
    if (perfil.value) perfil.value.foto = valor || null
    msgFoto.value = mensaje
    fotoUrl.value = ''
  } catch (err) {
    errFoto.value = extractApiErrorMessage(err, 'No se pudo guardar la foto.')
  } finally {
    guardandoFoto.value = false
  }
}
async function alElegirArchivo(e: Event) {
  const input = e.target as HTMLInputElement
  const archivo = input.files?.[0]
  input.value = ''
  if (!archivo) return
  try {
    await guardarFoto(await reducirImagen(archivo), 'Foto actualizada.')
  } catch (err) {
    errFoto.value = (err as Error).message
  }
}
function usarUrl() {
  const u = fotoUrl.value.trim()
  if (!/^https?:\/\/\S{4,480}$/i.test(u)) {
    errFoto.value = 'Ingrese una URL válida que empiece con http:// o https://'
    return
  }
  guardarFoto(u, 'Foto actualizada.')
}

onMounted(cargar)
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Mi perfil</h1>
      <p class="text-sm text-ink-500 dark:text-ink-400">
        Tus datos de contacto, tu contraseña y tu actividad en el sistema.
      </p>
    </div>

    <p
      v-if="errorCarga"
      class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ errorCarga }}
    </p>

    <template v-if="perfil">
      <div class="card flex flex-wrap items-center gap-4 p-5">
        <UserAvatar :nombre="perfil.nombreCompleto" :foto="perfil.foto" :size="64" />
        <div class="min-w-0">
          <p class="text-lg font-semibold text-ink-900 dark:text-white">
            {{ perfil.nombreCompleto }}
          </p>
          <p class="text-sm text-ink-600 dark:text-ink-300">
            {{ ROL[perfil.rol] ?? perfil.rol }} · usuario
            <span class="font-mono">{{ perfil.username }}</span>
            <span v-if="perfil.fechaCreacion"> · desde {{ fechaCorta(perfil.fechaCreacion) }}</span>
          </p>
        </div>
        <div class="ml-auto flex gap-6 text-center">
          <div>
            <p class="text-xl font-semibold">{{ perfil.actividad.comprobantesRegistrados }}</p>
            <p class="text-xs text-ink-500">C31 registrados</p>
          </div>
          <div>
            <p class="text-xl font-semibold">{{ perfil.actividad.cambiosDeEstado }}</p>
            <p class="text-xs text-ink-500">cambios de estado</p>
          </div>
        </div>
      </div>

      <div class="card space-y-3 p-5">
        <h2 class="text-base font-semibold">Foto de perfil</h2>
        <p v-if="errFoto" class="text-sm text-red-600" role="alert">{{ errFoto }}</p>
        <p v-if="msgFoto" class="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {{ msgFoto }}
        </p>
        <div class="flex flex-wrap items-end gap-3">
          <input
            ref="inputArchivo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="hidden"
            @change="alElegirArchivo"
          />
          <BaseButton
            type="button"
            variant="secondary"
            :loading="guardandoFoto"
            @click="inputArchivo?.click()"
          >
            <i class="fa-solid fa-upload mr-1" aria-hidden="true" /> Subir imagen
          </BaseButton>
          <div class="min-w-[240px] flex-1">
            <label class="mb-1 block text-xs font-medium text-ink-500" for="foto-url"
              >o pegar una URL</label
            >
            <div class="flex gap-2">
              <input
                id="foto-url"
                v-model="fotoUrl"
                type="url"
                placeholder="https://…/mi-foto.jpg"
                class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
                @keydown.enter.prevent="usarUrl"
              />
              <BaseButton
                type="button"
                variant="secondary"
                :disabled="!fotoUrl.trim()"
                @click="usarUrl"
                >Usar</BaseButton
              >
            </div>
          </div>
          <BaseButton
            v-if="perfil.foto"
            type="button"
            variant="ghost"
            @click="guardarFoto('', 'Foto eliminada.')"
            >Quitar foto</BaseButton
          >
        </div>
        <p class="text-xs text-ink-400">
          La imagen subida se recorta en cuadrado y se reduce automáticamente.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form class="card space-y-4 p-5" @submit.prevent="guardarDatos">
          <h2 class="text-base font-semibold">Datos personales</h2>
          <p v-if="errDatos" class="text-sm text-red-600" role="alert">{{ errDatos }}</p>
          <p v-if="msgDatos" class="text-sm text-emerald-700 dark:text-emerald-300" role="status">
            {{ msgDatos }}
          </p>
          <BaseInput v-model="datos.nombreCompleto" label="Nombre completo" required />
          <BaseInput
            v-model="datos.email"
            type="email"
            label="Correo electrónico"
            required
            hint="Si lo cambias, te enviaremos un código de 6 dígitos para verificarlo."
          />
          <BaseInput v-model="datos.cargo" label="Cargo" />
          <BaseInput v-model="datos.unidadOArea" label="Unidad o área" />
          <BaseInput v-model="datos.telefono" label="Teléfono" />
          <p class="text-xs text-ink-400">
            El rol y el nombre de usuario los administra un administrador.
          </p>
          <BaseButton type="submit" :loading="guardandoDatos">Guardar datos</BaseButton>
        </form>

        <form class="card space-y-4 self-start p-5" @submit.prevent="cambiarClave">
          <h2 class="text-base font-semibold">Cambiar contraseña</h2>
          <p v-if="errClave" class="text-sm text-red-600" role="alert">{{ errClave }}</p>
          <p v-if="msgClave" class="text-sm text-emerald-700 dark:text-emerald-300" role="status">
            {{ msgClave }}
          </p>
          <BaseInput v-model="clave.actual" type="password" label="Contraseña actual" required />
          <BaseInput
            v-model="clave.nueva"
            type="password"
            label="Nueva contraseña"
            required
            hint="8 a 72 caracteres, con al menos una letra y un número."
          />
          <BaseInput
            v-model="clave.repetir"
            type="password"
            label="Repite la nueva contraseña"
            required
          />
          <BaseButton type="submit" :loading="guardandoClave">Actualizar contraseña</BaseButton>
        </form>
      </div>

      <div class="card p-5">
        <h2 class="mb-3 text-base font-semibold">Mi actividad reciente</h2>
        <p v-if="!perfil.actividad.recientes.length" class="text-sm text-ink-400">
          Todavía no registraste movimientos.
        </p>
        <ul v-else class="divide-y divide-ink-100 text-sm dark:divide-white/10">
          <li
            v-for="(r, i) in perfil.actividad.recientes"
            :key="i"
            class="flex flex-wrap justify-between gap-2 py-2"
          >
            <span
              >Comprobante #{{ r.comprobanteId }} →
              <strong>{{ ESTADO_C31_LABEL[r.estadoNuevo] ?? r.estadoNuevo }}</strong
              ><span v-if="r.referencia" class="text-ink-500"> · {{ r.referencia }}</span></span
            >
            <span class="text-xs text-ink-500">{{ fechaHora(r.fecha) }}</span>
          </li>
        </ul>
      </div>
    </template>
    <p v-else-if="cargando" class="text-sm text-ink-400">Cargando…</p>
  </div>
</template>
