<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import FechaInput from '@/components/shared/FechaInput.vue'
import { citesService, TIPOS_CITE, type Cite, type CiteFiltros } from '@/services/cites.service'
import { useAuthStore } from '@/stores/auth.store'
import { useGestionStore } from '@/stores/gestion.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import { fechaCorta } from '@/utils/estados'

/** Libro global de CITEs de la Unidad de Archivos: emitidos y recibidos, con su respaldo escaneado. */
const auth = useAuthStore()
const gestionStore = useGestionStore()
const puedeEscribir = computed(() =>
  ['ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS'].includes(String(auth.rol)),
)
const puedeAnular = computed(() => ['ADMIN', 'OPERADOR_ARCHIVOS'].includes(String(auth.rol)))

const filtros = reactive<CiteFiltros>({
  gestion: gestionStore.seleccionada || '',
  direccion: '',
  tipo: '',
  search: '',
  page: 1,
  pageSize: 25,
})
const items = ref<Cite[]>([])
const total = ref(0)
const cargando = ref(false)
const error = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const r = await citesService.list(filtros)
    items.value = r.data
    total.value = r.total
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudo cargar el registro.')
  } finally {
    cargando.value = false
  }
}
function buscar() {
  filtros.page = 1
  void cargar()
}
const paginas = computed(() => Math.max(1, Math.ceil(total.value / (filtros.pageSize ?? 25))))
function ir(p: number) {
  filtros.page = Math.min(paginas.value, Math.max(1, p))
  void cargar()
}
onMounted(cargar)

// ── Formulario ──
const abierto = ref(false)
const guardando = ref(false)
const errorForm = ref('')
const editId = ref<number | null>(null)
const f = reactive({
  direccion: 'EMITIDO' as 'EMITIDO' | 'RECIBIDO',
  tipo: 'OF',
  cite: '',
  fecha: new Date().toLocaleDateString('en-CA'),
  contraparte: '',
  cargoContraparte: '',
  asunto: '',
  referencia: '',
  observaciones: '',
})
const archivosNuevos = ref<File[]>([])

function nuevo(direccion: 'EMITIDO' | 'RECIBIDO') {
  editId.value = null
  Object.assign(f, {
    direccion,
    tipo: 'OF',
    cite: '',
    fecha: new Date().toLocaleDateString('en-CA'),
    contraparte: '',
    cargoContraparte: '',
    asunto: '',
    referencia: '',
    observaciones: '',
  })
  archivosNuevos.value = []
  errorForm.value = ''
  abierto.value = true
}
function editar(c: Cite) {
  editId.value = c.id
  Object.assign(f, {
    direccion: c.direccion,
    tipo: c.tipo,
    cite: c.cite,
    fecha: c.fecha.slice(0, 10),
    contraparte: c.contraparte,
    cargoContraparte: c.cargoContraparte ?? '',
    asunto: c.asunto,
    referencia: c.referencia ?? '',
    observaciones: c.observaciones ?? '',
  })
  archivosNuevos.value = []
  errorForm.value = ''
  abierto.value = true
}
function elegirArchivos(e: Event) {
  const input = e.target as HTMLInputElement
  archivosNuevos.value = [...archivosNuevos.value, ...Array.from(input.files ?? [])]
  input.value = ''
}

async function guardar() {
  if (!f.contraparte.trim() || !f.asunto.trim()) {
    errorForm.value =
      f.direccion === 'EMITIDO' ? 'Complete destinatario y asunto.' : 'Complete remitente y asunto.'
    return
  }
  if (f.direccion === 'RECIBIDO' && !f.cite.trim()) {
    errorForm.value = 'Escriba el CITE del documento recibido.'
    return
  }
  const payload = {
    tipo: f.tipo,
    cite: f.cite.trim() || undefined,
    fecha: f.fecha,
    contraparte: f.contraparte.trim(),
    cargoContraparte: f.cargoContraparte.trim() || undefined,
    asunto: f.asunto.trim(),
    referencia: f.referencia.trim() || undefined,
    observaciones: f.observaciones.trim() || undefined,
  }
  guardando.value = true
  errorForm.value = ''
  try {
    const c = editId.value
      ? await citesService.update(editId.value, payload)
      : await citesService.create({ ...payload, direccion: f.direccion })
    if (archivosNuevos.value.length) await citesService.subir(c.id, archivosNuevos.value)
    abierto.value = false
    await cargar()
  } catch (e) {
    errorForm.value = extractApiErrorMessage(e, 'No se pudo guardar el CITE.')
  } finally {
    guardando.value = false
  }
}

// ── Respaldo escaneado ──
const respaldo = ref<Cite | null>(null)
const errorRespaldo = ref('')
const subiendo = ref(false)
async function abrirRespaldo(c: Cite) {
  errorRespaldo.value = ''
  respaldo.value = await citesService.get(c.id)
}
async function subirRespaldo(e: Event) {
  const input = e.target as HTMLInputElement
  const archivos = Array.from(input.files ?? [])
  input.value = ''
  if (!archivos.length || !respaldo.value) return
  subiendo.value = true
  errorRespaldo.value = ''
  try {
    respaldo.value = await citesService.subir(respaldo.value.id, archivos)
    await cargar()
  } catch (err) {
    errorRespaldo.value = extractApiErrorMessage(err, 'No se pudo subir el archivo.')
  } finally {
    subiendo.value = false
  }
}
async function quitarArchivo(adjuntoId: number) {
  if (!respaldo.value || !confirm('¿Quitar este archivo del respaldo?')) return
  try {
    await citesService.eliminarArchivo(respaldo.value.id, adjuntoId)
    respaldo.value = await citesService.get(respaldo.value.id)
    await cargar()
  } catch (err) {
    errorRespaldo.value = extractApiErrorMessage(err, 'No se pudo quitar el archivo.')
  }
}
const kb = (n: number) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`

async function anular(c: Cite) {
  const motivo = prompt(`Motivo para anular el CITE ${c.cite} (mínimo 5 caracteres):`)
  if (!motivo) return
  try {
    await citesService.anular(c.id, motivo)
    await cargar()
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudo anular.')
  }
}

const campo =
  'w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Registro de CITEs</h1>
        <p class="text-sm text-ink-500">
          Libro de la unidad: documentos emitidos y recibidos, con su respaldo escaneado.
        </p>
      </div>
      <div v-if="puedeEscribir" class="flex gap-2">
        <BaseButton @click="nuevo('EMITIDO')">+ CITE emitido</BaseButton>
        <BaseButton variant="secondary" @click="nuevo('RECIBIDO')">+ CITE recibido</BaseButton>
        <BaseButton variant="secondary" @click="citesService.exportar(filtros)"
          >📊 Planilla Excel</BaseButton
        >
      </div>
    </div>

    <div class="flex flex-wrap items-end gap-2">
      <label class="text-xs text-ink-500"
        >Dirección
        <select v-model="filtros.direccion" :class="[campo, 'mt-1 w-36']" @change="buscar">
          <option value="">Todos</option>
          <option value="EMITIDO">Emitidos</option>
          <option value="RECIBIDO">Recibidos</option>
        </select>
      </label>
      <label class="text-xs text-ink-500"
        >Tipo
        <select v-model="filtros.tipo" :class="[campo, 'mt-1 w-40']" @change="buscar">
          <option value="">Todos</option>
          <option v-for="t in TIPOS_CITE" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </label>
      <label class="text-xs text-ink-500"
        >Gestión
        <input
          v-model.number="filtros.gestion"
          type="number"
          :class="[campo, 'mt-1 w-24']"
          @change="buscar"
        />
      </label>
      <input
        v-model="filtros.search"
        type="search"
        placeholder="Buscar CITE, asunto o persona…"
        :class="[campo, 'min-w-0 flex-1']"
        @keydown.enter="buscar"
      />
      <BaseButton variant="secondary" @click="buscar">Buscar</BaseButton>
    </div>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div class="overflow-x-auto rounded-lg border border-ink-100 dark:border-white/10">
      <table class="w-full text-sm">
        <thead class="bg-ink-50 text-left text-xs uppercase text-ink-500 dark:bg-ink-950">
          <tr>
            <th class="px-3 py-2">CITE</th>
            <th class="px-3 py-2">Fecha</th>
            <th class="px-3 py-2">Dirección</th>
            <th class="px-3 py-2">Persona</th>
            <th class="px-3 py-2">Asunto</th>
            <th class="px-3 py-2">Respaldo</th>
            <th class="px-3 py-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100 dark:divide-white/10">
          <tr v-if="cargando">
            <td colspan="7" class="px-3 py-5 text-center text-ink-400">Cargando…</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="7" class="px-3 py-5 text-center text-ink-400">
              Sin CITEs registrados con estos filtros.
            </td>
          </tr>
          <tr v-for="c in items" :key="c.id" :class="c.estado === 'ANULADO' ? 'opacity-50' : ''">
            <td
              class="whitespace-nowrap px-3 py-2 font-mono text-xs font-semibold"
              :class="c.estado === 'ANULADO' ? 'line-through' : ''"
            >
              {{ c.cite }}
            </td>
            <td class="whitespace-nowrap px-3 py-2">{{ fechaCorta(c.fecha) }}</td>
            <td class="px-3 py-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="
                  c.direccion === 'EMITIDO'
                    ? 'bg-seal-100 text-seal-800 dark:bg-seal-500/20 dark:text-seal-200'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
                "
              >
                {{ c.direccion === 'EMITIDO' ? 'Emitido' : 'Recibido' }}
              </span>
              <span
                v-if="c.estado === 'ANULADO'"
                class="ml-1 text-xs text-red-600"
                :title="c.motivoAnulacion ?? ''"
                >anulado</span
              >
            </td>
            <td class="px-3 py-2">
              {{ c.contraparte
              }}<span v-if="c.cargoContraparte" class="block text-xs text-ink-400">{{
                c.cargoContraparte
              }}</span>
            </td>
            <td class="max-w-xs px-3 py-2">
              <span class="line-clamp-2">{{ c.asunto }}</span
              ><span v-if="c.referencia" class="block text-xs text-ink-400"
                >Ref.: {{ c.referencia }}</span
              >
            </td>
            <td class="px-3 py-2">
              <button
                type="button"
                class="text-xs hover:underline"
                :class="c.totalAdjuntos ? 'text-emerald-700' : 'text-ink-400'"
                @click="abrirRespaldo(c)"
              >
                <i class="fa-solid fa-paperclip" aria-hidden="true" />
                {{ c.totalAdjuntos ? `${c.totalAdjuntos} archivo(s)` : 'Sin escaneado' }}
              </button>
            </td>
            <td class="space-x-2 whitespace-nowrap px-3 py-2 text-right">
              <button
                v-if="puedeEscribir && c.estado !== 'ANULADO'"
                class="text-seal-600 hover:underline"
                @click="editar(c)"
              >
                Editar
              </button>
              <button
                v-if="puedeAnular && c.estado !== 'ANULADO'"
                class="text-red-600 hover:underline"
                @click="anular(c)"
              >
                Anular
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex items-center justify-between text-sm text-ink-500">
      <span>{{ total }} CITE(s)</span>
      <div class="flex items-center gap-2">
        <BaseButton
          size="sm"
          variant="secondary"
          :disabled="(filtros.page ?? 1) <= 1"
          @click="ir((filtros.page ?? 1) - 1)"
          >Anterior</BaseButton
        >
        <span>Página {{ filtros.page }} de {{ paginas }}</span>
        <BaseButton
          size="sm"
          variant="secondary"
          :disabled="(filtros.page ?? 1) >= paginas"
          @click="ir((filtros.page ?? 1) + 1)"
          >Siguiente</BaseButton
        >
      </div>
    </div>

    <BaseModal
      v-model="abierto"
      :title="
        (editId ? 'Editar CITE ' : 'Nuevo CITE ') +
        (f.direccion === 'EMITIDO' ? 'emitido' : 'recibido')
      "
      size="lg"
    >
      <div class="space-y-3 text-sm">
        <div class="grid gap-3 sm:grid-cols-2">
          <label
            >Tipo
            <select v-model="f.tipo" :class="campo">
              <option v-for="t in TIPOS_CITE" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </label>
          <label>Fecha<FechaInput v-model="f.fecha" /></label>
          <label class="sm:col-span-2">
            {{
              f.direccion === 'EMITIDO'
                ? 'CITE (vacío = correlativo automático)'
                : 'CITE del documento recibido'
            }}
            <input
              v-model="f.cite"
              :class="campo"
              :placeholder="
                f.direccion === 'EMITIDO' ? 'GAMSL/ARCH/OF-N° 004/2026' : 'GAMSL/AUD/OF-N° 025/2026'
              "
            />
          </label>
          <label
            >{{ f.direccion === 'EMITIDO' ? 'Dirigido a' : 'Remitido por'
            }}<input v-model="f.contraparte" :class="campo"
          /></label>
          <label>Cargo<input v-model="f.cargoContraparte" :class="campo" /></label>
          <label class="sm:col-span-2"
            >Asunto / referencia<textarea v-model="f.asunto" rows="2" :class="campo" />
          </label>
          <label class="sm:col-span-2"
            >Responde a / relacionado con (CITE, opcional)<input
              v-model="f.referencia"
              :class="campo"
          /></label>
          <label class="sm:col-span-2"
            >Observaciones<textarea v-model="f.observaciones" rows="2" :class="campo" />
          </label>
        </div>
        <div>
          <p class="mb-1 font-medium">Respaldo escaneado (PDF o imagen, puede ser más de uno)</p>
          <input
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp"
            class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-800 dark:text-ink-200 dark:file:bg-white/10 dark:file:text-ink-100"
            @change="elegirArchivos"
          />
          <ul v-if="archivosNuevos.length" class="mt-1 text-xs text-ink-500">
            <li v-for="(a, i) in archivosNuevos" :key="i">
              {{ a.name }} · {{ kb(a.size) }}
              <button type="button" class="text-red-600" @click="archivosNuevos.splice(i, 1)">
                quitar
              </button>
            </li>
          </ul>
          <p class="mt-1 text-xs text-ink-400">
            También se puede subir o completar después desde la columna «Respaldo».
          </p>
        </div>
        <p v-if="errorForm" class="text-red-600">{{ errorForm }}</p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="abierto = false">Cancelar</BaseButton>
        <BaseButton :loading="guardando" @click="guardar">Guardar</BaseButton>
      </template>
    </BaseModal>

    <BaseModal
      :model-value="respaldo !== null"
      :title="`Respaldo de ${respaldo?.cite ?? ''}`"
      @update:model-value="respaldo = null"
    >
      <p v-if="errorRespaldo" class="mb-2 text-sm text-red-600">{{ errorRespaldo }}</p>
      <ul class="space-y-1 text-sm">
        <li v-if="!respaldo?.adjuntos?.length" class="text-ink-400">
          Aún no hay archivos escaneados.
        </li>
        <li
          v-for="a in respaldo?.adjuntos ?? []"
          :key="a.id"
          class="flex items-center justify-between gap-2 rounded-md border border-ink-100 px-3 py-1.5 dark:border-white/10"
        >
          <button
            type="button"
            class="min-w-0 truncate text-left text-seal-600 hover:underline"
            @click="citesService.abrirArchivo(respaldo!.id, a.id, a.mimeType)"
          >
            <i
              class="fa-solid"
              :class="a.mimeType === 'application/pdf' ? 'fa-file-pdf' : 'fa-image'"
              aria-hidden="true"
            />
            {{ a.nombreOriginal }}
          </button>
          <span class="shrink-0 text-xs text-ink-400">{{ kb(a.tamano) }}</span>
          <button
            v-if="puedeEscribir"
            type="button"
            class="shrink-0 text-xs text-red-600 hover:underline"
            @click="quitarArchivo(a.id)"
          >
            Quitar
          </button>
        </li>
      </ul>
      <label
        v-if="puedeEscribir"
        class="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium hover:bg-ink-50 dark:border-white/10"
      >
        <i class="fa-solid fa-upload" aria-hidden="true" />
        {{ subiendo ? 'Subiendo…' : 'Subir archivo(s)' }}
        <input
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp"
          class="sr-only"
          :disabled="subiendo"
          @change="subirRespaldo"
        />
      </label>
      <template #footer
        ><BaseButton variant="secondary" @click="respaldo = null">Cerrar</BaseButton></template
      >
    </BaseModal>
  </div>
</template>
