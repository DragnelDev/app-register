<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ComprobanteC31Picker from '@/components/shared/ComprobanteC31Picker.vue'
import ComprobantesC31SelectedTable from '@/components/shared/ComprobantesC31SelectedTable.vue'
import { required, maxLength, runValidators } from '@/utils/validators'
import type { PrestamoNotaCreatePayload } from '@/types/prestamos.types'
import type { ComprobanteC31 } from '@/types/c31.types'

defineProps<{ saving?: boolean }>()
const emit = defineEmits<{ submit: [payload: PrestamoNotaCreatePayload] }>()

const form = reactive({
  numeroNotaSolicitud: '',
  institucionSolicitante: '',
  funcionarioResponsable: '',
  fechaPrestamo: new Date().toISOString().slice(0, 10),
  fechaDevolucionEstimada: '',
  observaciones: '',
})

const selectedComprobantes = ref<ComprobanteC31[]>([])

// --- Validación ---
const errors = reactive({
  numeroNotaSolicitud: '',
  institucionSolicitante: '',
  funcionarioResponsable: '',
  items: '',
})
const touched = reactive({
  numeroNotaSolicitud: false,
  institucionSolicitante: false,
  funcionarioResponsable: false,
})

const rules = {
  numeroNotaSolicitud: [required('El N° de nota de solicitud es obligatorio'), maxLength(50)],
  institucionSolicitante: [required('La institución solicitante es obligatoria'), maxLength(100)],
  funcionarioResponsable: [required('Indica el funcionario responsable')],
}

function validateField(field: keyof typeof rules) {
  errors[field] = runValidators(form[field], rules[field]) ?? ''
}

function validateItems() {
  errors.items =
    selectedComprobantes.value.length === 0 ? 'Debe añadir al menos un comprobante al préstamo' : ''
}

function onBlur(field: keyof typeof rules) {
  touched[field] = true
  validateField(field)
}

function validateAll(): boolean {
  ;(Object.keys(rules) as (keyof typeof rules)[]).forEach((field) => {
    touched[field] = true
    validateField(field)
  })
  validateItems()
  return (
    !errors.numeroNotaSolicitud &&
    !errors.institucionSolicitante &&
    !errors.funcionarioResponsable &&
    !errors.items
  )
}

// --- Comprobantes: buscar, seleccionar y añadir (sin límite) ---
const excludeIds = computed(() => selectedComprobantes.value.map((c) => c.id))

function addComprobante(comprobante: ComprobanteC31) {
  selectedComprobantes.value.push(comprobante)
  validateItems()
}

function removeComprobante(id: string) {
  selectedComprobantes.value = selectedComprobantes.value.filter((c) => c.id !== id)
  validateItems()
}

function handleSubmit() {
  if (!validateAll()) return

  emit('submit', {
    numeroNotaSolicitud: form.numeroNotaSolicitud,
    institucionSolicitante: form.institucionSolicitante,
    funcionarioResponsable: form.funcionarioResponsable,
    fechaPrestamo: form.fechaPrestamo || undefined,
    fechaDevolucionEstimada: form.fechaDevolucionEstimada || undefined,
    observaciones: form.observaciones || undefined,
    comprobanteIds: selectedComprobantes.value.map((c) => c.id),
  })
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        v-model="form.numeroNotaSolicitud"
        label="N° de nota de solicitud"
        placeholder="Ej: NOTA-AUD-045/2026"
        required
        :error="touched.numeroNotaSolicitud ? errors.numeroNotaSolicitud : ''"
        @blur="onBlur('numeroNotaSolicitud')"
      />
      <BaseInput
        v-model="form.institucionSolicitante"
        label="Institución solicitante"
        placeholder="Ej: Auditoría Interna"
        required
        :error="touched.institucionSolicitante ? errors.institucionSolicitante : ''"
        @blur="onBlur('institucionSolicitante')"
      />
      <BaseInput
        v-model="form.funcionarioResponsable"
        label="Funcionario responsable que recibe"
        required
        :error="touched.funcionarioResponsable ? errors.funcionarioResponsable : ''"
        @blur="onBlur('funcionarioResponsable')"
      />
      <BaseInput v-model="form.fechaPrestamo" type="date" label="Fecha de préstamo" />
      <BaseInput
        v-model="form.fechaDevolucionEstimada"
        type="date"
        label="Fecha de devolución estimada (opcional)"
      />
    </div>

    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800">
        Comprobantes C31 a prestar (búsqueda y selección)
      </h3>
      <ComprobanteC31Picker :exclude-ids="excludeIds" solo-disponibles @select="addComprobante" />
      <div class="mt-3">
        <ComprobantesC31SelectedTable :items="selectedComprobantes" @remove="removeComprobante" />
      </div>
      <p v-if="errors.items" class="mt-1 text-xs text-red-600">{{ errors.items }}</p>
    </section>

    <BaseInput v-model="form.observaciones" label="Observaciones (opcional)" />

    <BaseButton type="submit" :loading="saving">Registrar préstamo</BaseButton>
  </form>
</template>
