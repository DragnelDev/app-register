<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FuncionarioSelect from '@/components/shared/FuncionarioSelect.vue'
import HuellaPanel from '@/components/shared/HuellaPanel.vue'
import type { Funcionario } from '@/types/funcionarios.types'
import type { CondicionDevolucion } from '@/types/prestamos.types'
import type { MetodoVerificacion } from '@/types/common.types'

const props = defineProps<{
  modelValue: boolean
  saving?: boolean
  titulo?: string
  /** Solo cuaderno: pide quién devuelve y su verificación (firma o huella). */
  conQuienDevuelve?: boolean
  /** Funcionario al que se le prestó */
  solicitante?: Funcionario | null
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [
    payload: {
      condicion: CondicionDevolucion
      observaciones?: string
      devueltoPorFuncionarioId?: number
      metodoVerificacion?: MetodoVerificacion
    },
  ]
}>()

// ── Quién devuelve ──
const quien = ref<'MISMO' | 'OTRO'>('MISMO')
const otroId = ref<number | null>(null)
const otro = ref<Funcionario | null>(null)
const metodo = ref<MetodoVerificacion>('FIRMA_MANUAL')
const huellaOk = ref(false)
const quienDevuelve = () => (quien.value === 'MISMO' ? props.solicitante : otro.value)

const condicion = ref<CondicionDevolucion>('CONFORME')
const observaciones = ref('')
const error = ref('')

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      condicion.value = 'CONFORME'
      observaciones.value = ''
      error.value = ''
      quien.value = 'MISMO'
      otroId.value = null
      otro.value = null
      metodo.value = 'FIRMA_MANUAL'
      huellaOk.value = false
    }
  },
)

function confirmar() {
  if (condicion.value === 'CON_NOVEDAD' && !observaciones.value.trim()) {
    error.value = 'Describa la novedad (daños, hojas faltantes, etc.).'
    return
  }
  let devueltoPorFuncionarioId: number | undefined
  if (props.conQuienDevuelve) {
    const f = quienDevuelve()
    if (quien.value === 'OTRO' && !f) {
      error.value = 'Seleccione al funcionario que devuelve.'
      return
    }
    if (metodo.value === 'HUELLA_DIGITAL') {
      if (!f?.huellaRegistradaEn) {
        error.value = 'Quien devuelve no tiene huella registrada (se enrola en Funcionarios).'
        return
      }
      if (!huellaOk.value) {
        error.value = 'Verifique la huella de quien devuelve antes de confirmar.'
        return
      }
    }
    devueltoPorFuncionarioId = f?.id
  }
  emit('confirm', {
    condicion: condicion.value,
    observaciones: observaciones.value.trim() || undefined,
    ...(props.conQuienDevuelve
      ? { devueltoPorFuncionarioId, metodoVerificacion: metodo.value }
      : {}),
  })
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="titulo ?? 'Registrar devolución'"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-4 text-sm">
      <p class="text-ink-600 dark:text-ink-300">
        Revise el comprobante al recibirlo. Volverá a “Archivado correctamente”.
      </p>
      <div class="flex gap-5 text-ink-800 dark:text-ink-100">
        <label class="flex items-center gap-2"
          ><input v-model="condicion" type="radio" value="CONFORME" /> Conforme</label
        >
        <label class="flex items-center gap-2"
          ><input v-model="condicion" type="radio" value="CON_NOVEDAD" /> Con novedad</label
        >
      </div>
      <section
        v-if="conQuienDevuelve"
        class="space-y-3 rounded-md border border-ink-200 p-3 dark:border-white/10"
      >
        <p class="text-xs font-semibold text-ink-700 dark:text-ink-200">¿Quién devuelve?</p>
        <div class="flex flex-col gap-1 text-ink-800 dark:text-ink-100">
          <label class="flex items-center gap-2">
            <input v-model="quien" type="radio" value="MISMO" @change="huellaOk = false" />
            El solicitante<span v-if="solicitante" class="text-ink-500">
              ({{ solicitante.nombres }} {{ solicitante.apellidos }})</span
            >
          </label>
          <label class="flex items-center gap-2">
            <input v-model="quien" type="radio" value="OTRO" @change="huellaOk = false" />
            Otra persona (p. ej. el auxiliar a quien se lo encargó)
          </label>
        </div>
        <FuncionarioSelect
          v-if="quien === 'OTRO'"
          v-model="otroId"
          label="Funcionario que devuelve"
          @select="
            (f: Funcionario | null) => {
              otro = f
              huellaOk = false
            }
          "
        />
        <div>
          <label
            class="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200"
            for="dev-met"
            >Verificación</label
          >
          <select
            id="dev-met"
            v-model="metodo"
            class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
            @change="huellaOk = false"
          >
            <option value="FIRMA_MANUAL">Firma en el cuaderno</option>
            <option value="HUELLA_DIGITAL">Huella digital (lector demo)</option>
          </select>
        </div>
        <template v-if="metodo === 'HUELLA_DIGITAL'">
          <p v-if="!quienDevuelve()" class="text-xs text-ink-500">
            Seleccione primero a quien devuelve.
          </p>
          <p
            v-else-if="!quienDevuelve()?.huellaRegistradaEn"
            class="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-400/10 dark:text-amber-200"
          >
            Esta persona aún no tiene huella registrada. Enrólela en Funcionarios → Editar.
          </p>
          <HuellaPanel
            v-else
            :key="quienDevuelve()?.id"
            :funcionario-id="quienDevuelve()!.id"
            modo="verificar"
            tiene-huella
            @verificado="huellaOk = true"
            @fallo="huellaOk = false"
          />
        </template>
      </section>
      <div>
        <label class="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200"
          >Observaciones{{ condicion === 'CON_NOVEDAD' ? ' (obligatorio)' : ' (opcional)' }}</label
        >
        <textarea
          v-model="observaciones"
          rows="3"
          class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
        />
      </div>
      <p v-if="error" class="text-red-600">{{ error }}</p>
    </div>
    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)"
        >Cancelar</BaseButton
      >
      <BaseButton :loading="saving" @click="confirmar">Confirmar devolución</BaseButton>
    </template>
  </BaseModal>
</template>
