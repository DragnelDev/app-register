<script setup lang="ts">
import FechaInput from '@/components/shared/FechaInput.vue'
import IconButton from '@/components/ui/IconButton.vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import PagoFormModal from '../components/PagoFormModal.vue'
import C31DetailModal from '@/modules/c31-gastos/components/C31DetailModal.vue'
import { pagosService } from '@/services/pagos.service'
import { c31Service } from '@/services/c31.service'
import { useAuthStore } from '@/stores/auth.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import { bs, fechaCorta, TIPO_PAGO_LABEL } from '@/utils/estados'
import { rotuloC31, type ComprobanteC31 } from '@/types/c31.types'
import type { Pago, PagoFiltros, PagoPorBeneficiario, PagosResumen } from '@/types/pagos.types'
import { useGestionStore } from '@/stores/gestion.store'

const gestionStore = useGestionStore()

const auth = useAuthStore()
const pestana = ref<'pagos' | 'beneficiarios'>('pagos')

const filtros = reactive<PagoFiltros>({
  search: '',
  tipoPago: '',
  estadoPago: '',
  gestion: gestionStore.seleccionada,
  fechaDesde: '',
  fechaHasta: '',
  beneficiario: '',
})
const gestiones = ref<number[]>([])
const resumen = ref<PagosResumen | null>(null)
const error = ref('')

// --- Pagos ---
const rows = ref<Pago[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const loading = ref(false)

// --- Por beneficiario ---
const benRows = ref<PagoPorBeneficiario[]>([])
const benTotal = ref(0)
const benPage = ref(1)

const modalPago = ref(false)
const pagoEditado = ref<Pago | null>(null)
const detalleOpen = ref(false)
const detalleSel = ref<ComprobanteC31 | null>(null)

const columns: DataTableColumn<Pago>[] = [
  { key: 'comprobanteId', label: 'C31' },
  { key: 'beneficiarioId', label: 'Beneficiario' },
  { key: 'tipoPago', label: 'Forma de pago' },
  { key: 'monto', label: 'Monto (Bs)' },
  { key: 'fechaPago', label: 'Fecha de pago' },
  { key: 'estadoPago', label: 'Estado' },
]
const benColumns: DataTableColumn<PagoPorBeneficiario>[] = [
  { key: 'nombre', label: 'Beneficiario' },
  { key: 'cantidadPagos', label: 'Pagos' },
  { key: 'cantidadComprobantes', label: 'Comprobantes' },
  { key: 'montoPagado', label: 'Pagado (Bs)' },
  { key: 'montoPendiente', label: 'Pendiente (Bs)' },
  { key: 'ultimoPago', label: 'Último pago' },
]

async function cargarResumen() {
  resumen.value = await pagosService.resumen(filtros).catch(() => null)
}

async function cargar() {
  loading.value = true
  error.value = ''
  try {
    if (pestana.value === 'pagos') {
      const r = await pagosService.list({ ...filtros, page: page.value, pageSize })
      rows.value = r.data
      total.value = r.total
    } else {
      const r = await pagosService.porBeneficiario({ ...filtros, page: benPage.value, pageSize })
      benRows.value = r.data
      benTotal.value = r.total
    }
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudieron cargar los pagos.')
  } finally {
    loading.value = false
  }
}

function aplicar() {
  page.value = 1
  benPage.value = 1
  cargar()
  cargarResumen()
}
function limpiar() {
  Object.assign(filtros, {
    search: '',
    tipoPago: '',
    estadoPago: '',
    gestion: gestionStore.seleccionada,
    fechaDesde: '',
    fechaHasta: '',
    beneficiario: '',
  })
  aplicar()
}
watch(pestana, cargar)

function nuevo() {
  pagoEditado.value = null
  modalPago.value = true
}
function editar(p: Pago) {
  pagoEditado.value = p
  modalPago.value = true
}
async function anular(p: Pago) {
  if (!confirm('¿Anular este pago? Quedará registrado como anulado.')) return
  try {
    await pagosService.update(p.id, { estadoPago: 'ANULADO' })
    aplicar()
  } catch (err) {
    error.value = extractApiErrorMessage(err)
  }
}
async function marcarPagado(p: Pago) {
  try {
    await pagosService.update(p.id, { estadoPago: 'PAGADO' })
    aplicar()
  } catch (err) {
    error.value = extractApiErrorMessage(err)
  }
}
async function verComprobante(p: Pago) {
  detalleSel.value = await c31Service.getById(String(p.comprobanteId))
  detalleOpen.value = true
}
function verPagosDe(b: PagoPorBeneficiario) {
  filtros.beneficiario = b.nombre
  pestana.value = 'pagos'
  aplicar()
}
async function pdfListado() {
  try {
    await pagosService.listadoPdf(filtros)
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo generar el PDF.')
  }
}
async function pdfConstancia(p: Pago) {
  try {
    await pagosService.constanciaPdf(p.id)
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo generar la constancia.')
  }
}
async function exportar() {
  try {
    await pagosService.exportExcel(filtros)
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo exportar.')
  }
}

const tarjetas = computed(() => [
  {
    t: 'Pagado',
    v: resumen.value?.pagado.monto ?? 0,
    n: resumen.value?.pagado.cantidad ?? 0,
    c: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    t: 'Pendiente de pago',
    v: resumen.value?.pendiente.monto ?? 0,
    n: resumen.value?.pendiente.cantidad ?? 0,
    c: 'text-amber-700 dark:text-amber-300',
  },
  ...(resumen.value?.porTipo ?? []).map((x) => ({
    t: TIPO_PAGO_LABEL[x.tipo] + 's',
    v: x.monto,
    n: x.cantidad,
    c: 'text-ink-900 dark:text-white',
  })),
])

const campo =
  'rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'

onMounted(async () => {
  gestiones.value = await c31Service.listGestiones().catch(() => [])
  await Promise.all([cargar(), cargarResumen()])
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Pagos</h1>
        <p class="text-sm text-ink-500 dark:text-ink-400">
          Cheques y pagos electrónicos de cada comprobante, ligados a su beneficiario.
        </p>
      </div>
      <div class="flex gap-2">
        <BaseButton v-if="auth.puedeExportar" variant="secondary" @click="pdfListado">Descargar PDF</BaseButton>
        <BaseButton v-if="auth.puedeExportar" variant="secondary" @click="exportar">Exportar Excel</BaseButton>
        <BaseButton v-if="auth.puedeRegistrarC31" @click="nuevo">+ Registrar pago</BaseButton>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="c in tarjetas" :key="c.t" class="card p-4">
        <p class="text-xs text-ink-500 dark:text-ink-400">{{ c.t }}</p>
        <p class="text-xl font-semibold" :class="c.c">Bs {{ bs(c.v) }}</p>
        <p class="text-xs text-ink-400">{{ c.n }} pago(s)</p>
      </div>
    </div>

    <form class="card flex flex-wrap items-end gap-3 p-4" @submit.prevent="aplicar">
      <div class="min-w-[220px] flex-1">
        <label class="mb-1 block text-xs font-medium text-ink-500">Buscar</label>
        <input
          v-model="filtros.search"
          type="text"
          placeholder="Beneficiario, N° de cheque, N° de preventivo, glosa…"
          :class="[campo, 'w-full']"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-ink-500">Gestión</label>
        <select v-model="filtros.gestion" :class="campo">
          <option value="">Todas</option>
          <option v-for="g in gestiones" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>
      <template v-if="pestana === 'pagos'">
        <div>
          <label class="mb-1 block text-xs font-medium text-ink-500">Forma de pago</label>
          <select v-model="filtros.tipoPago" :class="campo">
            <option value="">Todas</option>
            <option value="CHEQUE">Cheque</option>
            <option value="ELECTRONICO">Pago electrónico</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink-500">Estado</label>
          <select v-model="filtros.estadoPago" :class="campo">
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PAGADO">Pagado</option>
            <option value="ANULADO">Anulado</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink-500">Pago desde</label>
          <FechaInput v-model="filtros.fechaDesde" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink-500">Hasta</label>
          <FechaInput v-model="filtros.fechaHasta" />
        </div>
      </template>
      <div class="flex gap-2">
        <BaseButton type="submit">Filtrar</BaseButton>
        <BaseButton type="button" variant="secondary" @click="limpiar">Limpiar</BaseButton>
      </div>
      <p v-if="filtros.beneficiario" class="w-full text-xs text-ink-600 dark:text-ink-300">
        Beneficiario: <strong>{{ filtros.beneficiario }}</strong>
        <button
          type="button"
          class="ml-2 text-seal-600 hover:underline dark:text-seal-300"
          @click="
            filtros.beneficiario = '';
            aplicar()
          "
        >
          quitar
        </button>
      </p>
    </form>

    <div class="flex gap-1 border-b border-ink-100 dark:border-white/10" role="tablist">
      <button
        v-for="t in [
          { id: 'pagos', l: 'Pagos' },
          { id: 'beneficiarios', l: 'Por beneficiario' },
        ] as const"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="pestana === t.id"
        class="-mb-px border-b-2 px-4 py-2 text-sm font-medium"
        :class="
          pestana === t.id
            ? 'border-seal-500 text-seal-600 dark:text-seal-300'
            : 'border-transparent text-ink-500 hover:text-ink-800 dark:hover:text-ink-100'
        "
        @click="pestana = t.id"
      >
        {{ t.l }}
      </button>
    </div>

    <p
      v-if="error"
      class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ error }}
    </p>

    <BaseDataTable
      v-if="pestana === 'pagos'"
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="page"
      :total-pages="Math.max(1, Math.ceil(total / pageSize))"
      empty-message="No hay pagos que coincidan con los filtros."
      @update:page="
        (p) => {
          page = p
          cargar()
        }
      "
    >
      <template #cell-comprobanteId="{ row }">
        <button
          type="button"
          class="font-mono text-xs text-seal-600 hover:underline dark:text-seal-300"
          @click="verComprobante(row)"
        >
          {{
            row.comprobante
              ? (rotuloC31(row.comprobante) ?? row.comprobanteId)
              : row.comprobanteId
          }}
        </button>
      </template>
      <template #cell-beneficiarioId="{ row }">{{
        row.beneficiario?.nombreBeneficiario ?? '—'
      }}</template>
      <template #cell-tipoPago="{ row }">
        {{ TIPO_PAGO_LABEL[row.tipoPago]
        }}<span v-if="row.numeroDocumento" class="font-mono text-xs">
          · {{ row.numeroDocumento }}</span
        >
      </template>
      <template #cell-monto="{ row }">{{
        row.monto === null ? 'Sin monto' : bs(row.monto)
      }}</template>
      <template #cell-fechaPago="{ row }">{{ fechaCorta(row.fechaPago) }}</template>
      <template #cell-estadoPago="{ row }"><BaseBadge :estado="row.estadoPago" /></template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-1">
          <IconButton icon="fa-file-pdf" label="Constancia de pago (PDF)" @click="pdfConstancia(row)" />
        <template v-if="auth.puedeRegistrarC31 && row.estadoPago !== 'ANULADO'">
          <IconButton
            v-if="row.estadoPago === 'PENDIENTE'"
            icon="fa-circle-check"
            label="Marcar como pagado"
            variant="success"
            @click="marcarPagado(row)"
          />
          <IconButton icon="fa-pen-to-square" label="Editar pago" @click="editar(row)" />
          <IconButton icon="fa-ban" label="Anular pago" variant="danger" @click="anular(row)" />
        </template>
        </div>
      </template>
    </BaseDataTable>

    <BaseDataTable
      v-else
      :columns="benColumns"
      :rows="benRows"
      :loading="loading"
      :page="benPage"
      :total-pages="Math.max(1, Math.ceil(benTotal / pageSize))"
      empty-message="Aún no hay pagos registrados a beneficiarios."
      @update:page="
        (p) => {
          benPage = p
          cargar()
        }
      "
      @row-click="verPagosDe"
    >
      <template #cell-montoPagado="{ row }">{{ bs(row.montoPagado) }}</template>
      <template #cell-montoPendiente="{ row }">{{ bs(row.montoPendiente) }}</template>
      <template #cell-ultimoPago="{ row }">{{ fechaCorta(row.ultimoPago) }}</template>
      <template #actions="{ row }">
        <IconButton
          icon="fa-list-ul"
          label="Ver pagos de este beneficiario"
          @click.stop="verPagosDe(row)"
        />
      </template>
    </BaseDataTable>

    <PagoFormModal v-model="modalPago" :pago="pagoEditado" @saved="aplicar" />
    <C31DetailModal v-model="detalleOpen" :comprobante="detalleSel" tab="pagos" />
  </div>
</template>
