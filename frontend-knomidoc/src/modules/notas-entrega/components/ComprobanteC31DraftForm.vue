<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CarpetaPicker from '@/components/shared/CarpetaPicker.vue'
import {
  required,
  isPositiveNumber,
  isValidDate,
  dateNotInFuture,
  runValidators,
} from '@/utils/validators'
import type { ComprobanteC31FormPayload, Carpeta } from '@/types/c31.types'
import type { TipoC31 } from '@/types/common.types'

const props = defineProps<{ fechaSugerida: string }>()
const emit = defineEmits<{ add: [payload: ComprobanteC31FormPayload] }>()

// Cada fila del acta es de un solo tipo: PREVENTIVO o DEVENGADO (nunca ambos),
// según la relación 1 a 1 estricta entre comprobantes_c31 y sus tablas hijas.
type TipoFila = 'PREVENTIVO' | 'DEVENGADO'

function blankDraft() {
  return {
    tipoFila: 'PREVENTIVO' as TipoFila,
    numeros: [''], // números de preventivo o devengado, según tipoFila; se combinan en un solo campo ("2 en 1")
    montoTotal: 0,
    fechaElaboracion: props.fechaSugerida,
    descripcion: '',
    numeroFolio: '' as string | null,
    beneficiarios: [''],
    cheques: [] as string[],
    carpetasSeleccionadas: [] as Carpeta[],
  }
}

const draft = reactive(blankDraft())
const showDetalles = ref(false)

const errors = reactive({
  montoTotal: '',
  descripcion: '',
  fechaElaboracion: '',
  numeros: '',
  carpetas: '',
})

function addItem(list: string[]) {
  list.push('')
}
function removeItem(list: string[], index: number) {
  if (list.length > 1) list.splice(index, 1)
}

const carpetaExcludeIds = computed(() => draft.carpetasSeleccionadas.map((c) => c.id))

function addCarpeta(carpeta: Carpeta) {
  if (draft.carpetasSeleccionadas.length >= 5) return
  draft.carpetasSeleccionadas.push(carpeta)
  errors.carpetas = ''
}
function removeCarpeta(id: string | number) {
  draft.carpetasSeleccionadas = draft.carpetasSeleccionadas.filter((c) => c.id !== id)
}

function validate(): boolean {
  errors.montoTotal = runValidators(draft.montoTotal, [isPositiveNumber()]) ?? ''
  errors.descripcion = ''
  errors.fechaElaboracion =
    runValidators(draft.fechaElaboracion, [
      required('La fecha de elaboración es obligatoria'),
      isValidDate(),
      dateNotInFuture(),
    ]) ?? ''

  errors.numeros = draft.numeros.some((n) => n.trim() !== '')
    ? ''
    : `Debe indicar al menos un N° de ${draft.tipoFila === 'PREVENTIVO' ? 'preventivo' : 'devengado'}`

  errors.carpetas =
    draft.carpetasSeleccionadas.length === 0
      ? 'Debe asignar al menos 1 carpeta de ubicación física'
      : ''

  return (
    !errors.montoTotal &&
    !errors.descripcion &&
    !errors.fechaElaboracion &&
    !errors.numeros &&
    !errors.carpetas
  )
}

function handleAdd() {
  if (!validate()) return

  const numeroCombinado = draft.numeros.filter((n) => n.trim() !== '').join(' / ')

  const tipoC31: TipoC31 = draft.tipoFila === 'PREVENTIVO' ? 'CON_IMPUTACION' : 'SIN_IMPUTACION'

  const payload: ComprobanteC31FormPayload = {
    tipoC31,
    montoTotal: draft.montoTotal,
    fechaElaboracion: draft.fechaElaboracion,
    descripcion:
      draft.descripcion.trim() ||
      'Comprobante registrado desde acta de entrega (completar descripción)',
    numeroFolio: draft.numeroFolio,
    numeroPreventivo: draft.tipoFila === 'PREVENTIVO' ? numeroCombinado : undefined,
    numeroDevengado: draft.tipoFila === 'DEVENGADO' ? numeroCombinado : undefined,
    beneficiarios: draft.beneficiarios.filter((b) => b.trim() !== ''),
    cheques: draft.cheques.filter((c) => c.trim() !== ''),
    carpetas: draft.carpetasSeleccionadas.map((c, i) => ({ carpetaId: c.id, numeroParte: i + 1 })),
  }

  emit('add', payload)

  const fresh = blankDraft()
  Object.assign(draft, fresh)
  errors.montoTotal = ''
  errors.descripcion = ''
  errors.fechaElaboracion = ''
  errors.numeros = ''
  errors.carpetas = ''
}
</script>

<template>
  <div class="space-y-4 rounded-md border border-dashed border-ink-200 p-4 dark:border-white/10">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
          Esta fila es de
        </label>
        <div class="flex gap-4 pt-2 text-sm text-ink-700 dark:text-ink-200">
          <label class="flex items-center gap-1.5">
            <input v-model="draft.tipoFila" type="radio" value="PREVENTIVO" />
            Preventivo
          </label>
          <label class="flex items-center gap-1.5">
            <input v-model="draft.tipoFila" type="radio" value="DEVENGADO" />
            Devengado
          </label>
        </div>
      </div>

      <div class="sm:col-span-2">
        <label class="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
          N° de {{ draft.tipoFila === 'PREVENTIVO' ? 'Preventivo' : 'Devengado' }}
          <span class="text-ink-300">(puede añadir más de uno, ej. "2 en 1")</span>
        </label>
        <div v-for="(_, i) in draft.numeros" :key="i" class="mb-2 flex gap-2">
          <BaseInput v-model="draft.numeros[i]" placeholder="Ej: 001" class="flex-1" />
          <BaseButton variant="ghost" size="sm" type="button" @click="removeItem(draft.numeros, i)"
            >✕</BaseButton
          >
        </div>
        <BaseButton variant="secondary" size="sm" type="button" @click="addItem(draft.numeros)">
          + Agregar número
        </BaseButton>
        <p v-if="errors.numeros" class="mt-1 text-xs text-red-600">{{ errors.numeros }}</p>
      </div>
    </div>

    <div>
      <label class="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
        Beneficiario <span class="text-ink-300">(puede añadir más de uno)</span>
      </label>
      <div v-for="(_, i) in draft.beneficiarios" :key="i" class="mb-2 flex gap-2">
        <BaseInput
          v-model="draft.beneficiarios[i]"
          placeholder="Nombre del beneficiario"
          class="flex-1"
        />
        <BaseButton
          variant="ghost"
          size="sm"
          type="button"
          @click="removeItem(draft.beneficiarios, i)"
          >✕</BaseButton
        >
      </div>
      <BaseButton variant="secondary" size="sm" type="button" @click="addItem(draft.beneficiarios)">
        + Agregar beneficiario
      </BaseButton>
    </div>

    <BaseInput
      v-model.number="draft.montoTotal"
      type="number"
      label="Monto (Bs)"
      required
      :error="errors.montoTotal"
      class="max-w-xs"
    />

    <div>
      <label class="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
        Carpeta física <span class="text-seal-600">*</span>
        <span class="font-normal text-ink-300">(ubicación del comprobante, hasta 5)</span>
      </label>
      <CarpetaPicker :exclude-ids="carpetaExcludeIds" @select="addCarpeta" />
      <ul v-if="draft.carpetasSeleccionadas.length > 0" class="mt-2 flex flex-wrap gap-2">
        <li
          v-for="carpeta in draft.carpetasSeleccionadas"
          :key="carpeta.id"
          class="flex items-center gap-1 rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-700 dark:bg-white/10 dark:text-ink-200"
        >
          {{ carpeta.codigoCarpeta }}
          <button
            type="button"
            class="text-ink-400 hover:text-red-600"
            @click="removeCarpeta(carpeta.id)"
          >
            ✕
          </button>
        </li>
      </ul>
      <p v-if="errors.carpetas" class="mt-1 text-xs text-red-600">{{ errors.carpetas }}</p>
    </div>

    <button
      type="button"
      class="text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-700 dark:text-ink-400"
      @click="showDetalles = !showDetalles"
    >
      {{ showDetalles ? 'Ocultar' : 'Completar' }} descripción, folio y fecha de elaboración
      (opcional por ahora)
    </button>
    <div v-if="showDetalles" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        v-model="draft.descripcion"
        label="Descripción / glosa"
        :error="errors.descripcion"
        hint="Si lo dejas vacío se completa con un texto genérico; puedes editarlo después."
      />
      <BaseInput
        v-model="draft.fechaElaboracion"
        type="date"
        label="Fecha de elaboración"
        :error="errors.fechaElaboracion"
      />
      <BaseInput v-model="draft.numeroFolio" label="N° de folio (opcional)" />
    </div>

    <div class="flex justify-end">
      <BaseButton type="button" @click="handleAdd">+ Añadir comprobante a la acta</BaseButton>
    </div>
  </div>
</template>
