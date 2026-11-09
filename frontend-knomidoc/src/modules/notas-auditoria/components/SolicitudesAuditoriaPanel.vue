<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import FechaInput from '@/components/shared/FechaInput.vue'
import SeleccionRapidaModal from '@/components/shared/SeleccionRapidaModal.vue'
import { notasAuditoriaService, type Clasificacion, type SolicitudAuditoria } from '@/services/notas-auditoria.service'
import { useAuthStore } from '@/stores/auth.store'
import { useGestionStore } from '@/stores/gestion.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import { fechaCorta } from '@/utils/estados'
import { preventivosC31, type ComprobanteC31 } from '@/types/c31.types'

/**
 * Auditoría Interna no tiene usuario en el sistema: Archivo registra aquí la nota que
 * recibe (CITE + comprobantes pedidos) y desde aquí se arma la respuesta.
 */
const emit = defineEmits<{ responder: [id: number] }>()
const auth = useAuthStore()
const gestion = useGestionStore()
const puedeEscribir = computed(() => ['ADMIN', 'OPERADOR_ARCHIVOS', 'ENCARGADO_PRESTAMOS'].includes(String(auth.rol)))
const esAdmin = computed(() => auth.rol === 'ADMIN')

const items = ref<SolicitudAuditoria[]>([])
const filtro = ref('')
const cargando = ref(false)
const error = ref('')
const aviso = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    items.value = await notasAuditoriaService.solicitudes(filtro.value || undefined)
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudieron cargar las solicitudes.')
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)

const abierto = ref(false)
const editId = ref<number | null>(null)
const guardando = ref(false)
const errorForm = ref('')
const matriz = ref(false)
const f = reactive({
  cite: '', fecha: new Date().toLocaleDateString('en-CA'), solicitante: '', cargoSolicitante: 'JEFE DE AUDITORIA INTERNA',
  asunto: '', texto: '', observaciones: '',
})
const vista = ref<Clasificacion | null>(null)
const calculando = ref(false)

function nueva() {
  editId.value = null
  Object.assign(f, { cite: '', fecha: new Date().toLocaleDateString('en-CA'), solicitante: '', cargoSolicitante: 'JEFE DE AUDITORIA INTERNA', asunto: '', texto: '', observaciones: '' })
  vista.value = null
  errorForm.value = ''
  abierto.value = true
}
function editar(s: SolicitudAuditoria) {
  editId.value = s.id
  Object.assign(f, { cite: s.cite, fecha: s.fecha.slice(0, 10), solicitante: s.solicitante, cargoSolicitante: s.cargoSolicitante ?? '', asunto: s.asunto, texto: s.texto, observaciones: s.observaciones ?? '' })
  vista.value = null
  errorForm.value = ''
  abierto.value = true
}
function agregar(lote: ComprobanteC31[]) {
  const nums = lote.flatMap((c) => {
    const p = preventivosC31(c)
    return p.length ? p : (c.devengados ?? []).map((d) => `DEV ${d.numeroDevengado}`)
  })
  f.texto = [f.texto.trim(), ...nums].filter(Boolean).join(', ')
  vista.value = null
}
async function previsualizar() {
  if (!f.texto.trim()) return
  calculando.value = true
  errorForm.value = ''
  try {
    vista.value = await notasAuditoriaService.clasificar({ texto: f.texto, gestion: gestion.seleccionada || undefined })
  } catch (e) {
    errorForm.value = extractApiErrorMessage(e, 'No se pudo clasificar.')
  } finally {
    calculando.value = false
  }
}
const cuenta = (b: string) => vista.value?.items.filter((i) => i.bucket === b).length ?? 0

async function guardar() {
  if (!f.cite.trim() || !f.solicitante.trim() || !f.texto.trim()) {
    errorForm.value = 'Complete el CITE recibido, quién solicita y los comprobantes pedidos.'
    return
  }
  const payload = {
    cite: f.cite.trim(), fecha: f.fecha, solicitante: f.solicitante.trim(), cargoSolicitante: f.cargoSolicitante.trim() || undefined,
    asunto: f.asunto.trim(), texto: f.texto.trim(), observaciones: f.observaciones.trim() || undefined,
    gestion: gestion.seleccionada || undefined,
  }
  guardando.value = true
  errorForm.value = ''
  try {
    if (editId.value) await notasAuditoriaService.actualizarSolicitud(editId.value, payload)
    else await notasAuditoriaService.crearSolicitud(payload)
    abierto.value = false
    await cargar()
  } catch (e) {
    errorForm.value = extractApiErrorMessage(e, 'No se pudo guardar la solicitud.')
  } finally {
    guardando.value = false
  }
}
async function eliminar(s: SolicitudAuditoria) {
  if (!confirm(`¿Eliminar la solicitud ${s.cite}?`)) return
  try {
    await notasAuditoriaService.eliminarSolicitud(s.id)
    await cargar()
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudo eliminar.')
  }
}
async function ejemplo() {
  aviso.value = ''
  try {
    const r = await notasAuditoriaService.solicitudesEjemplo(gestion.seleccionada || undefined)
    aviso.value = `Se crearon ${r.length} solicitud(es) de ejemplo con comprobantes reales de la gestión.`
    await cargar()
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudieron crear los ejemplos.')
  }
}
const resumenTexto = (t: string) => (t.length > 70 ? `${t.slice(0, 70)}…` : t)
const campo =
  'w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="max-w-2xl text-sm text-ink-500">
        Auditoría Interna no usa el sistema: aquí se registra la nota que llega (CITE y comprobantes pedidos). Luego se
        responde con la clasificación por estado.
      </p>
      <div class="flex flex-wrap gap-2">
        <select v-model="filtro" :class="[campo, 'w-40']" @change="cargar">
          <option value="">Todas</option><option value="PENDIENTE">Pendientes</option><option value="RESPONDIDA">Respondidas</option>
        </select>
        <BaseButton v-if="esAdmin" variant="secondary" @click="ejemplo">Cargar datos de ejemplo</BaseButton>
        <BaseButton v-if="puedeEscribir" @click="nueva">+ Registrar solicitud</BaseButton>
      </div>
    </div>
    <p v-if="aviso" class="text-sm text-emerald-700">{{ aviso }}</p>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div class="overflow-x-auto rounded-lg border border-ink-100 dark:border-white/10">
      <table class="w-full text-sm">
        <thead class="bg-ink-50 text-left text-xs uppercase text-ink-500 dark:bg-ink-950">
          <tr><th class="px-3 py-2">CITE recibido</th><th class="px-3 py-2">Fecha</th><th class="px-3 py-2">Solicita</th><th class="px-3 py-2">Comprobantes pedidos</th><th class="px-3 py-2">Estado</th><th class="px-3 py-2 text-right">Acciones</th></tr>
        </thead>
        <tbody class="divide-y divide-ink-100 dark:divide-white/10">
          <tr v-if="cargando"><td colspan="6" class="px-3 py-5 text-center text-ink-400">Cargando…</td></tr>
          <tr v-else-if="!items.length"><td colspan="6" class="px-3 py-5 text-center text-ink-400">Sin solicitudes. Registre una o cargue los datos de ejemplo.</td></tr>
          <tr v-for="s in items" :key="s.id">
            <td class="whitespace-nowrap px-3 py-2 font-mono text-xs font-semibold">{{ s.cite }}<span v-if="s.ejemplo" class="ml-1 rounded bg-ink-100 px-1 text-[10px] font-normal dark:bg-white/10">ejemplo</span></td>
            <td class="whitespace-nowrap px-3 py-2">{{ fechaCorta(s.fecha) }}</td>
            <td class="px-3 py-2">{{ s.solicitante }}<span class="block text-xs text-ink-400">{{ s.asunto }}</span></td>
            <td class="px-3 py-2 font-mono text-xs" :title="s.texto">{{ resumenTexto(s.texto) }}</td>
            <td class="px-3 py-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="s.estado === 'RESPONDIDA' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'">
                {{ s.estado === 'RESPONDIDA' ? 'Respondida' : 'Pendiente' }}
              </span>
            </td>
            <td class="space-x-2 whitespace-nowrap px-3 py-2 text-right">
              <button v-if="puedeEscribir && s.estado === 'PENDIENTE'" class="font-medium text-emerald-700 hover:underline" @click="emit('responder', s.id)">Responder</button>
              <button v-if="puedeEscribir && s.estado === 'PENDIENTE'" class="text-seal-600 hover:underline" @click="editar(s)">Editar</button>
              <button v-if="puedeEscribir && s.estado === 'PENDIENTE'" class="text-red-600 hover:underline" @click="eliminar(s)">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal v-model="abierto" :title="editId ? 'Editar solicitud' : 'Registrar solicitud de Auditoría'" size="lg">
      <div class="space-y-3 text-sm">
        <div class="grid gap-3 sm:grid-cols-2">
          <label>CITE de la nota recibida<input v-model="f.cite" :class="campo" placeholder="GAMSL/AUD/OF-N° 025/2026" /></label>
          <label>Fecha de recepción<FechaInput v-model="f.fecha" /></label>
          <label>Solicita (nombre)<input v-model="f.solicitante" :class="campo" /></label>
          <label>Cargo<input v-model="f.cargoSolicitante" :class="campo" /></label>
          <label class="sm:col-span-2">Asunto<input v-model="f.asunto" :class="campo" placeholder="Solicitud de comprobantes C-31 de la gestión…" /></label>
        </div>
        <div class="space-y-2">
          <label class="block">Comprobantes que pide Auditoría
            <textarea v-model="f.texto" rows="3" :class="campo" placeholder="1-120, 130, 145-150, DEV 45" @input="vista = null" />
          </label>
          <div class="flex flex-wrap items-center gap-2">
            <BaseButton size="sm" variant="secondary" @click="matriz = true">Selección rápida</BaseButton>
            <BaseButton size="sm" variant="secondary" :loading="calculando" :disabled="!f.texto.trim()" @click="previsualizar">Ver cómo está cada uno</BaseButton>
          </div>
          <p v-if="vista" class="rounded-md bg-ink-50 px-3 py-2 text-xs dark:bg-white/5">
            {{ vista.total }} comprobante(s): <b>{{ cuenta('entrega') }}</b> para entregar · <b>{{ cuenta('pendientes') }}</b> pendientes
            · <b>{{ cuenta('anteriores') }}</b> entregados antes<span v-if="vista.noRegistrados.length"> · {{ vista.noRegistrados.length }} no registrados</span>
          </p>
        </div>
        <label class="block">Observaciones<textarea v-model="f.observaciones" rows="2" :class="campo" /></label>
        <p v-if="errorForm" class="text-red-600">{{ errorForm }}</p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="abierto = false">Cancelar</BaseButton>
        <BaseButton :loading="guardando" @click="guardar">Guardar</BaseButton>
      </template>
    </BaseModal>
    <SeleccionRapidaModal v-model="matriz" todos @confirm="agregar" />
  </div>
</template>
