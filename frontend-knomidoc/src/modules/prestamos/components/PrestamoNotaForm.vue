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
  unidadSolicitante: '',
  aQuienSePresta: '',
})

const selectedComprobantes = ref<ComprobanteC31[]>([])
const carpetas = ref<string[]>([''])

// --- Validación ---
const errors = reactive({
  numeroNotaSolicitud: '',
  unidadSolicitante: '',
  aQuienSePresta: '',
  items: '',
})
const touched = reactive({
  numeroNotaSolicitud: false,
  unidadSolicitante: false,
  aQuienSePresta: false,
})

const rules = {
  numeroNotaSolicitud: [required('El N° de nota de solicitud es obligatorio'), maxLength(50)],
  unidadSolicitante: [required('La unidad solicitante es obligatoria'), maxLength(100)],
  aQuienSePresta: [required('Indica quién recibe el préstamo')],
}

function validateField(field: keyof typeof rules) {
  errors[field] = runValidators(form[field], rules[field]) ?? ''
}

function validateItems() {
  const carpetasValidas = carpetas.value.filter((c) => c.trim() !== '')
  errors.items =
    selectedComprobantes.value.length === 0 && carpetasValidas.length === 0
      ? 'Debe añadir al menos un comprobante o una carpeta completa al préstamo'
      : ''
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
    !errors.unidadSolicitante &&
    !errors.aQuienSePresta &&
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

// --- Carpetas completas: lista libre, sin límite ---
function addCarpeta() {
  carpetas.value.push('')
}

function removeCarpeta(index: number) {
  if (carpetas.value.length > 1) carpetas.value.splice(index, 1)
  validateItems()
}

function handleSubmit() {
  if (!validateAll()) return

  const items: PrestamoNotaCreatePayload['items'] = [
    ...selectedComprobantes.value.map((c) => ({ comprobanteId: c.id })),
    ...carpetas.value.filter((c) => c.trim() !== '').map((carpetaId) => ({ carpetaId })),
  ]

  emit('submit', { ...form, items })
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
        v-model="form.unidadSolicitante"
        label="Unidad solicitante"
        placeholder="Ej: Auditoría Interna"
        required
        :error="touched.unidadSolicitante ? errors.unidadSolicitante : ''"
        @blur="onBlur('unidadSolicitante')"
      />
      <BaseInput
        v-model="form.aQuienSePresta"
        label="Responsable que recibe"
        required
        :error="touched.aQuienSePresta ? errors.aQuienSePresta : ''"
        @blur="onBlur('aQuienSePresta')"
      />
    </div>

    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800">
        Comprobantes C31 (búsqueda y selección)
      </h3>
      <ComprobanteC31Picker :exclude-ids="excludeIds" @select="addComprobante" />
      <div class="mt-3">
        <ComprobantesC31SelectedTable :items="selectedComprobantes" @remove="removeComprobante" />
      </div>
    </section>

    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800">Carpetas completas (opcional)</h3>
      <div v-for="(_, i) in carpetas" :key="i" class="mb-2 flex gap-2">
        <BaseInput v-model="carpetas[i]" placeholder="Código de carpeta completa" class="flex-1" />
        <BaseButton variant="ghost" size="sm" type="button" @click="removeCarpeta(i)">✕</BaseButton>
      </div>
      <BaseButton variant="secondary" size="sm" type="button" @click="addCarpeta">
        + Agregar carpeta
      </BaseButton>
    </section>

    <p v-if="errors.items" class="text-xs text-red-600">{{ errors.items }}</p>

    <BaseButton type="submit" :loading="saving">Registrar préstamo en lote</BaseButton>
  </form>
</template>
