<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { c31Service } from '@/services/c31.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import { ESTADO_C31_LABEL, bs } from '@/utils/estados'
import {
  rotuloC31,
  type C31GrupoMiembro,
  type ComprobanteC31,
} from '@/types/c31.types'
import type { EstadoFisico } from '@/types/common.types'

/**
 * Un comprobante nace como PREV o DEV. Cuando en la práctica vienen juntos
 * (PREV 3 + PREV 7, PREV + DEV) se agrupan aquí; cada uno conserva su registro,
 * monto y beneficiarios, y se entregan juntos en el acta.
 */
const props = defineProps<{ comprobante: ComprobanteC31; puedeEditar: boolean }>()
const emit = defineEmits<{ cambio: [] }>()

const miembros = ref<C31GrupoMiembro[]>([])
const cargando = ref(false)
const error = ref('')
const busqueda = ref('')
/** PREV y DEV tienen numeración propia: se busca el número dentro del tipo elegido. */
const tipoBuscado = ref<'CON_IMPUTACION' | 'SIN_IMPUTACION'>('CON_IMPUTACION')
const resultados = ref<ComprobanteC31[]>([])
const buscando = ref(false)
const procesando = ref(false)

const idActual = () => Number(props.comprobante.id)

async function cargar() {
  cargando.value = true
  try {
    miembros.value = await c31Service.grupo(props.comprobante.id)
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo cargar la unión.')
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)
watch(() => props.comprobante.id, cargar)

let temporizador: ReturnType<typeof setTimeout> | undefined
function alEscribir() {
  clearTimeout(temporizador)
  resultados.value = []
  if (busqueda.value.trim().length < 1) return
  temporizador = setTimeout(buscar, 300)
}

async function buscar() {
  buscando.value = true
  try {
    const r = await c31Service.list({
      page: 1,
      limit: 10,
      gestion: props.comprobante.gestion,
      tipoC31: tipoBuscado.value,
      numeroPreventivo: busqueda.value.trim(),
    } as never)
    const ya = new Set([idActual(), ...miembros.value.map((m) => m.id)])
    resultados.value = r.data.filter(
      (c) => !ya.has(Number(c.id)) && c.estadoFisico !== 'ANULADO',
    )
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo buscar.')
  } finally {
    buscando.value = false
  }
}

async function unir(otro: ComprobanteC31) {
  procesando.value = true
  error.value = ''
  try {
    miembros.value = await c31Service.unir([props.comprobante.id, otro.id])
    busqueda.value = ''
    resultados.value = []
    emit('cambio')
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo unir los comprobantes.')
  } finally {
    procesando.value = false
  }
}

async function separar(id: number | string = props.comprobante.id) {
  procesando.value = true
  error.value = ''
  try {
    await c31Service.separar(id)
    await cargar()
    emit('cambio')
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo separar el comprobante.')
  } finally {
    procesando.value = false
  }
}

const campo =
  'w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'
</script>

<template>
  <div class="space-y-4 text-sm">
    <p
      v-if="error"
      class="rounded-md bg-red-50 px-3 py-2 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      role="alert"
    >
      {{ error }}
    </p>

    <p class="text-xs text-ink-500 dark:text-ink-300">
      Use la unión cuando este comprobante viene junto a otro como un solo documento (por ejemplo
      PREV 3 + PREV 7, o un PREV con su DEV). Cada uno conserva su registro; al armar el acta de
      entrega se incluyen juntos.
    </p>

    <p v-if="cargando" class="text-ink-400">Cargando…</p>

    <template v-else>
      <div v-if="miembros.length">
        <h4 class="mb-2 font-semibold text-ink-700 dark:text-ink-200">
          Comprobantes unidos
          <span v-if="comprobante.rotuloGrupo" class="ml-1 font-mono text-seal-600">· {{ comprobante.rotuloGrupo }}</span>
        </h4>
        <ul class="space-y-2">
          <li
            v-for="m in miembros"
            :key="m.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ink-100 px-3 py-2 dark:border-white/10"
          >
            <span>
              <strong>{{ m.identificador }}</strong>
              <span v-if="m.id === idActual()" class="ml-2 text-xs text-seal-600">(este)</span>
            </span>
            <span class="flex items-center gap-3 text-xs text-ink-500">
              <span>
                {{ ESTADO_C31_LABEL[m.estadoFisico as EstadoFisico] ?? m.estadoFisico }}
                <template v-if="m.montoTotal"> · Bs {{ bs(Number(m.montoTotal)) }}</template>
              </span>
              <button
                v-if="puedeEditar && m.id !== idActual()"
                type="button"
                class="text-red-600 hover:underline disabled:opacity-50"
                :disabled="procesando"
                @click="separar(m.id)"
              >
                Quitar del grupo
              </button>
            </span>
          </li>
        </ul>
        <BaseButton
          v-if="puedeEditar"
          class="mt-3"
          size="sm"
          variant="secondary"
          :loading="procesando"
          @click="separar()"
        >
          Separar este comprobante del grupo
        </BaseButton>
      </div>
      <p v-else class="text-ink-400">
        Este comprobante ({{ rotuloC31(comprobante) }}) no está unido a otro.
      </p>

      <div v-if="puedeEditar">
        <h4 class="mb-1 font-semibold text-ink-700 dark:text-ink-200">
          Unir con otro comprobante (gestión {{ comprobante.gestion }})
        </h4>
        <div class="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2">
          <select v-model="tipoBuscado" :class="[campo, '!w-full']" aria-label="Tipo a buscar" @change="alEscribir">
            <option value="CON_IMPUTACION">Preventivo</option>
            <option value="SIN_IMPUTACION">Devengado</option>
          </select>
          <input
            v-model="busqueda"
            type="text"
            :class="[campo, '!w-full min-w-0']"
            :placeholder="tipoBuscado === 'CON_IMPUTACION' ? 'N° de preventivo…' : 'N° de devengado…'"
            @input="alEscribir"
          />
        </div>
        <p class="mt-1 text-xs text-ink-400">
          El PREV y el DEV tienen numeración propia: pueden unirse aunque sus números sean distintos (por ejemplo PREV 5 con DEV 12).
        </p>
        <p v-if="buscando" class="mt-1 text-xs text-ink-400">Buscando…</p>
        <ul v-if="resultados.length" class="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
          <li
            v-for="c in resultados"
            :key="c.id"
            class="flex items-center justify-between gap-3 rounded-md border border-ink-100 px-3 py-1.5 dark:border-white/10"
          >
            <span class="min-w-0">
              <strong class="whitespace-nowrap">{{ rotuloC31(c) }}</strong>
              <span class="block truncate text-xs text-ink-500">{{ c.descripcion }}</span>
            </span>
            <BaseButton size="sm" :loading="procesando" @click="unir(c)">Unir</BaseButton>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
