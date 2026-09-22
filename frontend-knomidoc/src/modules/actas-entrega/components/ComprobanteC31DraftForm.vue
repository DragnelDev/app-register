<script setup lang="ts">
import { reactive, ref } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { isPositiveNumber, required, isValidDate, dateNotInFuture, runValidators } from '@/utils/validators'
import type { ComprobanteC31FormPayload } from '@/types/c31.types'
import type { TipoC31 } from '@/types/common.types'

const props = defineProps<{ fechaSugerida: string }>()
const emit = defineEmits<{ add: [payload: ComprobanteC31FormPayload] }>()

// Cada fila del acta es de un solo tipo: PREVENTIVO o DEVENGADO (nunca ambos).
type TipoFila = 'PREVENTIVO' | 'DEVENGADO'

function blankDraft() {
  return {
    tipoC31: 'CON_IMPUTACION' as TipoC31,
    tipoFila: 'PREVENTIVO' as TipoFila,
    numeros: [''], // números de preventivo o devengado, según tipoFila; soporta "2 en 1"
    beneficiarios: [''],
    cheques: [] as string[],
    montoTotal: 0,
    numeroComprobante: '',
    descripcion: '',
    numeroFolio: '',
    fechaElaboracion: props.fechaSugerida,
  }
}

const draft = reactive(blankDraft())
const showDetalles = ref(false)

const errors = reactive({
  montoTotal: '',
  numeros: '',
  fechaElaboracion: '',
})

function addItem(list: string[]) {
  list.push('')
}
function removeItem(list: string[], index: number) {
  if (list.length > 1) list.splice(index, 1)
}

function validate(): boolean {
  errors.montoTotal = runValidators(draft.montoTotal, [isPositiveNumber()]) ?? ''
  errors.numeros = draft.numeros.some((n) => n.trim() !== '')
    ? ''
    : `Debe indicar al menos un N° de ${draft.tipoFila === 'PREVENTIVO' ? 'preventivo' : 'devengado'}`
  errors.fechaElaboracion =
    runValidators(draft.fechaElaboracion, [
      required('La fecha de elaboración es obligatoria'),
      isValidDate(),
      dateNotInFuture(),
    ]) ?? ''

  return !errors.montoTotal && !errors.numeros && !errors.fechaElaboracion
}

function handleAdd() {
  if (!validate()) return

  const numeros = draft.numeros.filter((n) => n.trim() !== '')

  const payload: ComprobanteC31FormPayload = {
    tipoC31: draft.tipoC31,
    montoTotal: draft.montoTotal,
    fechaElaboracion: draft.fechaElaboracion,
    descripcion:
      draft.descripcion.trim() ||
      'Comprobante registrado desde acta de entrega (completar descripción)',
    numeroComprobante: draft.numeroComprobante.trim() || undefined,
    numeroFolio: draft.numeroFolio.trim() || undefined,
    // La ubicación física se asigna después, en otro momento; no se pide aquí.
    ubicacionFisica: undefined,
    preventivos: draft.tipoFila === 'PREVENTIVO' ? numeros : [],
    devengados: draft.tipoFila === 'DEVENGADO' ? numeros : [],
    beneficiarios: draft.beneficiarios.filter((b) => b.trim() !== ''),
    cheques: draft.cheques.filter((c) => c.trim() !== ''),
  }

  emit('add', payload)

  const fresh = blankDraft()
  Object.assign(draft, fresh)
  errors.montoTotal = ''
  errors.numeros = ''
  errors.fechaElaboracion = ''
}
</script>

<template>
  <div class="space-y-4 rounded-md border border-dashed border-ink-200 p-4 dark:border-white/10">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
          Tipo de C31
        </label>
        <select
          v-model="draft.tipoC31"
          class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
        >
          <option value="CON_IMPUTACION">Con imputación</option>
          <option value="SIN_IMPUTACION">Sin imputación</option>
        </select>
      </div>

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
    </div>

    <div>
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
      step="0.01"
      label="Monto (Bs)"
      required
      :error="errors.montoTotal"
      class="max-w-xs"
    />

    <button
      type="button"
      class="text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-700 dark:text-ink-400"
      @click="showDetalles = !showDetalles"
    >
      {{ showDetalles ? 'Ocultar' : 'Completar' }} descripción, N° de comprobante, folio y cheques
      (opcional por ahora)
    </button>
    <div v-if="showDetalles" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          v-model="draft.descripcion"
          label="Descripción / glosa"
          hint="Si lo dejas vacío se completa con un texto genérico; puedes editarlo después."
        />
        <BaseInput
          v-model="draft.fechaElaboracion"
          type="date"
          label="Fecha de elaboración"
          :error="errors.fechaElaboracion"
        />
        <BaseInput v-model="draft.numeroComprobante" label="N° de comprobante (opcional)" />
        <BaseInput v-model="draft.numeroFolio" label="N° de folio (opcional)" />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
          Cheques (opcional)
        </label>
        <div v-for="(_, i) in draft.cheques" :key="i" class="mb-2 flex gap-2">
          <BaseInput v-model="draft.cheques[i]" placeholder="N° de cheque" class="flex-1" />
          <BaseButton variant="ghost" size="sm" type="button" @click="removeItem(draft.cheques, i)"
            >✕</BaseButton
          >
        </div>
        <BaseButton variant="secondary" size="sm" type="button" @click="draft.cheques.push('')">
          + Agregar cheque
        </BaseButton>
      </div>
    </div>

    <div class="flex justify-end">
      <BaseButton type="button" @click="handleAdd">+ Añadir comprobante a la acta</BaseButton>
    </div>
  </div>
</template>
