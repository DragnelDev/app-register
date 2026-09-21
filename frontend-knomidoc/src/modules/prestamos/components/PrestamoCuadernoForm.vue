<script setup lang="ts">
import { reactive, ref } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ComprobanteC31Picker from '@/components/shared/ComprobanteC31Picker.vue'
import { required, runValidators } from '@/utils/validators'
import type { PrestamoCuadernoCreatePayload } from '@/types/prestamos.types'
import type { ComprobanteC31 } from '@/types/c31.types'

defineProps<{ saving?: boolean }>()
const emit = defineEmits<{ submit: [payload: PrestamoCuadernoCreatePayload] }>()

const currentYear = new Date().getFullYear()

const form = reactive({
  gestion: currentYear,
  quienRemite: '',
  aQuienSePresta: '',
})

const comprobanteSeleccionado = ref<ComprobanteC31 | null>(null)

// --- Validación ---
const errors = reactive({
  comprobante: '',
  gestion: '',
  quienRemite: '',
  aQuienSePresta: '',
})
const touched = reactive({ gestion: false, quienRemite: false, aQuienSePresta: false })

const rules = {
  quienRemite: [required('Indica quién remite el comprobante')],
  aQuienSePresta: [required('Indica a quién se presta')],
}

function validateField(field: keyof typeof rules) {
  errors[field] = runValidators(form[field], rules[field]) ?? ''
}

function validateGestion() {
  if (!form.gestion) {
    errors.gestion = 'La gestión (año) es obligatoria'
  } else if (form.gestion < 2000 || form.gestion > currentYear + 1) {
    errors.gestion = `Ingresa un año de gestión válido (2000–${currentYear + 1})`
  } else {
    errors.gestion = ''
  }
}

function validateComprobante() {
  errors.comprobante = comprobanteSeleccionado.value ? '' : 'Debes seleccionar un comprobante C31'
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
  touched.gestion = true
  validateGestion()
  validateComprobante()
  return !errors.quienRemite && !errors.aQuienSePresta && !errors.gestion && !errors.comprobante
}

function selectComprobante(comprobante: ComprobanteC31) {
  comprobanteSeleccionado.value = comprobante
  validateComprobante()
}

function clearComprobante() {
  comprobanteSeleccionado.value = null
}

function handleSubmit() {
  if (!validateAll()) return

  emit('submit', {
    comprobanteId: comprobanteSeleccionado.value!.id,
    gestion: form.gestion,
    quienRemite: form.quienRemite,
    aQuienSePresta: form.aQuienSePresta,
  })

  comprobanteSeleccionado.value = null
  form.quienRemite = ''
  form.aQuienSePresta = ''
  touched.quienRemite = false
  touched.aQuienSePresta = false
}
</script>

<template>
  <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="handleSubmit">
    <div class="sm:col-span-2">
      <label class="mb-1.5 block text-sm font-medium text-ink-700">
        Comprobante C31 <span class="text-seal-600">*</span>
      </label>
      <ComprobanteC31Picker v-if="!comprobanteSeleccionado" @select="selectComprobante" />
      <div
        v-else
        class="flex items-center justify-between rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
      >
        <span>
          Comprobante N°
          {{
            comprobanteSeleccionado.numeroComprobante ??
            comprobanteSeleccionado.numeroFolio ??
            comprobanteSeleccionado.id
          }}
          — {{ comprobanteSeleccionado.descripcion }}
        </span>
        <BaseButton variant="ghost" size="sm" type="button" @click="clearComprobante"
          >Cambiar</BaseButton
        >
      </div>
      <p v-if="errors.comprobante" class="mt-1 text-xs text-red-600">{{ errors.comprobante }}</p>
    </div>

    <BaseInput
      v-model.number="form.gestion"
      type="number"
      label="Gestión (año)"
      required
      :error="touched.gestion ? errors.gestion : ''"
      @blur="
        () => {
          touched.gestion = true
          validateGestion()
        }
      "
    />
    <BaseInput
      v-model="form.quienRemite"
      label="Quién remite (funcionario)"
      required
      :error="touched.quienRemite ? errors.quienRemite : ''"
      @blur="onBlur('quienRemite')"
    />
    <BaseInput
      v-model="form.aQuienSePresta"
      label="A quién se presta (funcionario/oficina)"
      required
      :error="touched.aQuienSePresta ? errors.aQuienSePresta : ''"
      @blur="onBlur('aQuienSePresta')"
    />

    <div class="sm:col-span-2">
      <BaseButton type="submit" :loading="saving">Registrar préstamo</BaseButton>
    </div>
  </form>
</template>
