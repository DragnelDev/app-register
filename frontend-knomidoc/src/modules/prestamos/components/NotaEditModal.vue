<script setup lang="ts">
/**
 * Etapa de edición y previsualización de una nota en BORRADOR: se pueden
 * cambiar la referencia, el destinatario, las observaciones, la fecha estimada
 * de devolución y el funcionario antes de aprobarla.
 */
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FuncionarioSelect from '@/components/shared/FuncionarioSelect.vue'
import { prestamosService } from '@/services/prestamos.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import { nombreFuncionario, type Funcionario } from '@/types/funcionarios.types'
import type { PrestamoNota } from '@/types/prestamos.types'

const props = defineProps<{ modelValue: boolean; filas: PrestamoNota[] }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** La nota cambió (guardada o aprobada): recargar el listado */
  cambio: []
}>()

const primera = computed(() => props.filas[0])
const numeroOriginal = computed(() => primera.value?.numeroNotaSolicitud ?? '')

const form = reactive({
  numeroNotaSolicitud: '',
  funcionarioId: null as number | null,
  institucionSolicitante: '',
  destinatario: '',
  referencia: '',
  fechaPrestamo: '',
  fechaDevolucionEstimada: '',
  observaciones: '',
})
const funcionarioInicial = ref<Funcionario | null>(null)
const error = ref('')
const trabajando = ref<'guardar' | 'previsualizar' | 'aprobar' | null>(null)

watch(
  () => [props.modelValue, numeroOriginal.value],
  () => {
    const f = primera.value
    if (!props.modelValue || !f) return
    error.value = ''
    Object.assign(form, {
      numeroNotaSolicitud: f.numeroNotaSolicitud,
      funcionarioId: f.funcionarioId ?? null,
      institucionSolicitante: f.institucionSolicitante ?? '',
      destinatario: f.destinatario ?? f.funcionarioResponsable ?? '',
      referencia: f.referencia ?? '',
      fechaPrestamo: f.fechaPrestamo?.slice(0, 10) ?? '',
      fechaDevolucionEstimada: f.fechaDevolucionEstimada?.slice(0, 10) ?? '',
      observaciones: f.observaciones ?? '',
    })
    funcionarioInicial.value = f.funcionario ?? null
  },
  { immediate: true },
)

function alElegirFuncionario(f: Funcionario | null) {
  if (!f || f.id === primera.value?.funcionarioId) return
  form.institucionSolicitante = f.unidadOficina
  form.destinatario = nombreFuncionario(f)
}

/** Guarda los cambios en TODA la nota; devuelve el N° vigente (puede haberse renombrado). */
async function guardar(): Promise<string> {
  if (!form.numeroNotaSolicitud.trim()) throw new Error('El N° de nota es obligatorio.')
  if (!form.funcionarioId) throw new Error('Seleccione al funcionario solicitante.')
  if (form.fechaDevolucionEstimada && form.fechaDevolucionEstimada < form.fechaPrestamo)
    throw new Error('La devolución estimada no puede ser anterior a la fecha de préstamo.')
  await prestamosService.updateNota(numeroOriginal.value, {
    numeroNotaSolicitud: form.numeroNotaSolicitud.trim(),
    funcionarioId: form.funcionarioId,
    institucionSolicitante: form.institucionSolicitante || undefined,
    destinatario: form.destinatario || undefined,
    referencia: form.referencia || undefined,
    fechaPrestamo: form.fechaPrestamo || undefined,
    fechaDevolucionEstimada: form.fechaDevolucionEstimada || undefined,
    observaciones: form.observaciones || undefined,
  })
  return form.numeroNotaSolicitud.trim()
}

async function ejecutar(accion: 'guardar' | 'previsualizar' | 'aprobar') {
  trabajando.value = accion
  error.value = ''
  try {
    const numero = await guardar()
    if (accion === 'previsualizar') {
      await prestamosService.abrirNotaPdf(numero)
      emit('cambio')
      return
    }
    if (accion === 'aprobar') await prestamosService.aprobarNota(numero)
    emit('cambio')
    emit('update:modelValue', false)
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo completar la acción.')
  } finally {
    trabajando.value = null
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Editar nota en borrador"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-4">
      <p class="text-sm text-ink-600 dark:text-ink-300">
        Revise y corrija la nota. Los
        <strong>{{ filas.length }} comprobante{{ filas.length === 1 ? '' : 's' }}</strong> siguen en
        el archivo hasta que apruebe la nota.
      </p>
      <p
        v-if="error"
        class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ error }}
      </p>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput v-model="form.numeroNotaSolicitud" label="N° de nota de solicitud" required />
        <FuncionarioSelect
          v-model="form.funcionarioId"
          label="Funcionario / autoridad solicitante"
          required
          :inicial="funcionarioInicial"
          @select="alElegirFuncionario"
        />
        <BaseInput v-model="form.institucionSolicitante" label="Unidad / institución solicitante" />
        <BaseInput v-model="form.destinatario" label="Destinatario de la nota" />
        <BaseInput v-model="form.fechaPrestamo" type="date" label="Fecha de préstamo" />
        <BaseInput
          v-model="form.fechaDevolucionEstimada"
          type="date"
          label="Fecha de devolución estimada"
        />
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
            Referencia / glosa de la nota
          </label>
          <textarea
            v-model="form.referencia"
            rows="2"
            maxlength="500"
            class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
            Observaciones
          </label>
          <textarea
            v-model="form.observaciones"
            rows="2"
            maxlength="1000"
            class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <BaseButton
        variant="ghost"
        :disabled="trabajando !== null"
        @click="emit('update:modelValue', false)"
      >
        Cerrar
      </BaseButton>
      <BaseButton
        variant="secondary"
        :loading="trabajando === 'guardar'"
        @click="ejecutar('guardar')"
      >
        Guardar cambios
      </BaseButton>
      <BaseButton
        variant="secondary"
        :loading="trabajando === 'previsualizar'"
        @click="ejecutar('previsualizar')"
      >
        Guardar y previsualizar PDF
      </BaseButton>
      <BaseButton :loading="trabajando === 'aprobar'" @click="ejecutar('aprobar')">
        Aprobar y entregar
      </BaseButton>
    </template>
  </BaseModal>
</template>
