<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseDataTable, { type DataTableColumn } from '@/components/ui/BaseDataTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { c31Service } from '@/services/c31.service'
import { actasEntregaService } from '@/services/actas-entrega.service'
import { carpetasService } from '@/services/carpetas.service'
import { useResumenStore } from '@/stores/resumen.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import { identificadorC31, type ComprobanteC31, type Carpeta } from '@/types/c31.types'
import type { ActaEntrega } from '@/types/actas-entrega.types'

type Pestana = 'sinActa' | 'sinCarpeta'

const resumen = useResumenStore()
const pestana = ref<Pestana>('sinActa')
const rows = ref<ComprobanteC31[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const search = ref('')
const loading = ref(false)
const error = ref('')
const aviso = ref('')

const actas = ref<ActaEntrega[]>([])
const carpetas = ref<Carpeta[]>([])

// Modal de regularización (sirve para ambas pestañas)
const modalOpen = ref(false)
const seleccionado = ref<ComprobanteC31 | null>(null)
const actaId = ref<string | number>('')
const carpetaId = ref<string | number>('')
const numeroParte = ref<string | number>(1)
const saving = ref(false)
const modalError = ref('')

const columns: DataTableColumn<ComprobanteC31>[] = [
  { key: 'id', label: 'N° Prev / Dev' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'montoTotal', label: 'Monto (Bs)' },
  { key: 'fechaElaboracion', label: 'Fecha' },
  { key: 'estadoFisico', label: 'Estado' },
]

const pendientes = computed(() => ({
  sinActa: resumen.data?.regularizacion.sinActa ?? 0,
  sinCarpeta: resumen.data?.regularizacion.sinCarpeta ?? 0,
}))

async function loadRows() {
  loading.value = true
  error.value = ''
  try {
    const res = await c31Service.list({
      page: page.value,
      pageSize,
      search: search.value || undefined,
      sinActa: pestana.value === 'sinActa' ? true : undefined,
      sinCarpeta: pestana.value === 'sinCarpeta' ? true : undefined,
    })
    rows.value = res.data
    total.value = res.total
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudieron cargar los comprobantes.')
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    loadRows()
  }, 350)
})

function cambiarPestana(p: Pestana) {
  pestana.value = p
  page.value = 1
  aviso.value = ''
  loadRows()
}

function abrir(row: ComprobanteC31) {
  seleccionado.value = row
  actaId.value = ''
  carpetaId.value = ''
  numeroParte.value = 1
  modalError.value = ''
  modalOpen.value = true
}

async function guardar() {
  const c = seleccionado.value
  if (!c) return
  saving.value = true
  modalError.value = ''
  try {
    if (pestana.value === 'sinActa') {
      if (!actaId.value) throw new Error('Seleccione el acta de entrega')
      // Al vincularse a un acta, el servidor lo pasa a "En archivo" (ARCHIVOS GAMSL)
      await c31Service.update(String(c.id), { actaEntregaId: String(actaId.value) })
      aviso.value = 'Comprobante vinculado al acta y registrado como "En archivo".'
    } else {
      if (!carpetaId.value) throw new Error('Seleccione la carpeta')
      const parte = Number(numeroParte.value)
      if (!Number.isInteger(parte) || parte < 1 || parte > 5) {
        throw new Error('La parte debe ser un número entre 1 y 5')
      }
      await c31Service.asignarCarpeta(c.id, carpetaId.value, parte)
      const carpeta = carpetas.value.find((x) => String(x.id) === String(carpetaId.value))
      // La columna CARPETA del Excel institucional sale de la ubicación física
      if (carpeta) await c31Service.update(String(c.id), { ubicacionFisica: carpeta.codigoCarpeta })
      aviso.value = `Carpeta ${carpeta?.codigoCarpeta ?? ''} asignada al comprobante.`
    }
    modalOpen.value = false
    await loadRows()
    resumen.fetch()
  } catch (err) {
    modalError.value = extractApiErrorMessage(err, 'No se pudo regularizar el comprobante.')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const [a, c] = await Promise.all([
    actasEntregaService.list({ page: 1, pageSize: 100 }).catch(() => null),
    carpetasService.list({ page: 1, pageSize: 100 }).catch(() => null),
  ])
  actas.value = a?.data ?? []
  carpetas.value = c?.data ?? []
  await loadRows()
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold">Vínculos / Regularización</h1>
      <p class="text-sm text-ink-500 dark:text-ink-400">
        Comprobantes que aún necesitan vincularse a un acta de entrega o ubicarse en una carpeta.
      </p>
    </div>

    <div class="flex flex-wrap gap-2" role="tablist">
      <button
        v-for="t in [
          { id: 'sinActa', label: 'Sin acta de entrega', n: pendientes.sinActa },
          { id: 'sinCarpeta', label: 'Sin carpeta asignada', n: pendientes.sinCarpeta },
        ] as { id: Pestana; label: string; n: number }[]"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="pestana === t.id"
        class="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        :class="
          pestana === t.id
            ? 'border-seal-500 bg-seal-500 text-white dark:border-seal-600 dark:bg-seal-600'
            : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50 dark:border-white/10 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800'
        "
        @click="cambiarPestana(t.id)"
      >
        {{ t.label }}
        <span
          class="rounded-full px-2 py-0.5 text-xs font-semibold"
          :class="
            pestana === t.id
              ? 'bg-white/20 text-white'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300'
          "
          >{{ t.n }}</span
        >
      </button>
    </div>

    <BaseInput v-model="search" placeholder="Buscar por descripción, N°, beneficiario…" class="max-w-xs" />
    <p v-if="aviso" class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300">{{ aviso }}</p>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <BaseDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :page="page"
      :total-pages="Math.max(1, Math.ceil(total / pageSize))"
      :empty-message="
        pestana === 'sinActa'
          ? 'No hay comprobantes pendientes de vincular a un acta.'
          : 'No hay comprobantes en archivo sin carpeta asignada.'
      "
      @update:page="(p) => { page = p; loadRows() }"
    >
      <template #cell-id="{ row }">
        <span class="font-mono text-xs">{{ identificadorC31(row) ?? '—' }}</span>
      </template>
      <template #cell-montoTotal="{ row }">{{ Number(row.montoTotal).toFixed(2) }}</template>
      <template #cell-estadoFisico="{ row }"><BaseBadge :estado="row.estadoFisico" /></template>
      <template #actions="{ row }">
        <BaseButton size="sm" @click="abrir(row)">
          <i class="fa-solid" :class="pestana === 'sinActa' ? 'fa-link' : 'fa-folder-open'" aria-hidden="true" />
          {{ pestana === 'sinActa' ? 'Vincular a acta' : 'Asignar carpeta' }}
        </BaseButton>
      </template>
    </BaseDataTable>

    <BaseModal
      v-model="modalOpen"
      :title="pestana === 'sinActa' ? 'Vincular a un acta de entrega' : 'Asignar carpeta'"
      size="sm"
    >
      <form id="vinculo-form" class="space-y-4" @submit.prevent="guardar">
        <p v-if="seleccionado" class="text-sm text-ink-600 dark:text-ink-300">
          <strong>{{ identificadorC31(seleccionado) ?? `#${seleccionado.id}` }}</strong> —
          {{ seleccionado.descripcion }}
        </p>

        <template v-if="pestana === 'sinActa'">
          <BaseSelect
            v-model="actaId"
            label="Acta de entrega"
            placeholder="Seleccione un acta…"
            required
            :options="actas.map((a) => ({ value: a.id, label: `${a.numeroActa} — ${a.fechaRecepcion?.slice(0, 10)}` }))"
            hint="Al vincularse, el comprobante pasa a «En archivo» (ARCHIVOS GAMSL)."
          />
        </template>
        <template v-else>
          <BaseSelect
            v-model="carpetaId"
            label="Carpeta"
            placeholder="Seleccione una carpeta…"
            required
            :options="carpetas.map((c) => ({ value: c.id, label: `${c.codigoCarpeta} — ${c.ubicacionFisica ?? ''}` }))"
          />
          <BaseInput v-model="numeroParte" type="number" label="Parte (1 a 5)" hint="Un comprobante puede ocupar hasta 5 carpetas." />
        </template>

        <p v-if="modalError" class="text-sm text-red-600">{{ modalError }}</p>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="modalOpen = false">Cancelar</BaseButton>
        <BaseButton type="submit" form="vinculo-form" :loading="saving">Guardar</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
