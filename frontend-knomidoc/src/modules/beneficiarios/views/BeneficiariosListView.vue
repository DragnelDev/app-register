<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import IconButton from '@/components/ui/IconButton.vue'
import BeneficiarioModal from '../components/BeneficiarioModal.vue'
import { beneficiariosService } from '@/services/beneficiarios.service'
import { useAuthStore } from '@/stores/auth.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import { bs } from '@/utils/estados'
import {
  documentoBeneficiario,
  type Beneficiario,
  type BeneficiarioFicha,
  type BeneficiarioPayload,
} from '@/types/beneficiarios.types'

const auth = useAuthStore()
const puedeEscribir = computed(
  () =>
    auth.rol === 'ADMIN' || auth.rol === 'OPERADOR_ARCHIVOS' || auth.rol === 'AUXILIAR_ARCHIVOS',
)
const puedeReporte = computed(() => auth.rol !== 'SOLO_LECTURA' && auth.rol !== 'CONSULTA_EXTERNA')

const items = ref<Beneficiario[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const loading = ref(false)
const error = ref('')
const filtros = reactive({
  search: '',
  tipoPersona: '',
  tipoDocumento: '',
  estado: '',
  gestion: '',
  conComprobantes: '',
})
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const columns: DataTableColumn<Beneficiario>[] = [
  { key: 'nombre', label: 'Beneficiario', sortable: true },
  { key: 'tipoPersona', label: 'Tipo' },
  { key: 'numeroDocumento', label: 'Documento' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'estado', label: 'Estado' },
]

function parametros() {
  return Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''))
}

async function cargar() {
  loading.value = true
  try {
    error.value = ''
    const r = await beneficiariosService.list({ page: page.value, pageSize, ...parametros() })
    items.value = r.data
    total.value = r.total
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudo cargar el directorio.')
  } finally {
    loading.value = false
  }
}
function aplicar() {
  page.value = 1
  cargar()
}
function limpiar() {
  Object.keys(filtros).forEach((k) => ((filtros as Record<string, string>)[k] = ''))
  aplicar()
}
async function pdf() {
  try {
    await beneficiariosService.abrirPdf(parametros())
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudo generar el PDF.')
  }
}

// ── alta / edición ──
const modalOpen = ref(false)
const editando = ref<Beneficiario | null>(null)
const saving = ref(false)
const saveError = ref('')
function nuevo() {
  editando.value = null
  saveError.value = ''
  modalOpen.value = true
}
function editar(b: Beneficiario) {
  if (!puedeEscribir.value) return verFicha(b)
  editando.value = b
  saveError.value = ''
  modalOpen.value = true
}
async function guardar(fn: () => Promise<unknown>) {
  saving.value = true
  saveError.value = ''
  try {
    await fn()
    modalOpen.value = false
    await cargar()
  } catch (e) {
    saveError.value = extractApiErrorMessage(e, 'No se pudo guardar el beneficiario.')
  } finally {
    saving.value = false
  }
}
const crear = (p: BeneficiarioPayload) => guardar(() => beneficiariosService.create(p))
const actualizar = (id: number, p: Partial<BeneficiarioPayload>) =>
  guardar(() => beneficiariosService.update(id, p))

async function eliminar(b: Beneficiario) {
  if (!confirm(`¿Eliminar a ${b.nombre}? Si tiene comprobantes solo se desactivará.`)) return
  try {
    await beneficiariosService.remove(b.id)
    await cargar()
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudo eliminar.')
  }
}

// ── ficha ──
const fichaAbierta = ref(false)
const ficha = ref<BeneficiarioFicha | null>(null)
const fichaCargando = ref(false)
async function verFicha(b: Beneficiario) {
  fichaAbierta.value = true
  fichaCargando.value = true
  ficha.value = null
  try {
    ficha.value = await beneficiariosService.ficha(b.id)
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudo cargar la ficha.')
    fichaAbierta.value = false
  } finally {
    fichaCargando.value = false
  }
}
const idC31 = (c: BeneficiarioFicha['comprobantes'][number]) =>
  c.preventivos?.length
    ? `PREV ${c.preventivos.map((p) => p.numeroPreventivo).join(' - ')}`
    : c.devengados?.length
      ? `DEV ${c.devengados.map((d) => d.numeroDevengado).join(' - ')}`
      : `#${c.id}`

const campo =
  'rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'
onMounted(cargar)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Beneficiarios</h1>
        <p class="text-sm text-ink-500 dark:text-ink-400">
          Directorio de personas y empresas a quienes se paga. Los C31 y los pagos se vinculan a
          este directorio.
        </p>
      </div>
      <div class="flex gap-2">
        <BaseButton v-if="puedeReporte" variant="secondary" @click="pdf">
          <i class="fa-solid fa-file-pdf mr-1" aria-hidden="true" /> PDF
        </BaseButton>
        <BaseButton v-if="puedeEscribir" @click="nuevo">+ Registrar beneficiario</BaseButton>
      </div>
    </div>

    <form class="card grid grid-cols-2 gap-3 p-4 md:grid-cols-6" @submit.prevent="aplicar">
      <div class="col-span-2 md:col-span-2">
        <label class="mb-1 block text-xs font-medium text-ink-500" for="b-q">Buscar</label>
        <input
          id="b-q"
          v-model="filtros.search"
          type="search"
          placeholder="Nombre, CI/NIT o teléfono…"
          :class="[campo, 'w-full']"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-ink-500" for="b-tp">Tipo</label>
        <select id="b-tp" v-model="filtros.tipoPersona" :class="[campo, 'w-full']">
          <option value="">Todos</option>
          <option value="NATURAL">Natural</option>
          <option value="JURIDICA">Jurídica</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-ink-500" for="b-td">Documento</label>
        <select id="b-td" v-model="filtros.tipoDocumento" :class="[campo, 'w-full']">
          <option value="">Todos</option>
          <option value="CI">CI</option>
          <option value="NIT">NIT</option>
          <option value="OTRO">Otro</option>
          <option value="SIN_DOCUMENTO">Sin documento</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-ink-500" for="b-e">Estado</label>
        <select id="b-e" v-model="filtros.estado" :class="[campo, 'w-full']">
          <option value="">Todos</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-ink-500" for="b-c">Comprobantes</label>
        <select id="b-c" v-model="filtros.conComprobantes" :class="[campo, 'w-full']">
          <option value="">Todos</option>
          <option value="true">Con comprobantes</option>
          <option value="false">Sin comprobantes</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-ink-500" for="b-g">Gestión</label>
        <input
          id="b-g"
          v-model="filtros.gestion"
          type="number"
          min="2000"
          max="2100"
          placeholder="2026"
          :class="[campo, 'w-full']"
        />
      </div>
      <div class="flex items-end gap-2">
        <BaseButton type="submit" size="sm"
          ><i class="fa-solid fa-filter mr-1" aria-hidden="true" /> Filtrar</BaseButton
        >
        <BaseButton type="button" variant="secondary" size="sm" @click="limpiar"
          >Limpiar</BaseButton
        >
      </div>
    </form>

    <p
      v-if="error"
      class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ error }}
    </p>

    <BaseDataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :page="page"
      :total-pages="totalPages"
      empty-message="No hay beneficiarios que coincidan."
      @update:page="
        (p) => {
          page = p
          cargar()
        }
      "
      @row-click="verFicha"
    >
      <template #cell-tipoPersona="{ row }">{{
        row.tipoPersona === 'JURIDICA' ? 'Jurídica' : 'Natural'
      }}</template>
      <template #cell-numeroDocumento="{ row }">{{ documentoBeneficiario(row) }}</template>
      <template #cell-telefono="{ row }">{{ row.telefono || '—' }}</template>
      <template #cell-estado="{ row }">
        <BaseBadge :estado="row.estado === 'ACTIVO' ? 'EN_ARCHIVO' : 'ANULADO'">
          {{ row.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
        </BaseBadge>
      </template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-1">
          <IconButton icon="fa-folder-open" label="Ver ficha" @click="verFicha(row)" />
          <IconButton
            v-if="puedeEscribir"
            icon="fa-pen-to-square"
            label="Editar"
            @click="editar(row)"
          />
          <IconButton
            v-if="auth.isAdmin"
            icon="fa-trash"
            label="Eliminar"
            variant="danger"
            @click="eliminar(row)"
          />
        </div>
      </template>
    </BaseDataTable>

    <BeneficiarioModal
      v-model="modalOpen"
      :beneficiario="editando"
      :saving="saving"
      :server-error="saveError"
      @create="crear"
      @update="actualizar"
    />

    <BaseModal
      v-model="fichaAbierta"
      :title="ficha?.beneficiario.nombre ?? 'Ficha del beneficiario'"
    >
      <p v-if="fichaCargando" class="text-sm text-ink-500">Cargando…</p>
      <div v-else-if="ficha" class="space-y-4 text-sm">
        <p class="text-ink-500 dark:text-ink-400">
          {{ documentoBeneficiario(ficha.beneficiario) }}
        </p>
        <div class="grid grid-cols-3 gap-3">
          <div class="rounded-lg bg-ink-50 p-3 dark:bg-white/5">
            <p class="text-xs text-ink-500">Comprobantes</p>
            <p class="text-lg font-semibold">{{ ficha.resumen.comprobantes }}</p>
          </div>
          <div class="rounded-lg bg-ink-50 p-3 dark:bg-white/5">
            <p class="text-xs text-ink-500">Pagos</p>
            <p class="text-lg font-semibold">{{ ficha.resumen.pagos }}</p>
          </div>
          <div class="rounded-lg bg-ink-50 p-3 dark:bg-white/5">
            <p class="text-xs text-ink-500">Total pagado</p>
            <p class="text-lg font-semibold">{{ bs(ficha.resumen.totalPagado) }}</p>
          </div>
        </div>
        <div v-if="ficha.porGestion.length">
          <h4 class="mb-1 font-semibold">Por gestión</h4>
          <ul class="divide-y divide-ink-100 dark:divide-white/10">
            <li v-for="g in ficha.porGestion" :key="g.gestion" class="flex justify-between py-1">
              <span>{{ g.gestion }} · {{ g.cantidad }} comprobante(s)</span
              ><span>{{ bs(g.monto) }}</span>
            </li>
          </ul>
        </div>
        <div v-if="ficha.comprobantes.length">
          <h4 class="mb-1 font-semibold">Comprobantes</h4>
          <ul class="max-h-64 divide-y divide-ink-100 overflow-auto dark:divide-white/10">
            <li v-for="c in ficha.comprobantes" :key="c.id" class="py-1.5">
              <RouterLink
                :to="`/c31?id=${c.id}`"
                class="font-medium text-seal-600 hover:underline"
                >{{ idC31(c) }}</RouterLink
              >
              <span class="text-ink-500"> · {{ c.gestion }} · {{ bs(c.montoTotal) }}</span>
              <p class="line-clamp-2 text-xs text-ink-500 dark:text-ink-400">{{ c.descripcion }}</p>
            </li>
          </ul>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
