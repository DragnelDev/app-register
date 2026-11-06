<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { ComprobanteC31FormPayload } from '@/types/c31.types'

/**
 * Alta mínima del comprobante: tipo, N° de preventivo/devengado, beneficiarios,
 * glosa, monto total del documento y fecha. El resto (folio, ubicación, pagos y
 * estado) se completa después desde el detalle del comprobante.
 */
const props = defineProps<{ saving?: boolean; serverError?: string }>()
const emit = defineEmits<{ submit: [payload: ComprobanteC31FormPayload] }>()

const hoy = new Date().toISOString().slice(0, 10)

const form = reactive({
  tipoC31: 'CON_IMPUTACION' as 'CON_IMPUTACION' | 'SIN_IMPUTACION',
  numero: '',
  descripcion: '',
  montoTotal: '' as string | number,
  fechaElaboracion: hoy,
})
const beneficiarios = ref<string[]>([])
const nuevoBeneficiario = ref('')
const intentado = ref(false)
const errorBeneficiario = ref('')

const etiquetaNumero = computed(() =>
  form.tipoC31 === 'CON_IMPUTACION' ? 'N° de Preventivo' : 'N° de Devengado',
)
const CODIGO = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .\/\-_]+$/

function agregarBeneficiario() {
  const nombre = nuevoBeneficiario.value.trim().replace(/\s+/g, ' ')
  errorBeneficiario.value = ''
  if (!nombre) return
  if (beneficiarios.value.some((b) => b.toUpperCase() === nombre.toUpperCase())) {
    errorBeneficiario.value = 'Ese beneficiario ya está en la lista'
    return
  }
  beneficiarios.value.push(nombre)
  nuevoBeneficiario.value = ''
}

function quitarBeneficiario(i: number) {
  beneficiarios.value.splice(i, 1)
}

// Solo el N° es obligatorio; lo demás, si se llena, debe ser válido.
const errores = computed(() => {
  const n = form.numero.trim()
  const monto = String(form.montoTotal).trim()
  const anio = form.fechaElaboracion ? Number(form.fechaElaboracion.slice(0, 4)) : null
  return {
    numero: !n
      ? `Ingrese el ${etiquetaNumero.value.toLowerCase()}`
      : n.length > 50
        ? 'Máximo 50 caracteres'
        : !CODIGO.test(n)
          ? 'Solo letras, números, espacios y . / - _'
          : '',
    beneficiarios: '',
    descripcion:
      form.descripcion.trim() && form.descripcion.trim().length < 5
        ? 'La descripción es demasiado corta'
        : form.descripcion.length > 2000
          ? 'Máximo 2000 caracteres'
          : '',
    montoTotal: !monto
      ? ''
      : !(Number(monto) > 0)
        ? 'El monto debe ser mayor a 0'
        : !/^\d+(\.\d{1,2})?$/.test(monto)
          ? 'Hasta 2 decimales'
          : Number(monto) > 999999999999.99
            ? 'El monto es demasiado grande'
            : '',
    fechaElaboracion:
      anio !== null && (anio < 2000 || anio > new Date().getFullYear() + 1)
        ? 'La fecha está fuera de un rango razonable'
        : '',
  }
})

/** Lo que falta para que el comprobante nazca "En revisión / firmado". */
const faltantes = computed(
  () =>
    [
      !(beneficiarios.value.length || nuevoBeneficiario.value.trim()) && 'beneficiarios',
      !form.descripcion.trim() && 'glosa',
      !(Number(form.montoTotal) > 0) && 'monto total',
      !form.fechaElaboracion && 'fecha',
    ].filter(Boolean) as string[],
)

function handleSubmit() {
  intentado.value = true
  // Si dejó un nombre escrito sin pulsar "Agregar", se toma como agregado
  if (nuevoBeneficiario.value.trim()) agregarBeneficiario()
  if (Object.values(errores.value).some(Boolean)) return

  const numero = form.numero.trim()
  emit('submit', {
    tipoC31: form.tipoC31,
    numeroPreventivo: form.tipoC31 === 'CON_IMPUTACION' ? numero : undefined,
    numeroDevengado: form.tipoC31 === 'SIN_IMPUTACION' ? numero : undefined,
    beneficiarios: beneficiarios.value.length ? [...beneficiarios.value] : undefined,
    descripcion: form.descripcion.trim() || undefined,
    montoTotal: Number(form.montoTotal) > 0 ? Number(form.montoTotal) : undefined,
    fechaElaboracion: form.fechaElaboracion || undefined,
  })
}

const campo =
  'w-full rounded-md border bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-seal-500 dark:bg-ink-950 dark:text-ink-100 dark:placeholder:text-ink-500'
const borde = (error: string) =>
  intentado.value && error ? 'border-red-400' : 'border-ink-200 dark:border-white/10'
const etiqueta = 'mb-1.5 block text-xs font-semibold text-ink-700 dark:text-ink-200'
</script>

<template>
  <form class="space-y-5" novalidate @submit.prevent="handleSubmit">
    <p
      v-if="serverError"
      class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
      role="alert"
    >
      {{ serverError }}
    </p>

    <p
      class="rounded-md px-3 py-2 text-xs"
      :class="
        faltantes.length
          ? 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200'
          : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200'
      "
      role="status"
    >
      <template v-if="faltantes.length">
        Con solo el N° se registra <strong>En trámite</strong>. Faltan: {{ faltantes.join(', ') }}.
        Al completarlos pasa solo a <strong>En revisión / firmado</strong>.
      </template>
      <template v-else
        >Con todos los datos el comprobante se registra como
        <strong>En revisión / firmado</strong>.</template
      >
    </p>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label for="tipo" :class="etiqueta">Tipo de C31 <span class="text-seal-500">*</span></label>
        <select id="tipo" v-model="form.tipoC31" :class="[campo, borde('')]">
          <option value="CON_IMPUTACION">Con imputación (Preventivo)</option>
          <option value="SIN_IMPUTACION">Sin imputación (Devengado)</option>
        </select>
      </div>
      <div>
        <label for="numero" :class="etiqueta">
          {{ etiquetaNumero }} <span class="text-seal-500">*</span>
        </label>
        <input
          id="numero"
          v-model="form.numero"
          type="text"
          :class="[campo, borde(errores.numero)]"
          placeholder="Ej: 1"
        />
        <p v-if="intentado && errores.numero" class="mt-1 text-xs text-red-600">
          {{ errores.numero }}
        </p>
      </div>
    </div>

    <div>
      <label for="beneficiario" :class="etiqueta"> Beneficiario(s) </label>
      <div
        class="space-y-3 rounded-lg border bg-ink-50/60 p-4 dark:bg-white/[0.03]"
        :class="borde('')"
      >
        <div class="flex gap-2">
          <input
            id="beneficiario"
            v-model="nuevoBeneficiario"
            type="text"
            :class="[campo, 'border-ink-200 dark:border-white/10']"
            placeholder="Nombre completo o razón social del beneficiario..."
            maxlength="200"
            @keydown.enter.prevent="agregarBeneficiario"
          />
          <button
            type="button"
            class="shrink-0 rounded-md bg-seal-600 px-4 py-2 text-sm font-medium text-white hover:bg-seal-700"
            @click="agregarBeneficiario"
          >
            Agregar
          </button>
        </div>
        <p v-if="errorBeneficiario" class="text-xs text-red-600">{{ errorBeneficiario }}</p>

        <ul v-if="beneficiarios.length" class="space-y-2">
          <li
            v-for="(nombre, i) in beneficiarios"
            :key="nombre"
            class="flex items-center justify-between gap-3 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950"
          >
            <span class="break-words text-ink-800 dark:text-ink-100">{{ nombre }}</span>
            <button
              type="button"
              class="shrink-0 rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
              @click="quitarBeneficiario(i)"
            >
              Eliminar
            </button>
          </li>
        </ul>
      </div>
    </div>

    <div>
      <label for="descripcion" :class="etiqueta"> Descripción / glosa del comprobante </label>
      <textarea
        id="descripcion"
        v-model="form.descripcion"
        rows="3"
        :class="[campo, borde(errores.descripcion)]"
      />
      <p v-if="intentado && errores.descripcion" class="mt-1 text-xs text-red-600">
        {{ errores.descripcion }}
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label for="monto" :class="etiqueta"> Monto total (Bs.) </label>
        <input
          id="monto"
          v-model="form.montoTotal"
          type="number"
          step="0.01"
          min="0"
          :class="[campo, borde(errores.montoTotal)]"
          placeholder="0,00"
        />
        <p v-if="intentado && errores.montoTotal" class="mt-1 text-xs text-red-600">
          {{ errores.montoTotal }}
        </p>
        <p v-else class="mt-1 text-xs text-ink-400 dark:text-ink-500">
          Total del documento (con impuestos). Los pagos a cada beneficiario se registran después.
        </p>
      </div>
      <div>
        <label for="fecha" :class="etiqueta"> Fecha de elaboración </label>
        <input
          id="fecha"
          v-model="form.fechaElaboracion"
          type="date"
          :class="[campo, borde(errores.fechaElaboracion)]"
        />
        <p v-if="intentado && errores.fechaElaboracion" class="mt-1 text-xs text-red-600">
          {{ errores.fechaElaboracion }}
        </p>
      </div>
    </div>

    <button
      type="submit"
      :disabled="props.saving"
      class="w-full rounded-md bg-seal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-seal-700 disabled:opacity-60"
    >
      {{ props.saving ? 'Registrando…' : 'Registrar comprobante' }}
    </button>
  </form>
</template>
