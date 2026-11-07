<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FuncionarioSelect from '@/components/shared/FuncionarioSelect.vue'
import ComprobanteC31Picker from '@/components/shared/ComprobanteC31Picker.vue'
import SeleccionRapidaModal from '@/components/shared/SeleccionRapidaModal.vue'
import ComprobantesC31SelectedTable from '@/components/shared/ComprobantesC31SelectedTable.vue'
import { required, maxLength, runValidators, codigoDocumento } from '@/utils/validators'
import { nombreFuncionario, type Funcionario } from '@/types/funcionarios.types'
import type { PrestamoNotaCreatePayload } from '@/types/prestamos.types'
import type { ComprobanteC31 } from '@/types/c31.types'

defineProps<{ saving?: boolean }>()
const emit = defineEmits<{ submit: [payload: PrestamoNotaCreatePayload] }>()

const form = reactive({
  numeroNotaSolicitud: '',
  funcionarioId: null as number | null,
  institucionSolicitante: '',
  destinatario: '',
  referencia: '',
  fechaPrestamo: new Date().toISOString().slice(0, 10),
  fechaDevolucionEstimada: '',
  observaciones: '',
})

const selectedComprobantes = ref<ComprobanteC31[]>([])

// Al elegir al funcionario se proponen su unidad y su nombre como destinatario (editables)
function alElegirFuncionario(f: Funcionario | null) {
  if (!f) return
  form.institucionSolicitante = f.unidadOficina
  form.destinatario = nombreFuncionario(f)
}

// --- Validación ---
const errors = reactive({ numeroNotaSolicitud: '', funcionarioId: '', items: '' })
const touched = reactive({ numeroNotaSolicitud: false, funcionarioId: false })

// Vacío = el sistema genera el N° de nota / CITE (NP-0001/año)
const reglaNota = [maxLength(100), codigoDocumento()]

function validateItems() {
  errors.items =
    selectedComprobantes.value.length === 0 ? 'Debe añadir al menos un comprobante al préstamo' : ''
}

function validateAll(): boolean {
  touched.numeroNotaSolicitud = touched.funcionarioId = true
  errors.numeroNotaSolicitud = form.numeroNotaSolicitud.trim()
    ? (runValidators(form.numeroNotaSolicitud, reglaNota) ?? '')
    : ''
  errors.funcionarioId = form.funcionarioId ? '' : 'Seleccione al funcionario solicitante'
  validateItems()
  if (!errors.items && form.fechaDevolucionEstimada && form.fechaDevolucionEstimada < form.fechaPrestamo) {
    errors.items = 'La devolución estimada no puede ser anterior a la fecha del préstamo'
  }
  return !errors.numeroNotaSolicitud && !errors.funcionarioId && !errors.items
}

const matrizAbierta = ref(false)
function agregarLote(lote: ComprobanteC31[]) {
  lote.forEach((c) => addComprobante(c))
}
const excludeIds = computed(() => selectedComprobantes.value.map((c) => c.id))

function addComprobante(comprobante: ComprobanteC31) {
  selectedComprobantes.value.push(comprobante)
  validateItems()
}

function removeComprobante(id: string) {
  selectedComprobantes.value = selectedComprobantes.value.filter((c) => c.id !== id)
  validateItems()
}

function enviar(aprobar: boolean) {
  if (!validateAll()) return
  emit('submit', {
    numeroNotaSolicitud: form.numeroNotaSolicitud.trim() || undefined,
    funcionarioId: form.funcionarioId as number,
    institucionSolicitante: form.institucionSolicitante || undefined,
    destinatario: form.destinatario || undefined,
    referencia: form.referencia || undefined,
    fechaPrestamo: form.fechaPrestamo || undefined,
    fechaDevolucionEstimada: form.fechaDevolucionEstimada || undefined,
    observaciones: form.observaciones || undefined,
    comprobanteIds: selectedComprobantes.value.map((c) => c.id),
    aprobar,
  })
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="enviar(false)">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        v-model="form.numeroNotaSolicitud"
        label="N° de nota / CITE"
        placeholder="Automático (NP-0001/2026); escriba uno solo si ya tiene"
        :error="touched.numeroNotaSolicitud ? errors.numeroNotaSolicitud : ''"
      />
      <FuncionarioSelect
        v-model="form.funcionarioId"
        label="Funcionario / autoridad solicitante"
        required
        :error="touched.funcionarioId ? errors.funcionarioId : ''"
        @select="alElegirFuncionario"
      />
      <BaseInput
        v-model="form.institucionSolicitante"
        label="Unidad / institución solicitante"
        hint="Se completa con la unidad del funcionario; puede cambiarla."
      />
      <BaseInput
        v-model="form.destinatario"
        label="Destinatario de la nota"
        hint="Aparece en el encabezado “Señor(a)”."
      />
      <BaseInput v-model="form.fechaPrestamo" type="date" label="Fecha de préstamo" />
      <BaseInput
        v-model="form.fechaDevolucionEstimada"
        type="date"
        label="Fecha de devolución estimada (opcional)"
      />
      <div class="sm:col-span-2">
        <label class="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
          Referencia / glosa de la nota (opcional)
        </label>
        <textarea
          v-model="form.referencia"
          rows="2"
          maxlength="500"
          placeholder="Si se deja vacía se usa la referencia estándar de remisión de comprobantes."
          class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
        />
      </div>
    </div>

    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
        Comprobantes C31 a prestar (búsqueda y selección)
      </h3>
      <div class="flex gap-2">
        <div class="min-w-0 flex-1">
          <ComprobanteC31Picker :exclude-ids="excludeIds" solo-disponibles @select="addComprobante" />
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
          @click="matrizAbierta = true"
        >
          <i class="fa-solid fa-table-cells" aria-hidden="true" /> Selección rápida
        </button>
      </div>
      <SeleccionRapidaModal v-model="matrizAbierta" :exclude-ids="excludeIds" @confirm="agregarLote" />
      <div class="mt-3">
        <ComprobantesC31SelectedTable :items="selectedComprobantes" @remove="removeComprobante" />
      </div>
      <p v-if="errors.items" class="mt-1 text-xs text-red-600">{{ errors.items }}</p>
    </section>

    <BaseInput v-model="form.observaciones" label="Observaciones (opcional)" />

    <div class="flex flex-wrap items-center gap-2">
      <BaseButton type="submit" :loading="saving" variant="secondary">
        Guardar borrador y previsualizar
      </BaseButton>
      <BaseButton :loading="saving" @click="enviar(true)">Aprobar y entregar</BaseButton>
      <p class="text-xs text-ink-400">
        El borrador se puede editar y previsualizar en PDF; los comprobantes salen del archivo al
        aprobar.
      </p>
    </div>
  </form>
</template>
