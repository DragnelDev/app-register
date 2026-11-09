<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import MatrizPreventivos, { type EstadoCelda } from '@/components/shared/MatrizPreventivos.vue'
import { c31Service } from '@/services/c31.service'
import { useGestionStore } from '@/stores/gestion.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import { rotuloC31, type ComprobanteC31 } from '@/types/c31.types'
import { ESTADO_C31_LABEL, bs } from '@/utils/estados'

/** Selección rápida de varios comprobantes de una gestión para prestarlos. */
const props = defineProps<{
  modelValue: boolean
  excludeIds?: (string | number)[]
  todos?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  confirm: [comprobantes: ComprobanteC31[]]
}>()

const gestionStore = useGestionStore()
const gestiones = ref<number[]>([])
const gestion = ref<number | ''>('')
const items = ref<ComprobanteC31[]>([])
const seleccion = ref<Set<number>>(new Set())
const cargando = ref(false)
const error = ref('')

async function cargar() {
  if (!gestion.value) {
    items.value = []
    return
  }
  cargando.value = true
  error.value = ''
  try {
    const todos: ComprobanteC31[] = []
    let page = 1
    for (;;) {
      const r = await c31Service.list({ gestion: gestion.value, page, pageSize: 500 })
      todos.push(...r.data)
      if (todos.length >= r.total || r.data.length === 0) break
      page++
    }
    items.value = todos
    seleccion.value = new Set()
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudieron cargar los comprobantes.')
  } finally {
    cargando.value = false
  }
}

watch(
  () => props.modelValue,
  async (abierto) => {
    if (!abierto) return
    if (!gestiones.value.length) gestiones.value = await c31Service.listGestiones().catch(() => [])
    if (!gestion.value) {
      const g = gestionStore.seleccionada
      gestion.value = g || gestiones.value[0] || ''
    } else await cargar()
  },
)
watch(gestion, cargar)

const excluidos = computed(() => new Set((props.excludeIds ?? []).map(String)))

function estadoDe(c: ComprobanteC31): EstadoCelda {
  if (excluidos.value.has(String(c.id))) return 'bloqueado'
  if (props.todos) return 'disponible'
  if (c.estadoFisico === 'PRESTADO') return 'prestado'
  // Solo se prestan comprobantes archivados correctamente
  if (c.estadoFisico === 'ARCHIVADO') return 'disponible'
  return 'bloqueado'
}

// ── Filtros: por estado (chips con contador), búsqueda y vista matriz/lista ──
const estadoFiltro = ref('')
const busca = ref('')
const vista = ref<'matriz' | 'lista'>('matriz')

const contadores = computed(() => {
  const m = new Map<string, number>()
  for (const c of items.value) m.set(c.estadoFisico, (m.get(c.estadoFisico) ?? 0) + 1)
  return m
})
const chips = computed(() =>
  [...contadores.value.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([valor, n]) => ({ valor, n, label: ESTADO_C31_LABEL[valor] ?? valor })),
)
const visibles = computed(() => {
  const q = busca.value.trim().toLowerCase()
  return items.value.filter((c) => {
    if (estadoFiltro.value && c.estadoFisico !== estadoFiltro.value) return false
    if (!q) return true
    return `${rotuloC31(c) ?? ''} ${c.descripcion ?? ''}`.toLowerCase().includes(q)
  })
})
const hayFiltro = computed(() => Boolean(estadoFiltro.value || busca.value.trim()))
const seleccionables = computed(() => visibles.value.filter((c) => estadoDe(c) === 'disponible'))
const noSeleccionables = computed(() => visibles.value.length - seleccionables.value.length)

function marcarVisibles() {
  const s = new Set(seleccion.value)
  for (const c of seleccionables.value) s.add(Number(c.id))
  seleccion.value = s
}
function quitarVisibles() {
  const s = new Set(seleccion.value)
  for (const c of visibles.value) s.delete(Number(c.id))
  seleccion.value = s
}
function alternar(c: ComprobanteC31) {
  if (estadoDe(c) !== 'disponible') return
  const s = new Set(seleccion.value)
  const id = Number(c.id)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  seleccion.value = s
}
function limpiarFiltros() {
  estadoFiltro.value = ''
  busca.value = ''
}
watch(
  () => props.modelValue,
  (a) => a && limpiarFiltros(),
)
function motivoBloqueo(c: ComprobanteC31) {
  const e = estadoDe(c)
  if (e === 'prestado') return 'Ya prestado'
  if (e === 'bloqueado')
    return excluidos.value.has(String(c.id))
      ? 'Ya está en la lista'
      : `No disponible (${ESTADO_C31_LABEL[c.estadoFisico] ?? c.estadoFisico})`
  return ''
}

function confirmar() {
  emit(
    'confirm',
    items.value.filter((c) => seleccion.value.has(Number(c.id))),
  )
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Selección rápida de comprobantes"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-3">
      <label class="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
        Gestión
        <select
          v-model="gestion"
          class="rounded-md border border-ink-200 bg-white px-2 py-1.5 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
        >
          <option v-for="g in gestiones" :key="g" :value="g">{{ g }}</option>
        </select>
      </label>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="cargando" class="text-sm text-ink-400">Cargando…</p>
      <template v-else>
        <div
          class="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filtrar por estado"
        >
          <button
            type="button"
            class="rounded-full border px-2.5 py-1 text-xs font-medium"
            :class="
              !estadoFiltro
                ? 'border-seal-600 bg-seal-600 text-white'
                : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-white/10 dark:text-ink-300 dark:hover:bg-white/5'
            "
            @click="estadoFiltro = ''"
          >
            Todos ({{ items.length }})
          </button>
          <button
            v-for="ch in chips"
            :key="ch.valor"
            type="button"
            class="rounded-full border px-2.5 py-1 text-xs font-medium"
            :class="
              estadoFiltro === ch.valor
                ? 'border-seal-600 bg-seal-600 text-white'
                : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-white/10 dark:text-ink-300 dark:hover:bg-white/5'
            "
            @click="estadoFiltro = estadoFiltro === ch.valor ? '' : ch.valor"
          >
            {{ ch.label }} ({{ ch.n }})
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <input
            v-model="busca"
            type="search"
            placeholder="Buscar por N° o glosa…"
            class="min-w-0 flex-1 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
          />
          <div
            class="inline-flex overflow-hidden rounded-md border border-ink-200 text-xs dark:border-white/10"
            role="tablist"
          >
            <button
              v-for="v in ['matriz', 'lista'] as const"
              :key="v"
              type="button"
              class="px-3 py-1.5"
              :class="vista === v ? 'bg-seal-600 text-white' : 'text-ink-600 dark:text-ink-300'"
              @click="vista = v"
            >
              {{ v === 'matriz' ? 'Matriz' : 'Lista' }}
            </button>
          </div>
        </div>
        <div
          class="flex flex-wrap items-center gap-2 rounded-md bg-ink-50 px-3 py-2 text-xs dark:bg-white/5"
        >
          <span class="text-ink-600 dark:text-ink-300">
            {{ hayFiltro ? 'Con este filtro:' : 'Mostrando todo:' }}
            <b>{{ visibles.length }}</b> comprobante(s), <b>{{ seleccionables.length }}</b> se
            pueden marcar
            <template v-if="noSeleccionables">· {{ noSeleccionables }} no disponibles</template>
          </span>
          <BaseButton size="sm" :disabled="!seleccionables.length" @click="marcarVisibles">
            Marcar los {{ seleccionables.length }}
          </BaseButton>
          <BaseButton
            size="sm"
            variant="secondary"
            :disabled="!seleccion.size"
            @click="quitarVisibles"
            >Quitar estos</BaseButton
          >
          <button
            v-if="hayFiltro"
            type="button"
            class="text-seal-600 hover:underline"
            @click="limpiarFiltros"
          >
            Quitar filtros
          </button>
        </div>

        <MatrizPreventivos
          v-if="vista === 'matriz'"
          v-model="seleccion"
          :items="visibles"
          :estado-de="estadoDe"
        />
        <div
          v-else
          class="max-h-96 overflow-auto rounded-md border border-ink-100 dark:border-white/10"
        >
          <table class="w-full text-sm">
            <thead
              class="sticky top-0 bg-ink-50 text-left text-xs uppercase text-ink-500 dark:bg-ink-950"
            >
              <tr>
                <th class="w-8 px-2 py-2" />
                <th class="px-2 py-2">N°</th>
                <th class="px-2 py-2">Estado</th>
                <th class="px-2 py-2">Glosa</th>
                <th class="px-2 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100 dark:divide-white/10">
              <tr v-if="!visibles.length">
                <td colspan="5" class="px-3 py-5 text-center text-ink-400">
                  Nada coincide con el filtro.
                </td>
              </tr>
              <tr
                v-for="c in visibles"
                :key="c.id"
                class="cursor-pointer"
                :class="
                  estadoDe(c) === 'disponible'
                    ? 'hover:bg-ink-50 dark:hover:bg-white/5'
                    : 'opacity-50'
                "
                :title="motivoBloqueo(c)"
                @click="alternar(c)"
              >
                <td class="px-2 py-1.5">
                  <input
                    type="checkbox"
                    :checked="seleccion.has(Number(c.id))"
                    :disabled="estadoDe(c) !== 'disponible'"
                    @click.stop="alternar(c)"
                  />
                </td>
                <td class="whitespace-nowrap px-2 py-1.5 font-mono text-xs font-semibold">
                  {{ rotuloC31(c) ?? '—' }}
                </td>
                <td class="whitespace-nowrap px-2 py-1.5 text-xs">
                  {{ ESTADO_C31_LABEL[c.estadoFisico] ?? c.estadoFisico
                  }}<span
                    v-if="motivoBloqueo(c) && estadoDe(c) === 'prestado'"
                    class="text-red-600"
                  >
                    · prestado</span
                  >
                </td>
                <td class="max-w-xs truncate px-2 py-1.5 text-xs">{{ c.descripcion }}</td>
                <td class="whitespace-nowrap px-2 py-1.5 text-right text-xs tabular-nums">
                  {{ bs(Number(c.montoTotal ?? 0)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
    <template #footer>
      <span class="mr-auto text-sm text-ink-600 dark:text-ink-300"
        >{{ seleccion.size }} seleccionado(s)</span
      >
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)"
        >Cancelar</BaseButton
      >
      <BaseButton :disabled="!seleccion.size" @click="confirmar">Agregar a la lista</BaseButton>
    </template>
  </BaseModal>
</template>
