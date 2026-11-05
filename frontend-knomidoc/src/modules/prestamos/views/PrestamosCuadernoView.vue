<script setup lang="ts">
import IconButton from '@/components/ui/IconButton.vue'
import DevolucionModal from '../components/DevolucionModal.vue'
import C31DetailModal from '@/modules/c31-gastos/components/C31DetailModal.vue'
import { c31Service } from '@/services/c31.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { ComprobanteC31 } from '@/types/c31.types'
import type { CondicionDevolucion } from '@/types/prestamos.types'
import { onMounted, ref } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import PrestamoCuadernoForm from '../components/PrestamoCuadernoForm.vue'
import { usePrestamosStore } from '@/stores/prestamos.store'
import { prestamosService } from '@/services/prestamos.service'
import type { PrestamoCuaderno, PrestamoCuadernoCreatePayload } from '@/types/prestamos.types'
import { identificadorC31 } from '@/types/c31.types'

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
  { key: 'solicitanteId', label: 'Solicitante' },
  { key: 'areaUnidad', label: 'Área / unidad' },
  { key: 'fechaHoraSalida', label: 'Salida', sortable: true },
  { key: 'devuelto', label: 'Estado' },
]

async function handleSubmit(payload: PrestamoCuadernoCreatePayload) {
  saving.value = true
  try {
    errorCuaderno.value = ''
    await prestamosService.createCuaderno(payload)
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

async function confirmarDevolucion(payload: {
  condicion: CondicionDevolucion
  observaciones?: string
}) {
  if (!devolviendo.value) return
  returningId.value = devolviendo.value.id
  try {
    await store.devolverCuaderno(devolviendo.value.id, payload)
    devolucionOpen.value = false
  } finally {
    returningId.value = null
  }
}

function nombreComprobante(row: PrestamoCuaderno) {
  return (
    (row.comprobante && identificadorC31(row.comprobante)) ??
    row.comprobante?.numeroFolio ??
    row.comprobanteId
  )
}

function nombreSolicitante(row: PrestamoCuaderno) {
  return row.solicitante?.nombreCompleto ?? row.solicitanteId
}

onMounted(() => store.fetchCuaderno())
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
      <BaseButton @click="modalOpen = true">+ Registrar préstamo</BaseButton>
    </div>

    <p
      v-if="errorCuaderno"
      class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ errorCuaderno }}
    </p>

    <BaseDataTable
      :columns="columns"
      :rows="store.cuaderno"
      :loading="store.loadingCuaderno"
      empty-message="Aún no hay préstamos registrados en el cuaderno."
    >
      <template #cell-comprobanteId="{ row }">{{ nombreComprobante(row) }}</template>
      <template #cell-solicitanteId="{ row }">{{ nombreSolicitante(row) }}</template>
      <template #cell-fechaHoraSalida="{ row }">
        {{ new Date(row.fechaHoraSalida).toLocaleString('es-BO') }}
      </template>
      <template #cell-devuelto="{ row }">
        <BaseBadge :estado="row.devuelto ? 'DEVUELTO' : 'PRESTADO'" />
      </template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-1">
          <IconButton
            icon="fa-clock-rotate-left"
            label="Ver seguimiento del comprobante"
            @click="verSeguimiento(row)"
          />
          <IconButton
            v-if="!row.devuelto"
            icon="fa-rotate-left"
            label="Registrar devolución"
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
    <C31DetailModal v-model="detalleOpen" :comprobante="detalleSel" tab="seguimiento" />
    <DevolucionModal
      v-model="devolucionOpen"
      :saving="returningId !== null"
      @confirm="confirmarDevolucion"
    />
  </div>
</template>
