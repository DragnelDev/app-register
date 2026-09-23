<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ComprobanteC31DraftForm from './ComprobanteC31DraftForm.vue'
import ComprobantesC31SelectedTable from '@/components/shared/ComprobantesC31SelectedTable.vue'
import {
  required,
  maxLength,
  isValidDate,
  dateNotInFuture,
  runValidators,
} from '@/utils/validators'
import type { ActaEntrega, ActaEntregaCreatePayload } from '@/types/actas-entrega.types'
import type { ComprobanteC31FormPayload } from '@/types/c31.types'

const props = defineProps<{
  modelValue: boolean
  acta?: ActaEntrega | null
  saving?: boolean
  /** Mensaje de error proveniente del backend al intentar guardar (lo controla el padre) */
  serverError?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** payload del encabezado del acta + los comprobantes NUEVOS a crear y vincular a esta acta */
  save: [payload: ActaEntregaCreatePayload, comprobantesNuevos: ComprobanteC31FormPayload[]]
}>()

const form = reactive<ActaEntregaCreatePayload>({
  numeroActa: '',
  unidadEmisora: 'Tesorería',
  responsableEntrega: '',
  responsableRecepcion: '',
  fechaRecepcion: '',
  observaciones: '',
})

/** Comprobantes que el usuario ya fue añadiendo en esta sesión de edición (aún no guardados) */
const comprobantesNuevos = ref<ComprobanteC31FormPayload[]>([])

// --- Validación del encabezado ---
const errors = reactive<
  Record<
    | 'numeroActa'
    | 'responsableEntrega'
    | 'responsableRecepcion'
    | 'fechaRecepcion'
    | 'comprobantes',
    string
  >
>({
  numeroActa: '',
  responsableEntrega: '',
  responsableRecepcion: '',
  fechaRecepcion: '',
  comprobantes: '',
})
const touched = reactive({
  numeroActa: false,
  responsableEntrega: false,
  responsableRecepcion: false,
  fechaRecepcion: false,
})

const rules = {
  numeroActa: [required('El N° de acta es obligatorio'), maxLength(50)],
  responsableEntrega: [required('El responsable de entrega es obligatorio'), maxLength(100)],
  responsableRecepcion: [required('El responsable de recepción es obligatorio'), maxLength(100)],
  fechaRecepcion: [
    required('La fecha de recepción es obligatoria'),
    isValidDate(),
    dateNotInFuture('La fecha de recepción no puede ser una fecha futura'),
  ],
}

function validateField(field: keyof typeof rules) {
  errors[field] = runValidators(form[field] as string, rules[field]) ?? ''
}

const comprobantesYaGuardados = computed(() => props.acta?.comprobantesC31 ?? [])

function validateComprobantes() {
  const total = comprobantesYaGuardados.value.length + comprobantesNuevos.value.length
  errors.comprobantes = total === 0 ? 'Debe añadir al menos un comprobante C31 al acta' : ''
}

function validateAll(): boolean {
  ;(Object.keys(rules) as (keyof typeof rules)[]).forEach((field) => {
    touched[field] = true
    validateField(field)
  })
  validateComprobantes()
  return (
    !errors.numeroActa &&
    !errors.responsableEntrega &&
    !errors.responsableRecepcion &&
    !errors.fechaRecepcion &&
    !errors.comprobantes
  )
}

function onBlur(field: keyof typeof rules) {
  touched[field] = true
  validateField(field)
}

watch(
  () => form.numeroActa,
  () => touched.numeroActa && validateField('numeroActa'),
)
watch(
  () => form.responsableEntrega,
  () => touched.responsableEntrega && validateField('responsableEntrega'),
)
watch(
  () => form.responsableRecepcion,
  () => touched.responsableRecepcion && validateField('responsableRecepcion'),
)
watch(
  () => form.fechaRecepcion,
  () => touched.fechaRecepcion && validateField('fechaRecepcion'),
)
watch(comprobantesNuevos, () => validateComprobantes(), { deep: true })

// --- Carga de datos al abrir (crear o editar) ---
watch(
  () => props.acta,
  (acta) => {
    form.numeroActa = acta?.numeroActa ?? ''
    form.unidadEmisora = acta?.unidadEmisora ?? 'Tesorería'
    form.responsableEntrega = acta?.responsableEntrega ?? ''
    form.responsableRecepcion = acta?.responsableRecepcion ?? ''
    form.fechaRecepcion = acta?.fechaRecepcion ? acta.fechaRecepcion.slice(0, 10) : ''
    form.observaciones = acta?.observaciones ?? ''
    errors.numeroActa = ''
    errors.responsableEntrega = ''
    errors.responsableRecepcion = ''
    errors.fechaRecepcion = ''
    errors.comprobantes = ''
    touched.numeroActa = false
    touched.responsableEntrega = false
    touched.responsableRecepcion = false
    touched.fechaRecepcion = false
    comprobantesNuevos.value = []
  },
  { immediate: true },
)

function addComprobante(payload: ComprobanteC31FormPayload) {
  comprobantesNuevos.value.push(payload)
}

function removeComprobante(index: number) {
  comprobantesNuevos.value.splice(index, 1)
}

function joinValues(values: string[]) {
  return values.length > 0 ? values.join(', ') : '—'
}

function formatMonto(monto: number) {
  return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2 }).format(monto)
}

function handleSubmit() {
  if (!validateAll()) return
  emit('save', { ...form }, comprobantesNuevos.value)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="acta ? 'Editar acta de entrega' : 'Registrar acta de entrega'"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="acta-entrega-form" class="space-y-6" @submit.prevent="handleSubmit">
      <p
        v-if="serverError"
        class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40"
      >
        {{ serverError }}
      </p>

      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          v-model="form.numeroActa"
          label="N° de acta"
          placeholder="AE-2026-001"
          required
          :error="touched.numeroActa ? errors.numeroActa : ''"
          @blur="onBlur('numeroActa')"
        />
        <BaseInput v-model="form.unidadEmisora" label="Unidad emisora" placeholder="Tesorería" />
        <BaseInput
          v-model="form.responsableEntrega"
          label="Responsable de entrega"
          required
          :error="touched.responsableEntrega ? errors.responsableEntrega : ''"
          @blur="onBlur('responsableEntrega')"
        />
        <BaseInput
          v-model="form.responsableRecepcion"
          label="Responsable de recepción"
          required
          :error="touched.responsableRecepcion ? errors.responsableRecepcion : ''"
          @blur="onBlur('responsableRecepcion')"
        />
        <BaseInput
          v-model="form.fechaRecepcion"
          type="date"
          label="Fecha de recepción"
          required
          :error="touched.fechaRecepcion ? errors.fechaRecepcion : ''"
          @blur="onBlur('fechaRecepcion')"
        />
        <BaseInput v-model="form.observaciones" label="Observaciones (opcional)" />
      </section>

      <section v-if="comprobantesYaGuardados.length > 0">
        <h3 class="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
          Comprobantes ya registrados en esta acta
        </h3>
        <ComprobantesC31SelectedTable :items="comprobantesYaGuardados" readonly />
        <p class="mt-1 text-xs text-ink-400 dark:text-ink-500">
          Para completar o corregir datos de un comprobante ya guardado, hazlo desde el módulo de
          Comprobantes C31.
        </p>
      </section>

      <section>
        <h3 class="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
          Añadir comprobantes C31 al acta
        </h3>
        <p class="mb-3 text-xs text-ink-400 dark:text-ink-500">
          Cada fila que añadas se registra como un comprobante C31 nuevo, vinculado a esta acta.
          Cada fila es de un solo tipo (preventivo o devengado), pero puedes agregar más de un
          número por fila (ej. "2 en 1"), varios beneficiarios y cheques opcionales. No hay límite
          de comprobantes por acta.
        </p>

        <ComprobanteC31DraftForm :fecha-sugerida="form.fechaRecepcion" @add="addComprobante" />

        <div
          v-if="comprobantesNuevos.length > 0"
          class="mt-4 overflow-hidden rounded-md border border-ink-100 dark:border-white/10"
        >
          <table class="w-full border-collapse text-sm">
            <thead
              class="border-b border-ink-100 bg-ink-50/60 dark:border-white/10 dark:bg-ink-950/80"
            >
              <tr>
                <th class="table-header-cell">N° Prev</th>
                <th class="table-header-cell">N° Dev</th>
                <th class="table-header-cell">Beneficiario</th>
                <th class="table-header-cell text-right">Monto (Bs)</th>
                <th class="table-header-cell text-right">Quitar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100 dark:divide-white/10">
              <tr v-for="(comprobante, i) in comprobantesNuevos" :key="i" class="dark:bg-ink-950">
                <td class="table-cell">{{ joinValues(comprobante.preventivos) }}</td>
                <td class="table-cell">{{ joinValues(comprobante.devengados) }}</td>
                <td class="table-cell">{{ joinValues(comprobante.beneficiarios) }}</td>
                <td class="table-cell text-right">{{ formatMonto(comprobante.montoTotal) }}</td>
                <td class="table-cell text-right">
                  <BaseButton variant="ghost" size="sm" type="button" @click="removeComprobante(i)">
                    ✕
                  </BaseButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="errors.comprobantes" class="mt-1 text-xs text-red-600">
          {{ errors.comprobantes }}
        </p>
      </section>
    </form>

    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)"
        >Cancelar</BaseButton
      >
      <BaseButton type="submit" form="acta-entrega-form" :loading="saving">Guardar</BaseButton>
    </template>
  </BaseModal>
</template>
