<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ComprobanteC31 } from '@/types/c31.types'
import { preventivosC31 } from '@/types/c31.types'

/**
 * Matriz de selección rápida por N° de preventivo (casilleros de 50 en 5 columnas
 * de 10, como una hoja de cálculo). Un comprobante con varios preventivos
 * (p. ej. 501-720) se marca completo al tocar cualquiera de sus casilleros.
 */
export type EstadoCelda = 'disponible' | 'prestado' | 'bloqueado'

const props = defineProps<{
  items: ComprobanteC31[]
  modelValue: Set<number>
  /** Estado de cada comprobante; por defecto todos disponibles */
  estadoDe?: (c: ComprobanteC31) => EstadoCelda
  soloLectura?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [Set<number>] }>()

const TAM = 50

function numerosDe(c: ComprobanteC31): number[] {
  return preventivosC31(c)
    .map((p) => Number(p.replace(/\D/g, '')))
    .filter((n) => Number.isInteger(n) && n > 0)
}

const porNumero = computed(() => {
  const m = new Map<number, ComprobanteC31>()
  for (const c of props.items) for (const n of numerosDe(c)) m.set(n, c)
  return m
})
const sinNumero = computed(() => props.items.filter((c) => numerosDe(c).length === 0))

const bloques = computed(() => {
  const nums = [...porNumero.value.keys()]
  if (!nums.length) return [0]
  const min = Math.floor((Math.min(...nums) - 1) / TAM)
  const max = Math.floor((Math.max(...nums) - 1) / TAM)
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
})
const bloque = ref(0)
watch(
  bloques,
  (b) => {
    if (!b.includes(bloque.value)) bloque.value = b[0] ?? 0
  },
  { immediate: true },
)

// 10 filas × 5 columnas; cada columna es una decena (1-10, 11-20, …)
const celdas = computed(() => {
  const base = bloque.value * TAM
  const filas: number[][] = []
  for (let r = 0; r < 10; r++) {
    const fila: number[] = []
    for (let c = 0; c < 5; c++) fila.push(base + c * 10 + r + 1)
    filas.push(fila)
  }
  return filas
})

function estado(c: ComprobanteC31): EstadoCelda {
  return props.estadoDe ? props.estadoDe(c) : 'disponible'
}

function alternar(c: ComprobanteC31) {
  if (props.soloLectura || estado(c) !== 'disponible') return
  const id = Number(c.id)
  const s = new Set(props.modelValue)
  s.has(id) ? s.delete(id) : s.add(id)
  emit('update:modelValue', s)
}

function claseCelda(n: number) {
  const c = porNumero.value.get(n)
  if (!c) return 'border-ink-100 bg-ink-50 text-ink-300 dark:border-white/5 dark:bg-white/5 dark:text-ink-600 cursor-default'
  const e = estado(c)
  if (e === 'prestado')
    return 'border-red-300 bg-red-100 text-red-800 cursor-not-allowed dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200'
  if (e === 'bloqueado')
    return 'border-ink-200 bg-ink-100 text-ink-400 cursor-not-allowed line-through dark:border-white/10 dark:bg-white/10'
  if (props.modelValue.has(Number(c.id)))
    return 'border-blue-600 bg-blue-200 font-semibold text-blue-900 dark:border-blue-400 dark:bg-blue-500/40 dark:text-blue-50'
  return 'border-ink-300 bg-white text-ink-800 hover:bg-ink-100 dark:border-white/20 dark:bg-ink-950 dark:text-ink-100 dark:hover:bg-white/10'
}

function titulo(n: number) {
  const c = porNumero.value.get(n)
  if (!c) return `Prev ${n}: sin comprobante registrado`
  const e = estado(c)
  const nombres = (c.beneficiarios ?? []).map((b) => b.nombreBeneficiario).join(', ')
  return `Prev ${n}${nombres ? ' · ' + nombres : ''}${e === 'prestado' ? ' (prestado)' : e === 'bloqueado' ? ' (no disponible)' : ''}`
}

// ── Atajos ──────────────────────────────────────────
const texto = ref('')
const aviso = ref('')

/** "6, 12, 14-18 35" → números */
function leerLista(t: string): number[] {
  const out: number[] = []
  for (const parte of t.split(/[\s,;]+/).filter(Boolean)) {
    const r = parte.match(/^(\d+)-(\d+)$/)
    if (r) {
      const a = Number(r[1])
      const b = Number(r[2])
      if (b >= a && b - a <= 5000) for (let i = a; i <= b; i++) out.push(i)
    } else if (/^\d+$/.test(parte)) out.push(Number(parte))
  }
  return out
}

function aplicarLista() {
  const nums = leerLista(texto.value)
  if (!nums.length) return
  const s = new Set(props.modelValue)
  const faltan: number[] = []
  const noDisp: number[] = []
  for (const n of nums) {
    const c = porNumero.value.get(n)
    if (!c) faltan.push(n)
    else if (estado(c) !== 'disponible') noDisp.push(n)
    else s.add(Number(c.id))
  }
  emit('update:modelValue', s)
  const partes: string[] = []
  if (faltan.length) partes.push(`Sin registro: ${faltan.join(', ')}`)
  if (noDisp.length) partes.push(`No disponibles: ${noDisp.join(', ')}`)
  aviso.value = partes.join(' · ')
  texto.value = ''
  const primero = nums.find((n) => porNumero.value.has(n))
  if (primero) bloque.value = Math.floor((primero - 1) / TAM)
}

function seleccionarBloque() {
  const s = new Set(props.modelValue)
  for (const fila of celdas.value)
    for (const n of fila) {
      const c = porNumero.value.get(n)
      if (c && estado(c) === 'disponible') s.add(Number(c.id))
    }
  emit('update:modelValue', s)
}
function seleccionarTodos() {
  const s = new Set(props.modelValue)
  for (const c of props.items) if (estado(c) === 'disponible') s.add(Number(c.id))
  emit('update:modelValue', s)
}
function limpiar() {
  emit('update:modelValue', new Set())
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <label class="text-xs text-ink-500">
        Bloque
        <select
          v-model="bloque"
          class="ml-1 rounded-md border border-ink-200 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
        >
          <option v-for="b in bloques" :key="b" :value="b">{{ b * TAM + 1 }} – {{ (b + 1) * TAM }}</option>
        </select>
      </label>
      <input
        v-if="!soloLectura"
        v-model="texto"
        type="text"
        placeholder="Pegar N° de preventivo: 6, 12, 14-18, 35"
        class="min-w-0 flex-1 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
        @keydown.enter.prevent="aplicarLista"
      />
      <template v-if="!soloLectura">
        <button type="button" class="rounded-md bg-seal-600 px-3 py-1.5 text-xs font-medium text-white" @click="aplicarLista">Marcar</button>
        <button type="button" class="rounded-md bg-ink-100 px-3 py-1.5 text-xs dark:bg-white/10 dark:text-ink-100" @click="seleccionarBloque">Todo el bloque</button>
        <button type="button" class="rounded-md bg-ink-100 px-3 py-1.5 text-xs dark:bg-white/10 dark:text-ink-100" @click="seleccionarTodos">Todos</button>
        <button type="button" class="rounded-md bg-ink-100 px-3 py-1.5 text-xs dark:bg-white/10 dark:text-ink-100" @click="limpiar">Limpiar</button>
      </template>
    </div>
    <p v-if="aviso" class="text-xs text-amber-600">{{ aviso }}</p>

    <div class="flex flex-wrap items-center gap-4 text-xs text-ink-500">
      <span class="flex items-center gap-1.5"><i class="h-3.5 w-3.5 rounded border border-ink-300 bg-white" /> Disponible</span>
      <span class="flex items-center gap-1.5"><i class="h-3.5 w-3.5 rounded border border-blue-600 bg-blue-200" /> Seleccionado</span>
      <span class="flex items-center gap-1.5"><i class="h-3.5 w-3.5 rounded border border-red-300 bg-red-100" /> Prestado</span>
      <span class="flex items-center gap-1.5"><i class="h-3.5 w-3.5 rounded border border-ink-100 bg-ink-50" /> Sin registro</span>
    </div>

    <div class="grid grid-cols-5 gap-1.5">
      <template v-for="(fila, i) in celdas" :key="i">
        <button
          v-for="n in fila"
          :key="n"
          type="button"
          class="h-10 rounded-sm border text-sm transition-colors"
          :class="claseCelda(n)"
          :title="titulo(n)"
          @click="porNumero.get(n) && alternar(porNumero.get(n)!)"
        >
          Prev {{ n }}
        </button>
      </template>
    </div>

    <div v-if="sinNumero.length" class="rounded-md border border-ink-100 p-2 dark:border-white/10">
      <p class="mb-1 text-xs text-ink-500">Sin N° de preventivo:</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="c in sinNumero"
          :key="c.id"
          type="button"
          class="rounded border px-2 py-1 text-xs"
          :class="modelValue.has(Number(c.id)) ? 'border-blue-600 bg-blue-200 text-blue-900' : 'border-ink-300 bg-white text-ink-700 dark:bg-ink-950 dark:text-ink-100'"
          :disabled="estado(c) !== 'disponible'"
          @click="alternar(c)"
        >
          C31 #{{ c.id }}
        </button>
      </div>
    </div>
  </div>
</template>
