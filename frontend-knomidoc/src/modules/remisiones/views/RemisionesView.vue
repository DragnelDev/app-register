<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useAuthStore } from '@/stores/auth.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import { bs, fechaCorta } from '@/utils/estados'
import {
  remisionesService,
  type CandidatoRemision,
  type Remision,
} from '@/services/remisiones.service'

const auth = useAuthStore()
const esArchivo = computed(() => auth.rol === 'ADMIN' || auth.rol === 'OPERADOR_ARCHIVOS')
const esRemitente = computed(() => auth.rol === 'REMITENTE_C31')

const items = ref<Remision[]>([])
const loading = ref(false)
const error = ref('')
const estado = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 10
const paginas = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const ETIQUETAS: Record<string, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  RECIBIDA: 'Recibida',
  OBSERVADA: 'Con observaciones',
}
const COLORES: Record<string, string> = {
  BORRADOR: 'bg-ink-100 text-ink-700 dark:bg-white/10 dark:text-ink-200',
  ENVIADA: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  RECIBIDA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  OBSERVADA: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
}

async function cargar() {
  loading.value = true
  try {
    error.value = ''
    const r = await remisionesService.list({ page: page.value, pageSize, estado: estado.value || undefined })
    items.value = r.data
    total.value = r.total
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudieron cargar las remisiones.')
  } finally {
    loading.value = false
  }
}

// ── nueva remisión ──
const nuevaAbierta = ref(false)
const busqueda = ref('')
const candidatos = ref<CandidatoRemision[]>([])
const elegidos = ref<CandidatoRemision[]>([])
const form = reactive({ unidadRemitente: '', observacion: '' })
const guardando = ref(false)
const errorNueva = ref('')

async function abrirNueva() {
  elegidos.value = []
  busqueda.value = ''
  form.unidadRemitente = ''
  form.observacion = ''
  errorNueva.value = ''
  nuevaAbierta.value = true
  await buscar()
}
async function buscar() {
  try {
    candidatos.value = await remisionesService.candidatos(busqueda.value.trim() || undefined)
  } catch (e) {
    errorNueva.value = extractApiErrorMessage(e, 'No se pudo buscar comprobantes.')
  }
}
const disponibles = computed(() =>
  candidatos.value.filter((c) => !elegidos.value.some((e) => e.id === c.id)),
)
async function guardarRemision(enviar: boolean) {
  if (!elegidos.value.length) {
    errorNueva.value = 'Agregue al menos un comprobante'
    return
  }
  guardando.value = true
  try {
    await remisionesService.crear({
      comprobanteIds: elegidos.value.map((c) => c.id),
      unidadRemitente: form.unidadRemitente.trim() || undefined,
      observacion: form.observacion.trim() || undefined,
      enviar,
    })
    nuevaAbierta.value = false
    await cargar()
  } catch (e) {
    errorNueva.value = extractApiErrorMessage(e, 'No se pudo guardar la remisión.')
  } finally {
    guardando.value = false
  }
}

async function enviar(r: Remision) {
  try {
    await remisionesService.enviar(r.id)
    await cargar()
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudo enviar.')
  }
}
async function eliminar(r: Remision) {
  if (!confirm(`¿Eliminar el borrador ${r.numeroRemision}?`)) return
  try {
    await remisionesService.eliminar(r.id)
    await cargar()
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudo eliminar.')
  }
}

// ── recepción (Archivo) ──
const recibiendo = ref<Remision | null>(null)
const revision = ref<Record<number, { recibido: boolean; observacion: string }>>({})
const obsRecepcion = ref('')
const errorRecepcion = ref('')
const recepcionAbierta = computed({
  get: () => recibiendo.value !== null,
  set: (v) => {
    if (!v) recibiendo.value = null
  },
})
function abrirRecepcion(r: Remision) {
  recibiendo.value = r
  errorRecepcion.value = ''
  obsRecepcion.value = ''
  revision.value = Object.fromEntries(
    r.items.map((i) => [i.comprobanteId, { recibido: true, observacion: '' }]),
  )
}
function estadoRevision(comprobanteId: number) {
  return (
    revision.value[comprobanteId] ??
    (revision.value[comprobanteId] = { recibido: true, observacion: '' })
  )
}
async function confirmarRecepcion() {
  if (!recibiendo.value) return
  errorRecepcion.value = ''
  try {
    await remisionesService.recibir(recibiendo.value.id, {
      observacion: obsRecepcion.value.trim() || undefined,
      items: recibiendo.value.items.map((i) => ({
        comprobanteId: i.comprobanteId,
        recibido: estadoRevision(i.comprobanteId).recibido,
        observacion: estadoRevision(i.comprobanteId).observacion.trim() || undefined,
      })),
    })
    recibiendo.value = null
    await cargar()
  } catch (e) {
    errorRecepcion.value = extractApiErrorMessage(e, 'No se pudo confirmar la recepción.')
  }
}

const campo =
  'w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'
onMounted(cargar)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Remisiones de C31</h1>
        <p class="text-sm text-ink-500 dark:text-ink-400">
          <template v-if="esRemitente">Remita sus comprobantes al Archivo. Archivo confirma la recepción.</template>
          <template v-else>Comprobantes enviados al Archivo por las áreas remitentes.</template>
        </p>
      </div>
      <BaseButton v-if="esRemitente" @click="abrirNueva">+ Nueva remisión</BaseButton>
    </div>

    <div class="card flex items-end gap-3 p-4">
      <div>
        <label class="mb-1 block text-xs font-medium text-ink-500" for="r-e">Estado</label>
        <select id="r-e" v-model="estado" :class="campo" @change="() => { page = 1; cargar() }">
          <option value="">Todos</option>
          <option v-for="(l, k) in ETIQUETAS" :key="k" :value="k" v-show="esRemitente || k !== 'BORRADOR'">{{ l }}</option>
        </select>
      </div>
    </div>

    <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{{ error }}</p>
    <p v-if="loading" class="text-sm text-ink-500">Cargando…</p>
    <p v-else-if="!items.length" class="card p-6 text-center text-sm text-ink-500">No hay remisiones.</p>

    <div v-for="r in items" :key="r.id" class="card space-y-3 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p class="font-semibold">{{ r.numeroRemision }}
            <span class="ml-2 rounded-full px-2 py-0.5 text-xs font-medium" :class="COLORES[r.estado]">{{ ETIQUETAS[r.estado] }}</span>
          </p>
          <p class="text-xs text-ink-500 dark:text-ink-400">
            {{ r.remitente }}<template v-if="r.unidadRemitente"> · {{ r.unidadRemitente }}</template>
            <template v-if="r.fechaEnvio"> · enviada {{ fechaCorta(r.fechaEnvio) }}</template>
            <template v-if="r.fechaRecepcion"> · revisada {{ fechaCorta(r.fechaRecepcion) }} por {{ r.receptor }}</template>
          </p>
        </div>
        <div class="flex gap-2">
          <template v-if="esRemitente && r.estado === 'BORRADOR'">
            <BaseButton size="sm" @click="enviar(r)">Enviar</BaseButton>
            <BaseButton size="sm" variant="secondary" @click="eliminar(r)">Eliminar</BaseButton>
          </template>
          <BaseButton v-if="esArchivo && r.estado === 'ENVIADA'" size="sm" @click="abrirRecepcion(r)">Recibir</BaseButton>
        </div>
      </div>
      <p v-if="r.observacion" class="text-sm text-ink-600 dark:text-ink-300">{{ r.observacion }}</p>
      <ul class="divide-y divide-ink-100 text-sm dark:divide-white/10">
        <li v-for="i in r.items" :key="i.comprobanteId" class="flex flex-wrap items-start justify-between gap-2 py-1.5">
          <div class="min-w-0 flex-1">
            <span class="font-medium">{{ i.identificador }}</span>
            <span class="text-ink-500"> · {{ bs(i.montoTotal) }}</span>
            <p class="line-clamp-2 break-words text-xs text-ink-500 dark:text-ink-400">{{ i.descripcion }}</p>
          </div>
          <span v-if="i.recibido === true" class="text-xs text-emerald-600 dark:text-emerald-400">Recibido</span>
          <span v-else-if="i.recibido === false" class="text-xs text-red-600 dark:text-red-400">Observado: {{ i.observacion }}</span>
        </li>
      </ul>
      <p v-if="r.observacionRecepcion" class="text-xs text-ink-500 dark:text-ink-400">Archivo: {{ r.observacionRecepcion }}</p>
    </div>

    <div v-if="paginas > 1" class="flex justify-center gap-2">
      <BaseButton size="sm" variant="secondary" :disabled="page <= 1" @click="() => { page--; cargar() }">Anterior</BaseButton>
      <span class="self-center text-sm">{{ page }} / {{ paginas }}</span>
      <BaseButton size="sm" variant="secondary" :disabled="page >= paginas" @click="() => { page++; cargar() }">Siguiente</BaseButton>
    </div>

    <BaseModal v-model="nuevaAbierta" title="Nueva remisión">
      <div class="space-y-4 text-sm">
        <p v-if="errorNueva" class="rounded-md bg-red-50 px-3 py-2 text-red-700 dark:bg-red-950/40 dark:text-red-300">{{ errorNueva }}</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <input v-model="form.unidadRemitente" :class="campo" placeholder="Unidad / área remitente" maxlength="150" />
          <input v-model="form.observacion" :class="campo" placeholder="Observación (opcional)" maxlength="1000" />
        </div>
        <div>
          <p class="mb-1 font-semibold">Comprobantes a remitir ({{ elegidos.length }})</p>
          <ul v-if="elegidos.length" class="mb-2 space-y-1">
            <li v-for="c in elegidos" :key="c.id" class="flex items-center justify-between rounded border border-ink-100 px-2 py-1 dark:border-white/10">
              <span>{{ c.identificador }} · {{ bs(c.montoTotal) }}</span>
              <button type="button" class="text-xs text-red-600 hover:underline" @click="elegidos = elegidos.filter((x) => x.id !== c.id)">Quitar</button>
            </li>
          </ul>
          <input v-model="busqueda" :class="campo" placeholder="Buscar por N° de preventivo, devengado o glosa…" @input="buscar" />
          <ul class="mt-2 max-h-48 divide-y divide-ink-100 overflow-auto rounded border border-ink-100 dark:divide-white/10 dark:border-white/10">
            <li v-for="c in disponibles" :key="c.id">
              <button type="button" class="flex w-full flex-col px-2 py-1.5 text-left hover:bg-ink-50 dark:hover:bg-white/10" @click="elegidos.push(c)">
                <span class="font-medium">{{ c.identificador }} <span class="font-normal text-ink-500">· {{ bs(c.montoTotal) }}</span></span>
                <span class="line-clamp-1 text-xs text-ink-500">{{ c.descripcion }}</span>
              </button>
            </li>
            <li v-if="!disponibles.length" class="px-2 py-2 text-xs text-ink-500">No hay comprobantes en trámite disponibles.</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="nuevaAbierta = false">Cancelar</BaseButton>
        <BaseButton variant="secondary" :loading="guardando" @click="guardarRemision(false)">Guardar borrador</BaseButton>
        <BaseButton :loading="guardando" @click="guardarRemision(true)">Enviar a Archivo</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-model="recepcionAbierta" :title="`Recibir ${recibiendo?.numeroRemision ?? ''}`">
      <div v-if="recibiendo" class="space-y-3 text-sm">
        <p v-if="errorRecepcion" class="rounded-md bg-red-50 px-3 py-2 text-red-700 dark:bg-red-950/40 dark:text-red-300">{{ errorRecepcion }}</p>
        <p class="text-ink-500">Marque cada comprobante físico como recibido; si falta algo, indique el motivo.</p>
        <div v-for="i in recibiendo.items" :key="i.comprobanteId" class="rounded border border-ink-100 p-2 dark:border-white/10">
          <label class="flex items-center gap-2">
            <input v-model="estadoRevision(i.comprobanteId).recibido" type="checkbox" />
            <span class="font-medium">{{ i.identificador }}</span>
            <span class="text-ink-500">· {{ bs(i.montoTotal) }}</span>
          </label>
          <input v-if="!estadoRevision(i.comprobanteId).recibido" v-model="estadoRevision(i.comprobanteId).observacion" :class="[campo, 'mt-2']" placeholder="Motivo de la observación" maxlength="300" />
        </div>
        <input v-model="obsRecepcion" :class="campo" placeholder="Observación general (opcional)" maxlength="1000" />
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="recibiendo = null">Cancelar</BaseButton>
        <BaseButton @click="confirmarRecepcion">Confirmar recepción</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
