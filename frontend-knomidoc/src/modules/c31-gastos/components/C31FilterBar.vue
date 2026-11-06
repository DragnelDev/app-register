<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { C31FilterState } from '@/types/c31.types'
import type { Carpeta } from '@/types/c31.types'
import type { Deposito, Estante } from '@/types/archivo.types'
import { ESTADOS_C31 } from '@/utils/estados'
import { depositosService, estantesService } from '@/services/archivo.service'
import { carpetasService } from '@/services/carpetas.service'

const props = defineProps<{ modelValue: C31FilterState; gestiones: number[]; lockTipo?: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: C31FilterState]
  export: []
}>()

const local = reactive<C31FilterState>({ ...props.modelValue })

watch(
  () => props.modelValue,
  (val) => Object.assign(local, val),
  { deep: true },
)

// --- Ubicación física en cascada: Depósito → Estante → Carpeta ---
const depositos = ref<Deposito[]>([])
const estantes = ref<Estante[]>([])
const carpetas = ref<Carpeta[]>([])

async function cargarEstantes() {
  estantes.value = local.depositoId ? await estantesService.opciones(Number(local.depositoId)) : []
}

async function cargarCarpetas() {
  if (!local.estanteId && !local.depositoId) {
    carpetas.value = []
    return
  }
  const res = await carpetasService.list({
    pageSize: 200,
    estanteId: local.estanteId || undefined,
    depositoId: local.depositoId || undefined,
  })
  carpetas.value = res.data
}

async function alCambiarDeposito() {
  local.estanteId = ''
  local.carpetaId = ''
  await Promise.all([cargarEstantes(), cargarCarpetas()])
}

async function alCambiarEstante() {
  local.carpetaId = ''
  await cargarCarpetas()
}

onMounted(async () => {
  try {
    depositos.value = await depositosService.opciones()
    if (local.depositoId) await Promise.all([cargarEstantes(), cargarCarpetas()])
  } catch {
    depositos.value = []
  }
})

// Los N° de preventivo se repiten entre gestiones: se avisa si se busca sin fijar una
const avisoGestion = computed(
  () => Boolean(local.numeroPreventivo?.trim()) && !local.gestion,
)

const hayFiltrosAvanzados = computed(
  () =>
    Boolean(local.search || local.estadoFisico || local.fechaDesde || local.fechaHasta) ||
    (local.digitalizado ?? '') !== '',
)

function apply() {
  emit('update:modelValue', { ...local })
}

function reset() {
  Object.assign(local, {
    search: '',
    detalle: '',
    numeroPreventivo: '',
    estadoFisico: '',
    fechaDesde: '',
    fechaHasta: '',
    gestion: '',
    depositoId: '',
    estanteId: '',
    carpetaId: '',
    digitalizado: '',
  })
  if (!props.lockTipo) local.tipoC31 = ''
  estantes.value = []
  carpetas.value = []
  apply()
}

const campo =
  'w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'
const etiqueta = 'mb-1 block text-xs font-medium text-ink-500'
</script>

<template>
  <form class="card space-y-3 p-4" @submit.prevent="apply">
    <div class="flex flex-wrap items-end gap-3">
      <!-- 1. Gestión: filtro principal, aísla los resultados por año fiscal -->
      <div class="w-32">
        <label :class="etiqueta" for="c31-gestion">Gestión</label>
        <select
          id="c31-gestion"
          v-model="local.gestion"
          :class="[campo, 'font-semibold']"
        >
          <option value="">Todas</option>
          <option v-for="g in gestiones" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>

      <!-- 2. Detalle / glosa -->
      <div class="min-w-[220px] flex-1">
        <label :class="etiqueta" for="c31-detalle">Detalle / glosa</label>
        <input
          id="c31-detalle"
          v-model="local.detalle"
          type="text"
          placeholder="Ej: combustible, pasajes…"
          :class="campo"
        />
      </div>

      <!-- 3. N° de preventivo -->
      <div class="w-40">
        <label :class="etiqueta" for="c31-prev">N° de preventivo</label>
        <input
          id="c31-prev"
          v-model="local.numeroPreventivo"
          type="text"
          inputmode="numeric"
          placeholder="Opcional"
          :class="campo"
        />
      </div>

      <!-- 4. Tipo de gasto -->
      <div class="w-56">
        <label :class="etiqueta" for="c31-tipo">Tipo de gasto</label>
        <select id="c31-tipo" v-model="local.tipoC31" :disabled="lockTipo" :class="campo">
          <option value="">Todos</option>
          <option value="CON_IMPUTACION">Con imputación presupuestaria</option>
          <option value="SIN_IMPUTACION">Sin imputación presupuestaria</option>
        </select>
      </div>
    </div>

    <p v-if="avisoGestion" class="text-xs text-amber-700 dark:text-amber-300" role="status">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
      Los N° de preventivo se repiten entre gestiones: seleccione una gestión para no mezclar
      comprobantes de distintos años.
    </p>

    <!-- 5. Ubicación física -->
    <fieldset class="flex flex-wrap items-end gap-3">
      <legend class="sr-only">Ubicación física</legend>
      <div class="w-52">
        <label :class="etiqueta" for="c31-dep">Depósito</label>
        <select id="c31-dep" v-model="local.depositoId" :class="campo" @change="alCambiarDeposito">
          <option value="">Todos</option>
          <option v-for="d in depositos" :key="d.id" :value="d.id">{{ d.nombre }}</option>
        </select>
      </div>
      <div class="w-44">
        <label :class="etiqueta" for="c31-est">Estante</label>
        <select
          id="c31-est"
          v-model="local.estanteId"
          :disabled="!local.depositoId"
          :class="campo"
          @change="alCambiarEstante"
        >
          <option value="">Todos</option>
          <option v-for="e in estantes" :key="e.id" :value="e.id">{{ e.codigo }}</option>
        </select>
      </div>
      <div class="w-44">
        <label :class="etiqueta" for="c31-carp">Carpeta</label>
        <select
          id="c31-carp"
          v-model="local.carpetaId"
          :disabled="!carpetas.length"
          :class="campo"
        >
          <option value="">Todas</option>
          <option v-for="c in carpetas" :key="c.id" :value="c.id">{{ c.codigoCarpeta }}</option>
        </select>
      </div>

      <div class="ml-auto flex gap-2">
        <button
          type="submit"
          class="rounded-md bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900 dark:bg-seal-500 dark:hover:bg-seal-600"
        >
          Filtrar
        </button>
        <button
          type="button"
          class="rounded-md border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50 dark:border-white/10 dark:text-ink-300 dark:hover:bg-white/5"
          @click="reset"
        >
          Limpiar
        </button>
        <button
          type="button"
          class="rounded-md border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50 dark:border-white/10 dark:text-ink-300 dark:hover:bg-white/5"
          @click="emit('export')"
        >
          ⬇ Exportar Excel
        </button>
      </div>
    </fieldset>

    <!-- Filtros adicionales (los que ya existían) -->
    <details :open="hayFiltrosAvanzados">
      <summary class="cursor-pointer text-xs font-medium text-ink-500 hover:text-ink-800 dark:hover:text-ink-200">
        Más filtros (búsqueda libre, estado físico, fechas, digitalización)
      </summary>
      <div class="mt-3 flex flex-wrap items-end gap-3">
        <div class="min-w-[220px] flex-1">
          <label :class="etiqueta" for="c31-buscar">Búsqueda libre</label>
          <input
            id="c31-buscar"
            v-model="local.search"
            type="text"
            placeholder="Beneficiario, N° de cheque, folio, N° devengado…"
            :class="campo"
          />
        </div>
        <div class="w-56">
          <label :class="etiqueta" for="c31-estado">Estado físico</label>
          <select id="c31-estado" v-model="local.estadoFisico" :class="campo">
            <option value="">Todos</option>
            <option v-for="e in ESTADOS_C31" :key="e.value" :value="e.value">{{ e.label }}</option>
          </select>
        </div>
        <div class="w-40">
          <label :class="etiqueta" for="c31-desde">Desde</label>
          <input id="c31-desde" v-model="local.fechaDesde" type="date" :class="campo" />
        </div>
        <div class="w-40">
          <label :class="etiqueta" for="c31-hasta">Hasta</label>
          <input id="c31-hasta" v-model="local.fechaHasta" type="date" :class="campo" />
        </div>
        <div class="w-44">
          <label :class="etiqueta" for="c31-digi">Digitalización</label>
          <select id="c31-digi" v-model="local.digitalizado" :class="campo">
            <option value="">Todos</option>
            <option value="true">Digitalizados</option>
            <option value="false">Pendientes</option>
          </select>
        </div>
      </div>
    </details>
  </form>
</template>
