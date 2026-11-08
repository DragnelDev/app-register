<script setup lang="ts">
import { useRoute } from 'vue-router'
import { fechaCorta } from '@/utils/estados'
import FechaInput from '@/components/shared/FechaInput.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import SeleccionRapidaModal from '@/components/shared/SeleccionRapidaModal.vue'
import {
  notasAuditoriaService,
  type NotaAuditoria,
  type NotaPrestamoResumen,
  type SeccionNota,
} from '@/services/notas-auditoria.service'
import { useAuthStore } from '@/stores/auth.store'
import { useGestionStore } from '@/stores/gestion.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import { preventivosC31, type ComprobanteC31 } from '@/types/c31.types'

defineProps<{ embedded?: boolean }>()
const auth = useAuthStore()
const gestion = useGestionStore()
const puedeEscribir = computed(() => auth.rol === 'ADMIN' || auth.rol === 'OPERADOR_ARCHIVOS')

const items = ref<NotaAuditoria[]>([])
const cargando = ref(false)
const error = ref('')
const search = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    items.value = await notasAuditoriaService.list(search.value || undefined)
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudieron cargar las notas.')
  } finally {
    cargando.value = false
  }
}
const route = useRoute()
onMounted(async () => {
  await cargar()
  // Llegó desde "Responder a Auditoría" en Préstamos por nota
  const nota = route.query.nota
  if (typeof nota === 'string' && puedeEscribir.value) {
    nueva()
    notasElegidas.value = [nota]
    buscaNota.value = nota
    await buscarNotas()
    await armarDesdeNotas()
  }
})

// ── Editor ──
const abierto = ref(false)
const guardando = ref(false)
const errorForm = ref('')
const editId = ref<number | null>(null)
const conVia = ref(true)

interface Seccion {
  titulo: string
  texto: string
  itemsTexto: string
}
const f = reactive({
  cite: '',
  fecha: new Date().toLocaleDateString('en-CA'),
  dest: { nombre: '', cargo: 'JEFE DE AUDITORIA INTERNA' },
  via: { nombre: '', cargo: 'OFICIAL MAYOR ADMINISTRATIVO FINANCIERO' },
  rem: { nombre: '', cargo: 'ENCARGADO DE ARCHIVOS' },
  referencia: '',
  introduccion:
    'Por intermedio de la presente, reciba usted un saludo cordial, deseándole éxito en las funciones que desempeña en beneficio de nuestro municipio.\n\nEl motivo de la presente es dar respuesta a su solicitud. Al respecto, remito e informo a detalle el estado de los comprobantes solicitados por su unidad:',
  cierre:
    'Sin otro particular y esperando que la información brindada sea de utilidad para los fines de control consiguientes, me despido atentamente.\n\nCon este tenor, quedo a su entera disposición.',
  secciones: [] as Seccion[],
})

const plantillaSecciones = (): Seccion[] => [
  {
    titulo: 'Entrega de comprobantes',
    texto:
      'En esta oportunidad, se hace la entrega física de los comprobantes C-31, debidamente foliados y engrampados.',
    itemsTexto: '',
  },
  {
    titulo: 'Comprobantes pendientes ajenos a la unidad',
    texto:
      'Los comprobantes restantes se encuentran en trámite o bajo custodia de otras oficinas, por lo que no es posible su entrega por mi parte.',
    itemsTexto: '',
  },
  {
    titulo: 'Comprobantes entregados anteriormente',
    texto:
      'Hago constar que estos comprobantes ya fueron entregados anteriormente, debidamente foliados, engrampados y registrados en los cuadernos de cargo de la Unidad de Archivos.',
    itemsTexto: '',
  },
]

function nueva() {
  editId.value = null
  f.cite = ''
  f.fecha = new Date().toLocaleDateString('en-CA')
  f.dest.nombre = ''
  f.via.nombre = ''
  f.rem.nombre = auth.usuario?.nombreCompleto ?? ''
  f.referencia = ''
  f.secciones = plantillaSecciones()
  notasElegidas.value = []
  avisoVinculo.value = ''
  buscaNota.value = ''
  void buscarNotas()
  conVia.value = true
  errorForm.value = ''
  abierto.value = true
}

function editar(n: NotaAuditoria) {
  editId.value = n.id
  f.cite = n.cite
  f.fecha = n.fecha.slice(0, 10)
  Object.assign(f.dest, n.destinatario)
  conVia.value = Boolean(n.via?.nombre)
  Object.assign(f.via, n.via ?? { nombre: '', cargo: '' })
  Object.assign(f.rem, n.remitente)
  f.referencia = n.referencia
  f.introduccion = n.introduccion
  f.cierre = n.cierre
  f.secciones = n.secciones.map((s) => ({
    titulo: s.titulo,
    texto: s.texto,
    itemsTexto: s.items.join(', '),
  }))
  notasElegidas.value = [...(n.notasPrestamo ?? [])]
  avisoVinculo.value = ''
  buscaNota.value = ''
  void buscarNotas()
  errorForm.value = ''
  abierto.value = true
}

function itemsDe(t: string) {
  return t
    .split(/[\n,;]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}

async function guardar() {
  if (!f.dest.nombre.trim() || !f.rem.nombre.trim() || !f.referencia.trim()) {
    errorForm.value = 'Complete destinatario, remitente y referencia.'
    return
  }
  const secciones: SeccionNota[] = f.secciones.map((s) => ({
    titulo: s.titulo,
    texto: s.texto,
    items: itemsDe(s.itemsTexto),
  }))
  const payload = {
    ...(f.cite.trim() ? { cite: f.cite.trim() } : {}),
    fecha: f.fecha,
    destinatario: { ...f.dest },
    via: conVia.value && f.via.nombre.trim() ? { ...f.via } : null,
    remitente: { ...f.rem },
    referencia: f.referencia,
    introduccion: f.introduccion,
    cierre: f.cierre,
    secciones,
    notasPrestamo: notasElegidas.value,
    gestion: gestion.seleccionada || undefined,
  }
  guardando.value = true
  errorForm.value = ''
  try {
    const n = editId.value
      ? await notasAuditoriaService.update(editId.value, payload)
      : await notasAuditoriaService.create(payload)
    abierto.value = false
    await cargar()
    await notasAuditoriaService.abrirPdf(n.id)
  } catch (e) {
    errorForm.value = extractApiErrorMessage(e, 'No se pudo guardar la nota.')
  } finally {
    guardando.value = false
  }
}

async function eliminar(n: NotaAuditoria) {
  if (!confirm(`¿Eliminar la nota ${n.cite}?`)) return
  try {
    await notasAuditoriaService.remove(n.id)
    await cargar()
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudo eliminar.')
  }
}

// ── Vínculo con préstamos por nota ──
const notasDisponibles = ref<NotaPrestamoResumen[]>([])
const notasElegidas = ref<string[]>([])
const buscaNota = ref('')
const armando = ref(false)
const avisoVinculo = ref('')

async function buscarNotas() {
  try {
    notasDisponibles.value = await notasAuditoriaService.notasPrestamo(buscaNota.value || undefined)
  } catch (e) {
    avisoVinculo.value = extractApiErrorMessage(e, 'No se pudieron cargar las notas de préstamo.')
  }
}

async function armarDesdeNotas() {
  if (!notasElegidas.value.length) return
  armando.value = true
  avisoVinculo.value = ''
  try {
    const r = await notasAuditoriaService.desdePrestamos(notasElegidas.value)
    if (!r) return
    if (!f.dest.nombre.trim()) f.dest.nombre = r.destinatario
    f.referencia = r.referencia
    f.secciones = r.secciones.map((s) => ({
      titulo: s.titulo,
      texto: s.texto,
      itemsTexto: s.items.join(', '),
    }))
    avisoVinculo.value = `Se armaron ${r.secciones.length} sección(es) según el estado actual de los comprobantes. Puede editarlas.`
  } catch (e) {
    avisoVinculo.value = extractApiErrorMessage(e, 'No se pudo armar desde las notas.')
  } finally {
    armando.value = false
  }
}

// ── Insertar comprobantes desde la matriz ──
const matriz = ref(false)
const seccionDestino = ref(0)
function abrirMatriz(i: number) {
  seccionDestino.value = i
  matriz.value = true
}
function insertar(lote: ComprobanteC31[]) {
  const s = f.secciones[seccionDestino.value]
  if (!s) return
  const nuevos = lote
    .map((c) => preventivosC31(c).join('-'))
    .filter(Boolean)
    .sort((a, b) => parseInt(a) - parseInt(b))
  s.itemsTexto = [...itemsDe(s.itemsTexto), ...nuevos].join(', ')
}

const campo =
  'w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 v-if="!embedded" class="text-xl font-semibold text-ink-900 dark:text-ink-50">
          Notas a Auditoría Interna
        </h1>
        <p class="text-sm text-ink-500">
          Respuestas formales con cuadros de comprobantes. Todo el texto es editable.
        </p>
      </div>
      <div class="flex gap-2">
        <input
          v-model="search"
          type="search"
          placeholder="Buscar CITE o referencia…"
          :class="[campo, 'w-60']"
          @keydown.enter="cargar"
        />
        <BaseButton v-if="puedeEscribir" @click="nueva">Nueva nota</BaseButton>
      </div>
    </div>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <div class="overflow-x-auto rounded-lg border border-ink-100 dark:border-white/10">
      <table class="w-full text-sm">
        <thead class="bg-ink-50 text-left text-xs uppercase text-ink-500 dark:bg-ink-950">
          <tr>
            <th class="px-3 py-2">CITE</th>
            <th class="px-3 py-2">Fecha</th>
            <th class="px-3 py-2">Referencia</th>
            <th class="px-3 py-2">Notas de préstamo</th>
            <th class="px-3 py-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100 dark:divide-white/10">
          <tr v-if="cargando">
            <td colspan="5" class="px-3 py-5 text-center text-ink-400">Cargando…</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="5" class="px-3 py-5 text-center text-ink-400">Sin notas registradas.</td>
          </tr>
          <tr v-for="n in items" :key="n.id">
            <td class="px-3 py-2 font-mono text-xs">{{ n.cite }}</td>
            <td class="px-3 py-2">{{ fechaCorta(n.fecha) }}</td>
            <td class="px-3 py-2">{{ n.referencia }}</td>
            <td class="px-3 py-2 text-xs">{{ (n.notasPrestamo ?? []).join(', ') || '—' }}</td>
            <td class="space-x-2 px-3 py-2 text-right">
              <button
                class="text-seal-600 hover:underline"
                @click="notasAuditoriaService.abrirPdf(n.id)"
              >
                PDF
              </button>
              <button v-if="puedeEscribir" class="text-seal-600 hover:underline" @click="editar(n)">
                Editar
              </button>
              <button
                v-if="puedeEscribir"
                class="text-red-600 hover:underline"
                @click="eliminar(n)"
              >
                Eliminar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal
      v-model="abierto"
      :title="editId ? 'Editar nota' : 'Nueva nota a Auditoría'"
      size="lg"
    >
      <div class="space-y-3 text-sm">
        <div class="grid gap-3 sm:grid-cols-2">
          <label
            >CITE (vacío = automático)<input
              v-model="f.cite"
              :class="campo"
              placeholder="GAMSL/ARCH/AUD/OF-N° 004/2026"
          /></label>
          <label>Fecha<FechaInput v-model="f.fecha" /></label>
          <label>A (nombre)<input v-model="f.dest.nombre" :class="campo" /></label>
          <label>Cargo<input v-model="f.dest.cargo" :class="campo" /></label>
          <label class="sm:col-span-2 flex items-center gap-2"
            ><input v-model="conVia" type="checkbox" /> Incluir VÍA</label
          >
          <template v-if="conVia">
            <label>VÍA (nombre)<input v-model="f.via.nombre" :class="campo" /></label>
            <label>Cargo<input v-model="f.via.cargo" :class="campo" /></label>
          </template>
          <label>DE (nombre)<input v-model="f.rem.nombre" :class="campo" /></label>
          <label>Cargo<input v-model="f.rem.cargo" :class="campo" /></label>
        </div>
        <div class="space-y-2 rounded-md border border-ink-100 p-3 dark:border-white/10">
          <p class="font-medium">Vincular con préstamos por nota</p>
          <div class="flex gap-2">
            <input
              v-model="buscaNota"
              :class="campo"
              placeholder="Buscar N° de nota, institución o responsable…"
              @keydown.enter.prevent="buscarNotas"
            />
            <BaseButton variant="secondary" size="sm" @click="buscarNotas">Buscar</BaseButton>
          </div>
          <div class="max-h-36 space-y-1 overflow-auto">
            <label
              v-for="n in notasDisponibles"
              :key="n.numero"
              class="flex items-center gap-2 text-xs"
            >
              <input v-model="notasElegidas" type="checkbox" :value="n.numero" />
              <span class="font-mono">{{ n.numero }}</span>
              <span class="text-ink-500"
                >{{ fechaCorta(n.fecha) }} · {{ n.institucion || n.responsable || '—' }} ·
                {{ n.total }} comprobante(s)</span
              >
            </label>
            <p v-if="!notasDisponibles.length" class="text-xs text-ink-400">
              Sin notas de préstamo registradas.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <BaseButton
              size="sm"
              :loading="armando"
              :disabled="!notasElegidas.length"
              @click="armarDesdeNotas"
            >
              Armar secciones según estado
            </BaseButton>
            <span class="text-xs text-ink-500"
              >Entrega = prestados · Pendientes = aún sin archivar · Anteriores = ya devueltos</span
            >
          </div>
          <p v-if="avisoVinculo" class="text-xs text-amber-600">{{ avisoVinculo }}</p>
        </div>
        <label class="block"
          >REF.<textarea
            v-model="f.referencia"
            rows="2"
            :class="campo"
            placeholder="RESPUESTA A LA SOLICITUD DE DOCUMENTACIÓN (NOTA INTERNA … CITE Nº …)"
          />
        </label>
        <label class="block"
          >Introducción<textarea v-model="f.introduccion" rows="5" :class="campo" />
        </label>

        <div
          v-for="(s, i) in f.secciones"
          :key="i"
          class="space-y-2 rounded-md border border-ink-100 p-3 dark:border-white/10"
        >
          <div class="flex gap-2">
            <input v-model="s.titulo" :class="campo" placeholder="Título de la sección" />
            <button
              type="button"
              class="text-red-600"
              title="Quitar sección"
              @click="f.secciones.splice(i, 1)"
            >
              ✕
            </button>
          </div>
          <textarea v-model="s.texto" rows="2" :class="campo" placeholder="Texto de la sección" />
          <textarea
            v-model="s.itemsTexto"
            rows="2"
            :class="campo"
            placeholder="N° de preventivo separados por coma: 1, 156, 501-720, 673-672"
          />
          <div class="flex items-center gap-3 text-xs text-ink-500">
            <button type="button" class="text-seal-600 hover:underline" @click="abrirMatriz(i)">
              Insertar desde selección rápida
            </button>
            <span>{{ itemsDe(s.itemsTexto).length }} comprobante(s)</span>
          </div>
        </div>
        <button
          type="button"
          class="text-seal-600 hover:underline"
          @click="f.secciones.push({ titulo: '', texto: '', itemsTexto: '' })"
        >
          + Agregar sección
        </button>

        <label class="block">Cierre<textarea v-model="f.cierre" rows="3" :class="campo" /></label>
        <p v-if="errorForm" class="text-red-600">{{ errorForm }}</p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="abierto = false">Cancelar</BaseButton>
        <BaseButton :loading="guardando" @click="guardar">Guardar y ver PDF</BaseButton>
      </template>
    </BaseModal>
    <SeleccionRapidaModal v-model="matriz" todos @confirm="insertar" />
  </div>
</template>
