<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'
import DevolucionModal from '../components/DevolucionModal.vue'
import IconButton from '@/components/ui/IconButton.vue'
import C31DetailModal from '@/modules/c31-gastos/components/C31DetailModal.vue'
import { c31Service } from '@/services/c31.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { ComprobanteC31 } from '@/types/c31.types'
import type { CondicionDevolucion } from '@/types/prestamos.types'
import { computed, onMounted, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import PrestamoNotaForm from '../components/PrestamoNotaForm.vue'
import NotaEditModal from '../components/NotaEditModal.vue'
import { usePrestamosStore } from '@/stores/prestamos.store'
import { prestamosService } from '@/services/prestamos.service'
import type { PrestamoNota, PrestamoNotaCreatePayload } from '@/types/prestamos.types'
import { rotuloC31 } from '@/types/c31.types'

const auth = useAuthStore()
const store = usePrestamosStore()
const modalOpen = ref(false)
const saving = ref(false)
const returningId = ref<string | null>(null)

// El backend crea un registro de préstamo por cada comprobante incluido en la nota,
// así que la tabla muestra una fila por comprobante (agrupables visualmente por N° de nota).
const columns: DataTableColumn<PrestamoNota>[] = [
  { key: 'numeroNotaSolicitud', label: 'N° de nota', sortable: true },
  { key: 'institucionSolicitante', label: 'Unidad solicitante' },
  { key: 'funcionarioResponsable', label: 'Funcionario' },
  { key: 'comprobanteId', label: 'Comprobante' },
  { key: 'estadoPrestamo', label: 'Estado' },
]

async function handleSubmit(payload: PrestamoNotaCreatePayload) {
  saving.value = true
  try {
    errorNota.value = ''
    await prestamosService.createNota(payload)
    modalOpen.value = false
    avisoNota.value = payload.numeroNotaSolicitud
    avisoAprobada.value = Boolean(payload.aprobar)
    await store.fetchNotas()
    // Un borrador recién creado se abre directo para revisarlo y previsualizarlo
    if (!payload.aprobar) editarNota(payload.numeroNotaSolicitud)
  } catch (err) {
    errorNota.value = extractApiErrorMessage(err, 'No se pudo registrar el préstamo.')
    modalOpen.value = false
  } finally {
    saving.value = false
  }
}

const devolviendo = ref<PrestamoNota | null>(null)
const devolucionOpen = ref(false)

function handleDevolver(row: PrestamoNota) {
  devolviendo.value = row
  devolucionOpen.value = true
}

async function confirmarDevolucion(payload: {
  condicion: CondicionDevolucion
  observaciones?: string
}) {
  if (!devolviendo.value) return
  returningId.value = devolviendo.value.id
  try {
    // La nota se devuelve completa (todos sus comprobantes a la vez)
    await store.devolverNotaCompleta(devolviendo.value.numeroNotaSolicitud, payload)
    devolucionOpen.value = false
  } finally {
    returningId.value = null
  }
}

function nombreComprobante(row: PrestamoNota) {
  return (
    (row.comprobante && rotuloC31(row.comprobante)) ??
    row.comprobante?.numeroFolio ??
    row.comprobanteId
  )
}

const avisoNota = ref('')
const avisoAprobada = ref(false)
const errorNota = ref('')
const detalleOpen = ref(false)
const detalleSel = ref<ComprobanteC31 | null>(null)

async function imprimir(numeroNota: string) {
  errorNota.value = ''
  try {
    await prestamosService.abrirNotaPdf(numeroNota)
  } catch (err) {
    errorNota.value = extractApiErrorMessage(err, 'No se pudo generar el PDF de la nota.')
  }
}

// --- Etapa de edición / aprobación de borradores ---
const editOpen = ref(false)
const notaEnEdicion = ref('')
const filasEnEdicion = computed(() =>
  store.notas.filter((n) => n.numeroNotaSolicitud === notaEnEdicion.value),
)

function editarNota(numeroNota: string) {
  notaEnEdicion.value = numeroNota
  editOpen.value = true
}

async function alCambiarNota() {
  await store.fetchNotas()
  // Si se renombró la nota, se vuelve a localizar por su primer comprobante
  if (!filasEnEdicion.value.length) editOpen.value = false
}

const aprobando = ref('')
async function aprobar(numeroNota: string) {
  if (!confirm(`¿Aprobar la nota ${numeroNota}? Los comprobantes pasarán a "Prestado".`)) return
  aprobando.value = numeroNota
  errorNota.value = ''
  try {
    await prestamosService.aprobarNota(numeroNota)
    avisoNota.value = numeroNota
    avisoAprobada.value = true
    await store.fetchNotas()
  } catch (err) {
    errorNota.value = extractApiErrorMessage(err, 'No se pudo aprobar la nota.')
  } finally {
    aprobando.value = ''
  }
}

async function descartar(numeroNota: string) {
  if (!confirm(`¿Descartar el borrador de la nota ${numeroNota}?`)) return
  errorNota.value = ''
  try {
    await store.descartarBorrador(numeroNota)
  } catch (err) {
    errorNota.value = extractApiErrorMessage(err, 'No se pudo descartar el borrador.')
  }
}

async function verSeguimiento(row: PrestamoNota) {
  detalleSel.value = await c31Service.getById(String(row.comprobanteId))
  detalleOpen.value = true
}

onMounted(() => store.fetchNotas())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Préstamo — Nota / Oficio Oficial</h1>
        <p class="text-sm text-ink-400">
          Préstamo formal de uno o varios comprobantes mediante una nota de solicitud (ej. Auditoría
          Interna).
        </p>
      </div>
      <BaseButton v-if="!auth.esSoloConsulta" @click="modalOpen = true">+ Registrar solicitud</BaseButton>
    </div>

    <p
      v-if="errorNota"
      class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ errorNota }}
    </p>
    <div
      v-if="avisoNota"
      class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200"
      role="status"
    >
      <span>{{
        avisoAprobada
          ? 'Préstamo registrado. La nota de remisión está lista para imprimir y firmar.'
          : 'Borrador guardado. Revíselo y apruébelo para que los comprobantes salgan del archivo.'
      }}</span>
      <BaseButton size="sm" @click="imprimir(avisoNota)"
        ><i class="fa-solid fa-print" aria-hidden="true" /> Imprimir nota
        {{ avisoNota }}</BaseButton
      >
    </div>

    <BaseDataTable
      :columns="columns"
      :rows="store.notas"
      :loading="store.loadingNotas"
      empty-message="Aún no hay préstamos por nota registrados."
    >
      <template #cell-comprobanteId="{ row }">{{ nombreComprobante(row) }}</template>
      <template #cell-funcionarioResponsable="{ row }">
        {{ row.funcionario ? `${row.funcionario.nombres} ${row.funcionario.apellidos}` : (row.funcionarioResponsable ?? '—') }}
      </template>
      <template #cell-institucionSolicitante="{ row }">{{ row.institucionSolicitante ?? '—' }}</template>
      <template #cell-estadoPrestamo="{ row }"><BaseBadge :estado="row.estadoPrestamo" /></template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-1">
          <template v-if="row.estadoPrestamo === 'BORRADOR'">
            <IconButton v-if="!auth.esSoloConsulta"
              icon="fa-pen-to-square"
              label="Editar y previsualizar nota"
              variant="primary"
              @click="editarNota(row.numeroNotaSolicitud)"
            />
            <IconButton v-if="!auth.esSoloConsulta"
              icon="fa-circle-check"
              label="Aprobar y entregar"
              variant="success"
              :loading="aprobando === row.numeroNotaSolicitud"
              @click="aprobar(row.numeroNotaSolicitud)"
            />
            <IconButton v-if="!auth.esSoloConsulta"
              icon="fa-trash"
              label="Descartar borrador"
              variant="danger"
              @click="descartar(row.numeroNotaSolicitud)"
            />
          </template>
          <IconButton v-else-if="auth.puedeExportar"
            icon="fa-print"
            label="Imprimir nota (PDF)"
            variant="primary"
            @click="imprimir(row.numeroNotaSolicitud)"
          />
          <IconButton
            icon="fa-clock-rotate-left"
            label="Ver seguimiento del comprobante"
            @click="verSeguimiento(row)"
          />
          <IconButton v-if="(row.estadoPrestamo === 'ENTREGADO') && !auth.esSoloConsulta"
            icon="fa-rotate-left"
            label="Devolver nota completa"
            variant="success"
            :loading="returningId === row.id"
            @click="handleDevolver(row)"
          />
        </div>
      </template>
    </BaseDataTable>

    <BaseModal v-model="modalOpen" title="Registrar préstamo por nota" size="lg">
      <PrestamoNotaForm :saving="saving" @submit="handleSubmit" />
    </BaseModal>
    <NotaEditModal v-model="editOpen" :filas="filasEnEdicion" @cambio="alCambiarNota" />
    <C31DetailModal v-model="detalleOpen" :comprobante="detalleSel" tab="seguimiento" />
    <DevolucionModal
      v-model="devolucionOpen"
      :saving="returningId !== null"
      @confirm="confirmarDevolucion"
    />
  </div>
</template>
