<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import MatrizPreventivos, { type EstadoCelda } from '@/components/shared/MatrizPreventivos.vue'
import { c31Service } from '@/services/c31.service'
import { useGestionStore } from '@/stores/gestion.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { ComprobanteC31 } from '@/types/c31.types'

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
      <MatrizPreventivos v-else v-model="seleccion" :items="items" :estado-de="estadoDe" />
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
