<script setup lang="ts">
/**
 * Autocompletado reutilizable del directorio de funcionarios (solo activos).
 * Busca por CI o nombre. v-model = id del funcionario; `select` entrega el
 * registro completo (para autocompletar la unidad, el cargo, etc.).
 */
import { onBeforeUnmount, ref, useId, watch } from 'vue'
import { funcionariosService } from '@/services/funcionarios.service'
import { nombreFuncionario, type Funcionario } from '@/types/funcionarios.types'

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    label?: string
    required?: boolean
    error?: string
    disabled?: boolean
    placeholder?: string
    /** Funcionario ya elegido (al editar), para mostrar su nombre sin consultar. */
    inicial?: Funcionario | null
  }>(),
  {
    label: '',
    required: false,
    error: '',
    disabled: false,
    placeholder: 'Buscar por CI o nombre…',
    inicial: null,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  select: [funcionario: Funcionario | null]
  blur: []
}>()

const id = useId()
const seleccionado = ref<Funcionario | null>(props.inicial)
const texto = ref(props.inicial ? nombreFuncionario(props.inicial) : '')
const opciones = ref<Funcionario[]>([])
const abierto = ref(false)
const cargando = ref(false)
const indiceActivo = ref(-1)
let temporizador: ReturnType<typeof setTimeout> | undefined
let consultaVigente = 0

async function buscar(termino: string) {
  const mia = ++consultaVigente
  cargando.value = true
  try {
    const res = await funcionariosService.list({
      search: termino.trim() || undefined,
      estado: 'ACTIVO',
      pageSize: 8,
    })
    if (mia === consultaVigente) opciones.value = res.data
  } catch {
    if (mia === consultaVigente) opciones.value = []
  } finally {
    if (mia === consultaVigente) cargando.value = false
  }
}

function alEscribir() {
  // Al editar el texto se invalida la selección anterior
  if (seleccionado.value) {
    seleccionado.value = null
    emit('update:modelValue', null)
    emit('select', null)
  }
  abierto.value = true
  indiceActivo.value = -1
  clearTimeout(temporizador)
  temporizador = setTimeout(() => buscar(texto.value), 300)
}

function alEnfocar() {
  if (props.disabled) return
  abierto.value = true
  if (!opciones.value.length) buscar(texto.value)
}

function elegir(f: Funcionario) {
  seleccionado.value = f
  texto.value = nombreFuncionario(f)
  abierto.value = false
  emit('update:modelValue', f.id)
  emit('select', f)
}

function limpiar() {
  seleccionado.value = null
  texto.value = ''
  emit('update:modelValue', null)
  emit('select', null)
}

function alSalir() {
  // Pequeña espera para que el clic en una opción alcance a registrarse
  setTimeout(() => {
    abierto.value = false
    emit('blur')
  }, 150)
}

function alTeclear(e: KeyboardEvent) {
  if (!abierto.value && e.key === 'ArrowDown') {
    abierto.value = true
    return
  }
  if (e.key === 'ArrowDown') {
    indiceActivo.value = Math.min(indiceActivo.value + 1, opciones.value.length - 1)
    e.preventDefault()
  } else if (e.key === 'ArrowUp') {
    indiceActivo.value = Math.max(indiceActivo.value - 1, 0)
    e.preventDefault()
  } else if (e.key === 'Enter' && abierto.value && indiceActivo.value >= 0) {
    const f = opciones.value[indiceActivo.value]
    if (f) elegir(f)
    e.preventDefault()
  } else if (e.key === 'Escape') {
    abierto.value = false
  }
}

// Si el formulario padre reinicia el valor (p. ej. tras registrar), se limpia el texto
watch(
  () => props.modelValue,
  (valor) => {
    if (valor === null && seleccionado.value) {
      seleccionado.value = null
      texto.value = ''
    }
  },
)

watch(
  () => props.inicial,
  (f) => {
    if (f && !seleccionado.value) {
      seleccionado.value = f
      texto.value = nombreFuncionario(f)
    }
  },
)

onBeforeUnmount(() => clearTimeout(temporizador))
</script>

<template>
  <div class="relative flex flex-col gap-1.5">
    <label v-if="label" :for="id" class="text-sm font-medium text-ink-700 dark:text-ink-200">
      {{ label }} <span v-if="required" class="text-seal-600">*</span>
    </label>

    <div class="relative">
      <input
        :id="id"
        v-model="texto"
        type="text"
        role="combobox"
        autocomplete="off"
        :aria-expanded="abierto"
        :aria-controls="`${id}-lista`"
        :aria-invalid="Boolean(error)"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full rounded-md border bg-white px-3 py-2 pr-8 text-sm text-ink-900 placeholder:text-ink-300 disabled:bg-ink-50 dark:bg-ink-950 dark:text-ink-100 dark:placeholder:text-ink-500"
        :class="error ? 'border-red-400' : 'border-ink-200 dark:border-white/10'"
        @input="alEscribir"
        @focus="alEnfocar"
        @blur="alSalir"
        @keydown="alTeclear"
      />
      <button
        v-if="texto && !disabled"
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
        aria-label="Quitar funcionario"
        @mousedown.prevent="limpiar"
      >
        ✕
      </button>
    </div>

    <ul
      v-if="abierto"
      :id="`${id}-lista`"
      role="listbox"
      class="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-md border border-ink-200 bg-white shadow-lg dark:border-white/10 dark:bg-ink-900"
    >
      <li v-if="cargando" class="px-3 py-2 text-xs text-ink-400">Buscando…</li>
      <li v-else-if="!opciones.length" class="px-3 py-2 text-xs text-ink-400">
        Sin resultados. Registre al funcionario en el directorio.
      </li>
      <li
        v-for="(f, i) in opciones"
        :key="f.id"
        role="option"
        :aria-selected="i === indiceActivo"
        class="cursor-pointer px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-white/5"
        :class="i === indiceActivo ? 'bg-ink-50 dark:bg-white/10' : ''"
        @mousedown.prevent="elegir(f)"
      >
        <span class="font-medium text-ink-900 dark:text-ink-100">{{ nombreFuncionario(f) }}</span>
        <span class="ml-1 text-xs text-ink-400">CI {{ f.ci }}</span>
        <span class="block text-xs text-ink-500">{{ f.cargo }} — {{ f.unidadOficina }}</span>
      </li>
    </ul>

    <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
  </div>
</template>
