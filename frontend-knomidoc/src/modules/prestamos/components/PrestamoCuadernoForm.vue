<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ComprobanteC31Picker from '@/components/shared/ComprobanteC31Picker.vue'
import ComprobantesC31SelectedTable from '@/components/shared/ComprobantesC31SelectedTable.vue'
import { usuariosService } from '@/services/usuarios.service'
import { required, runValidators } from '@/utils/validators'
import type { PrestamoCuadernoCreatePayload } from '@/types/prestamos.types'
import type { ComprobanteC31 } from '@/types/c31.types'
import type { UsuarioSolicitante } from '@/types/auth.types'

defineProps<{ saving?: boolean }>()
const emit = defineEmits<{ submit: [payload: PrestamoCuadernoCreatePayload] }>()

function nowLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const form = reactive({
  solicitanteId: '',
  areaUnidad: '',
  fechaHoraSalida: nowLocal(),
  fechaDevolucionEstimada: '',
  metodoVerificacion: 'FIRMA_MANUAL' as 'FIRMA_MANUAL' | 'HUELLA_DIGITAL',
  evidenciaVerificacionUrl: '',
  observaciones: '',
})

const seleccionados = ref<ComprobanteC31[]>([])
const excludeIds = computed(() => seleccionados.value.map((c) => c.id))
const solicitantes = ref<UsuarioSolicitante[]>([])

onMounted(async () => {
  solicitantes.value = await usuariosService.solicitantes()
})

// --- Validación ---
const errors = reactive({ comprobante: '', solicitanteId: '', areaUnidad: '' })
const touched = reactive({ solicitanteId: false, areaUnidad: false })

const rules = {
  solicitanteId: [required('Debes seleccionar al solicitante')],
  areaUnidad: [required('Indica el área o unidad que solicita')],
}

function validateField(field: keyof typeof rules) {
  errors[field] = runValidators(form[field], rules[field]) ?? ''
}

function validateComprobante() {
  errors.comprobante = seleccionados.value.length ? '' : 'Debes añadir al menos un comprobante C31'
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
  validateComprobante()
  return !errors.solicitanteId && !errors.areaUnidad && !errors.comprobante
}

function addComprobante(comprobante: ComprobanteC31) {
  if (seleccionados.value.some((c) => c.id === comprobante.id)) return
  seleccionados.value.push(comprobante)
  validateComprobante()
}

function removeComprobante(id: string) {
  seleccionados.value = seleccionados.value.filter((c) => c.id !== id)
}

function handleSubmit() {
  if (!validateAll()) return
  const hoy = new Date().toISOString().slice(0, 10)
  if (
    form.fechaDevolucionEstimada &&
    form.fechaDevolucionEstimada < form.fechaHoraSalida.slice(0, 10)
  ) {
    errors.comprobante = 'La devolución estimada no puede ser anterior a la salida'
    return
  }
  void hoy

  emit('submit', {
    comprobanteIds: seleccionados.value.map((c) => Number(c.id)),
    solicitanteId: form.solicitanteId,
    areaUnidad: form.areaUnidad,
    fechaHoraSalida: new Date(form.fechaHoraSalida).toISOString(),
    fechaDevolucionEstimada: form.fechaDevolucionEstimada || undefined,
    metodoVerificacion: form.metodoVerificacion,
    evidenciaVerificacionUrl: form.evidenciaVerificacionUrl || undefined,
    observaciones: form.observaciones || undefined,
  })

  seleccionados.value = []
  form.solicitanteId = ''
  form.areaUnidad = ''
  form.observaciones = ''
  touched.solicitanteId = false
  touched.areaUnidad = false
}
</script>

<template>
  <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="handleSubmit">
    <div class="sm:col-span-2">
      <label class="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
        Comprobantes C31 a prestar <span class="text-seal-600">*</span>
      </label>
      <ComprobanteC31Picker :exclude-ids="excludeIds" solo-disponibles @select="addComprobante" />
      <p class="mt-1 text-xs text-ink-400">
        Puede buscar por N° o glosa, o elegir una gestión y agregar todos los comprobantes de ese
        año.
      </p>
      <div class="mt-2">
        <ComprobantesC31SelectedTable :items="seleccionados" @remove="removeComprobante" />
      </div>
      <p v-if="errors.comprobante" class="mt-1 text-xs text-red-600">{{ errors.comprobante }}</p>
    </div>

    <div>
      <label class="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
        Solicitante <span class="text-seal-600">*</span>
      </label>
      <select
        v-model="form.solicitanteId"
        class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
        @blur="onBlur('solicitanteId')"
      >
        <option value="" disabled>Selecciona un usuario…</option>
        <option v-for="u in solicitantes" :key="u.id" :value="u.id">
          {{ u.nombreCompleto }}<span v-if="u.unidadOArea"> — {{ u.unidadOArea }}</span>
        </option>
      </select>
      <p v-if="touched.solicitanteId && errors.solicitanteId" class="mt-1 text-xs text-red-600">
        {{ errors.solicitanteId }}
      </p>
    </div>

    <BaseInput
      v-model="form.areaUnidad"
      label="Área / unidad que solicita"
      required
      :error="touched.areaUnidad ? errors.areaUnidad : ''"
      @blur="onBlur('areaUnidad')"
    />

    <BaseInput
      v-model="form.fechaHoraSalida"
      type="datetime-local"
      label="Fecha y hora de salida"
    />
    <BaseInput
      v-model="form.fechaDevolucionEstimada"
      type="date"
      label="Devolución estimada (opcional)"
    />

    <div>
      <label class="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
        Método de verificación
      </label>
      <select
        v-model="form.metodoVerificacion"
        class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
      >
        <option value="FIRMA_MANUAL">Firma manual</option>
        <option value="HUELLA_DIGITAL">Huella digital (futuro)</option>
      </select>
    </div>

    <BaseInput
      v-model="form.evidenciaVerificacionUrl"
      label="Evidencia (URL, opcional)"
      class="sm:col-span-2"
    />
    <BaseInput
      v-model="form.observaciones"
      label="Observaciones (opcional)"
      class="sm:col-span-2"
    />

    <div class="sm:col-span-2">
      <BaseButton type="submit" :loading="saving">Registrar préstamo</BaseButton>
    </div>
  </form>
</template>
