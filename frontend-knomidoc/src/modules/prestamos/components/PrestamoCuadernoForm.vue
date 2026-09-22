<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ComprobanteC31Picker from '@/components/shared/ComprobanteC31Picker.vue'
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
  metodoVerificacion: 'FIRMA_MANUAL' as 'FIRMA_MANUAL' | 'HUELLA_DIGITAL',
  evidenciaVerificacionUrl: '',
  observaciones: '',
})

const comprobanteSeleccionado = ref<ComprobanteC31 | null>(null)
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
  validateComprobante()
  return !errors.solicitanteId && !errors.areaUnidad && !errors.comprobante
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
    solicitanteId: form.solicitanteId,
    areaUnidad: form.areaUnidad,
    fechaHoraSalida: new Date(form.fechaHoraSalida).toISOString(),
    metodoVerificacion: form.metodoVerificacion,
    evidenciaVerificacionUrl: form.evidenciaVerificacionUrl || undefined,
    observaciones: form.observaciones || undefined,
  })

  comprobanteSeleccionado.value = null
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
      <label class="mb-1.5 block text-sm font-medium text-ink-700">
        Comprobante C31 <span class="text-seal-600">*</span>
      </label>
      <ComprobanteC31Picker
        v-if="!comprobanteSeleccionado"
        solo-disponibles
        @select="selectComprobante"
      />
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
