<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ComprobanteC31Picker from '@/components/shared/ComprobanteC31Picker.vue'
import ComprobantesC31SelectedTable from '@/components/shared/ComprobantesC31SelectedTable.vue'
import FuncionarioSelect from '@/components/shared/FuncionarioSelect.vue'
import HuellaPanel from '@/components/shared/HuellaPanel.vue'
import { required, runValidators } from '@/utils/validators'
import type { PrestamoCuadernoCreatePayload } from '@/types/prestamos.types'
import type { ComprobanteC31 } from '@/types/c31.types'
import type { Funcionario } from '@/types/funcionarios.types'

defineProps<{ saving?: boolean }>()
const emit = defineEmits<{ submit: [payload: PrestamoCuadernoCreatePayload] }>()

function nowLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const form = reactive({
  funcionarioId: null as number | null,
  areaUnidad: '',
  fechaHoraSalida: nowLocal(),
  fechaDevolucionEstimada: '',
  metodoVerificacion: 'FIRMA_MANUAL' as 'FIRMA_MANUAL' | 'HUELLA_DIGITAL',
  evidenciaVerificacionUrl: '',
  observaciones: '',
})

const seleccionados = ref<ComprobanteC31[]>([])
const excludeIds = computed(() => seleccionados.value.map((c) => c.id))

// La unidad se propone con la del funcionario (editable)
const funcionarioElegido = ref<Funcionario | null>(null)
const huellaVerificada = ref(false)
const errorHuella = ref('')
function alElegirFuncionario(f: Funcionario | null) {
  funcionarioElegido.value = f
  huellaVerificada.value = false
  if (f) form.areaUnidad = f.unidadOficina
}

// --- Validación ---
const errors = reactive({ comprobante: '', funcionarioId: '', areaUnidad: '' })
const touched = reactive({ funcionarioId: false, areaUnidad: false })

const reglaArea = [required('Indica el área o unidad que solicita')]

function validateField(field: 'funcionarioId' | 'areaUnidad') {
  if (field === 'funcionarioId')
    errors.funcionarioId = form.funcionarioId ? '' : 'Debes seleccionar al funcionario solicitante'
  else errors.areaUnidad = runValidators(form.areaUnidad, reglaArea) ?? ''
}

function validateComprobante() {
  errors.comprobante = seleccionados.value.length ? '' : 'Debes añadir al menos un comprobante C31'
}

function onBlur(field: 'funcionarioId' | 'areaUnidad') {
  touched[field] = true
  validateField(field)
}

function validateAll(): boolean {
  ;(['funcionarioId', 'areaUnidad'] as const).forEach((field) => {
    touched[field] = true
    validateField(field)
  })
  validateComprobante()
  errorHuella.value = ''
  if (form.metodoVerificacion === 'HUELLA_DIGITAL') {
    if (!funcionarioElegido.value?.huellaRegistradaEn)
      errorHuella.value = 'El funcionario no tiene huella registrada (se enrola en Funcionarios)'
    else if (!huellaVerificada.value) errorHuella.value = 'Verifique la huella del funcionario antes de registrar'
  }
  return !errorHuella.value && !errors.funcionarioId && !errors.areaUnidad && !errors.comprobante
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
  if (
    form.fechaDevolucionEstimada &&
    form.fechaDevolucionEstimada < form.fechaHoraSalida.slice(0, 10)
  ) {
    errors.comprobante = 'La devolución estimada no puede ser anterior a la salida'
    return
  }

  emit('submit', {
    comprobanteIds: seleccionados.value.map((c) => Number(c.id)),
    funcionarioId: form.funcionarioId as number,
    areaUnidad: form.areaUnidad,
    fechaHoraSalida: new Date(form.fechaHoraSalida).toISOString(),
    fechaDevolucionEstimada: form.fechaDevolucionEstimada || undefined,
    metodoVerificacion: form.metodoVerificacion,
    evidenciaVerificacionUrl: form.evidenciaVerificacionUrl || undefined,
    observaciones: form.observaciones || undefined,
  })

  seleccionados.value = []
  form.funcionarioId = null
  form.areaUnidad = ''
  form.observaciones = ''
  funcionarioElegido.value = null
  huellaVerificada.value = false
  touched.funcionarioId = false
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

    <FuncionarioSelect
      v-model="form.funcionarioId"
      label="Funcionario solicitante"
      required
      :error="touched.funcionarioId ? errors.funcionarioId : ''"
      @select="alElegirFuncionario"
      @blur="onBlur('funcionarioId')"
    />

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
        <option value="HUELLA_DIGITAL">Huella digital (lector demo)</option>
      </select>
    </div>

    <div v-if="form.metodoVerificacion === 'HUELLA_DIGITAL'" class="sm:col-span-2">
      <p v-if="!funcionarioElegido" class="text-xs text-ink-500 dark:text-ink-400">
        Seleccione primero al funcionario para verificar su huella.
      </p>
      <p
        v-else-if="!funcionarioElegido.huellaRegistradaEn"
        class="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-400/10 dark:text-amber-200"
      >
        Este funcionario aún no tiene huella registrada. Enrólela en Funcionarios → Editar.
      </p>
      <HuellaPanel
        v-else
        :key="funcionarioElegido.id"
        :funcionario-id="funcionarioElegido.id"
        modo="verificar"
        tiene-huella
        @verificado="huellaVerificada = true"
        @fallo="huellaVerificada = false"
      />
      <p v-if="errorHuella" class="mt-1 text-xs text-red-600">{{ errorHuella }}</p>
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
