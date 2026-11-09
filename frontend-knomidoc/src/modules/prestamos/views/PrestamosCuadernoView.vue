<script setup lang="ts">
import { fechaHora } from '@/utils/estados'
import { useAuthStore } from '@/stores/auth.store'
import IconButton from '@/components/ui/IconButton.vue'
import DevolucionModal from '../components/DevolucionModal.vue'
import C31DetailModal from '@/modules/c31-gastos/components/C31DetailModal.vue'
import { c31Service } from '@/services/c31.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { ComprobanteC31 } from '@/types/c31.types'
import type { DevolverPrestamoCuadernoPayload } from '@/types/prestamos.types'
import { onMounted, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import EvidenciaPrestamoModal from '../components/EvidenciaPrestamoModal.vue'
import PrestamoCuadernoForm from '../components/PrestamoCuadernoForm.vue'
import CuadernoFilterBar from '../components/CuadernoFilterBar.vue'
import { usePrestamosStore, filtrosCuadernoVacios } from '@/stores/prestamos.store'
import { prestamosService } from '@/services/prestamos.service'
import type {
  CuadernoFilterState,
  PrestamoCuaderno,
  PrestamoCuadernoCreatePayload,
} from '@/types/prestamos.types'
import { rotuloC31 } from '@/types/c31.types'

const auth = useAuthStore()
const store = usePrestamosStore()
const modalOpen = ref(false)
const saving = ref(false)
const returningId = ref<string | null>(null)
const errorCuaderno = ref('')
const detalleOpen = ref(false)
const detalleSel = ref<ComprobanteC31 | null>(null)

async function verSeguimiento(row: PrestamoCuaderno) {
  detalleSel.value = await c31Service.getById(String(row.comprobanteId))
  detalleOpen.value = true
}

const columns: DataTableColumn<PrestamoCuaderno>[] = [
  { key: 'comprobanteId', label: 'Comprobante' },
  { key: 'funcionarioId', label: 'Funcionario' },
  { key: 'areaUnidad', label: 'Área / unidad' },
  { key: 'fechaHoraSalida', label: 'Salida', sortable: true },
  { key: 'devuelto', label: 'Estado' },
]

const evidenciaOpen = ref(false)
const evidenciaDe = ref<PrestamoCuaderno | null>(null)
function abrirEvidencia(row: PrestamoCuaderno) {
  evidenciaDe.value = row
  evidenciaOpen.value = true
}

async function handleSubmit(payload: PrestamoCuadernoCreatePayload & { evidencia?: File | null }) {
  saving.value = true
  try {
    errorCuaderno.value = ''
    const { evidencia, ...datos } = payload
    const creados = await prestamosService.createCuaderno(datos)
    if (evidencia && creados[0]) {
      try {
        await prestamosService.subirEvidenciaCuaderno(creados[0].id, 'salida', evidencia)
      } catch (e) {
        errorCuaderno.value =
          'El préstamo se registró, pero la imagen no se pudo subir: ' +
          extractApiErrorMessage(e, 'intente de nuevo desde la tabla.')
      }
    }
    modalOpen.value = false
    await store.fetchCuaderno()
  } catch (err) {
    errorCuaderno.value = extractApiErrorMessage(err, 'No se pudo registrar el préstamo.')
    modalOpen.value = false
  } finally {
    saving.value = false
  }
}

const devolviendo = ref<PrestamoCuaderno | null>(null)
const devolucionOpen = ref(false)

function handleDevolver(row: PrestamoCuaderno) {
  devolviendo.value = row
  devolucionOpen.value = true
}

async function confirmarDevolucion(payload: DevolverPrestamoCuadernoPayload) {
  if (!devolviendo.value) return
  returningId.value = devolviendo.value.id
  try {
    // Los comprobantes que salieron juntos se devuelven en un solo acto
    if (devolviendo.value.loteId)
      await store.devolverLoteCuaderno(devolviendo.value.loteId, payload)
    else await store.devolverCuaderno(devolviendo.value.id, payload)
    devolucionOpen.value = false
  } finally {
    returningId.value = null
  }
}

/** Cuántos comprobantes de la página comparten el lote de la fila. */
function cantidadLote(row: PrestamoCuaderno) {
  if (!row.loteId) return 1
  return store.cuaderno.filter((p) => p.loteId === row.loteId).length
}

const hoyIso = new Date().toISOString().slice(0, 10)
function vencido(row: PrestamoCuaderno) {
  return (
    !row.devuelto &&
    !!row.fechaDevolucionEstimada &&
    row.fechaDevolucionEstimada.slice(0, 10) < hoyIso
  )
}

const pestanas = [
  { id: '', label: 'Todos' },
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'VENCIDO', label: 'Vencidos' },
  { id: 'DEVUELTO', label: 'Devueltos' },
] as const

function cambiarPestana(id: CuadernoFilterState['estado']) {
  store.setFiltrosCuaderno({ ...store.cuadernoFiltros, estado: id })
  store.cuadernoPage = 1
  store.fetchCuaderno()
}

function nombreComprobante(row: PrestamoCuaderno) {
  return (
    (row.comprobante && rotuloC31(row.comprobante)) ??
    row.comprobante?.numeroFolio ??
    row.comprobanteId
  )
}

function nombreSolicitante(row: PrestamoCuaderno) {
  if (row.funcionario) return `${row.funcionario.nombres} ${row.funcionario.apellidos}`
  return row.solicitante?.nombreCompleto ?? '—'
}

// --- Filtros y reporte PDF ---
const gestiones = ref<number[]>([])
const generandoPdf = ref(false)

function aplicarFiltros(f: CuadernoFilterState) {
  store.setFiltrosCuaderno(f)
  store.fetchCuaderno()
}

function limpiarFiltros() {
  store.setFiltrosCuaderno(filtrosCuadernoVacios())
  store.fetchCuaderno()
}

async function reportePdf() {
  generandoPdf.value = true
  errorCuaderno.value = ''
  try {
    await prestamosService.abrirReporteCuadernoPdf(store.cuadernoFiltros)
  } catch (err) {
    errorCuaderno.value = extractApiErrorMessage(err, 'No se pudo generar el reporte PDF.')
  } finally {
    generandoPdf.value = false
  }
}

onMounted(async () => {
  store.setFiltrosCuaderno(filtrosCuadernoVacios())
  store.fetchCuaderno()
  try {
    gestiones.value = await c31Service.listGestiones()
  } catch {
    gestiones.value = []
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Préstamo — Cuaderno Bitácora</h1>
        <p class="text-sm text-ink-400">
          Préstamo individual y rápido de comprobantes ya en archivo.
        </p>
      </div>
      <BaseButton v-if="!auth.esSoloConsulta" @click="modalOpen = true"
        >+ Registrar préstamo</BaseButton
      >
    </div>

    <p
      v-if="errorCuaderno"
      class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ errorCuaderno }}
    </p>

    <CuadernoFilterBar
      :model-value="store.cuadernoFiltros"
      :gestiones="gestiones"
      :generando-pdf="generandoPdf"
      @update:model-value="aplicarFiltros"
      @limpiar="limpiarFiltros"
      @pdf="reportePdf"
    />

    <div class="flex flex-wrap items-center gap-2" role="tablist" aria-label="Estado del préstamo">
      <button
        v-for="t in pestanas"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="store.cuadernoFiltros.estado === t.id"
        class="rounded-full border px-3 py-1 text-sm"
        :class="
          store.cuadernoFiltros.estado === t.id
            ? 'border-seal-500 bg-seal-50 text-seal-700 dark:bg-seal-500/10 dark:text-seal-300'
            : 'border-ink-200 text-ink-500 hover:bg-ink-50 dark:border-white/10 dark:hover:bg-white/5'
        "
        @click="cambiarPestana(t.id)"
      >
        {{ t.label }}
      </button>
      <span class="text-xs text-ink-400">
        El PDF imprime lo que se ve (por ejemplo, solo lo que falta devolver).
      </span>
    </div>

    <BaseDataTable
      :columns="columns"
      :rows="store.cuaderno"
      :loading="store.loadingCuaderno"
      :page="store.cuadernoPage"
      :total-pages="store.cuadernoTotalPages"
      @update:page="
        (p) => {
          store.cuadernoPage = p
          store.fetchCuaderno()
        }
      "
      empty-message="Aún no hay préstamos registrados en el cuaderno."
    >
      <template #cell-comprobanteId="{ row }">
        {{ nombreComprobante(row) }}
        <span
          v-if="cantidadLote(row) > 1"
          class="ml-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600 dark:bg-white/10 dark:text-ink-200"
          title="Salieron juntos; se devuelven juntos"
        >
          Lote ×{{ cantidadLote(row) }}
        </span>
      </template>
      <template #cell-funcionarioId="{ row }">{{ nombreSolicitante(row) }}</template>
      <template #cell-fechaHoraSalida="{ row }">
        {{ fechaHora(row.fechaHoraSalida) }}
      </template>
      <template #cell-devuelto="{ row }">
        <span
          v-if="vencido(row)"
          class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300"
        >
          Vencido
        </span>
        <BaseBadge v-else :estado="row.devuelto ? 'DEVUELTO' : 'PRESTADO'" />
      </template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-1">
          <IconButton
            icon="fa-clock-rotate-left"
            label="Ver seguimiento del comprobante"
            @click="verSeguimiento(row)"
          />
          <IconButton
            icon="fa-image"
            :label="
              row.evidenciaSalida || row.evidenciaDevolucion
                ? 'Ver / actualizar evidencia'
                : 'Subir evidencia (imagen)'
            "
            :variant="row.evidenciaSalida || row.evidenciaDevolucion ? 'success' : undefined"
            @click="abrirEvidencia(row)"
          />
          <IconButton
            v-if="!row.devuelto && !auth.esSoloConsulta"
            icon="fa-rotate-left"
            :label="cantidadLote(row) > 1 ? 'Devolver lote completo' : 'Registrar devolución'"
            variant="success"
            :loading="returningId === row.id"
            @click="handleDevolver(row)"
          />
        </div>
      </template>
    </BaseDataTable>

    <BaseModal v-model="modalOpen" size="lg" title="Registrar préstamo (cuaderno bitácora)">
      <PrestamoCuadernoForm :saving="saving" @submit="handleSubmit" />
    </BaseModal>
    <EvidenciaPrestamoModal
      v-model="evidenciaOpen"
      :prestamo="evidenciaDe"
      :puede-editar="!auth.esSoloConsulta"
      @changed="store.fetchCuaderno()"
    />
    <C31DetailModal v-model="detalleOpen" :comprobante="detalleSel" tab="seguimiento" />
    <DevolucionModal
      v-model="devolucionOpen"
      con-quien-devuelve
      :solicitante="devolviendo?.funcionario ?? null"
      :saving="returningId !== null"
      @confirm="confirmarDevolucion"
    />
  </div>
</template>
