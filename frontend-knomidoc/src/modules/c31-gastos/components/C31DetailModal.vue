<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useC31Store } from '@/stores/c31.store'
import type { ComprobanteC31 } from '@/types/c31.types'

const props = defineProps<{
  modelValue: boolean
  comprobante: ComprobanteC31 | null
}>()

defineEmits<{ 'update:modelValue': [value: boolean] }>()

const auth = useAuthStore()
const c31Store = useC31Store()

const tipoC31Label: Record<string, string> = {
  CON_IMPUTACION: 'Con imputación',
  SIN_IMPUTACION: 'Sin imputación',
}

const editando = ref(false)
const guardando = ref(false)
const errorMessage = ref('')

const form = reactive({
  estadoFisico: 'EN_TRAMITE' as string,
  numeroFolio: '' as string,
  ubicacionFisica: '' as string,
  cheques: [] as string[],
})

// Solo estos estados se pueden fijar a mano; "En archivo" además se asigna
// automáticamente al entregarse el acta correspondiente.
const estadosEditables = [
  { value: 'EN_TRAMITE', label: 'En Trámite / Revisión' },
  { value: 'EN_ARCHIVO', label: 'En archivo' },
  { value: 'ANULADO', label: 'Anulado' },
]

function cargarFormDesdeComprobante() {
  if (!props.comprobante) return
  form.estadoFisico = props.comprobante.estadoFisico
  form.numeroFolio = props.comprobante.numeroFolio ?? ''
  form.ubicacionFisica = props.comprobante.ubicacionFisica ?? ''
  form.cheques = props.comprobante.cheques.map((c) => c.numeroCheque)
}

watch(
  () => props.comprobante,
  () => {
    editando.value = false
    errorMessage.value = ''
    cargarFormDesdeComprobante()
  },
  { immediate: true },
)

function agregarCheque() {
  form.cheques.push('')
}

function quitarCheque(index: number) {
  form.cheques.splice(index, 1)
}

async function guardar() {
  if (!props.comprobante) return
  guardando.value = true
  errorMessage.value = ''
  try {
    await c31Store.update(props.comprobante.id, {
      estadoFisico: form.estadoFisico as ComprobanteC31['estadoFisico'],
      numeroFolio: form.numeroFolio || null,
      ubicacionFisica: form.ubicacionFisica || null,
      cheques: form.cheques.map((c) => c.trim()).filter(Boolean),
    })
    editando.value = false
  } catch {
    errorMessage.value = 'No se pudieron guardar los cambios. Intenta nuevamente.'
  } finally {
    guardando.value = false
  }
}

function cancelarEdicion() {
  cargarFormDesdeComprobante()
  errorMessage.value = ''
  editando.value = false
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Detalle del comprobante C31"
    size="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="comprobante" class="space-y-5 text-sm">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-lg font-semibold text-ink-900 dark:text-white">{{ comprobante.descripcion }}</p>
          <p class="text-ink-600 dark:text-ink-300">
            Bs {{ Number(comprobante.montoTotal).toFixed(2) }} ·
            {{ comprobante.fechaElaboracion }} · Gestión {{ comprobante.gestion }}
          </p>
          <p v-if="comprobante.numeroComprobante" class="text-ink-600 dark:text-ink-300">
            N° comprobante: {{ comprobante.numeroComprobante }}
          </p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <BaseBadge :estado="editando ? form.estadoFisico : comprobante.estadoFisico" />
          <span class="text-xs font-medium text-ink-600 dark:text-ink-300">
            {{ tipoC31Label[comprobante.tipoC31] ?? comprobante.tipoC31 }}
          </span>
          <BaseButton
            v-if="auth.puedeRegistrarC31 && !editando"
            size="sm"
            variant="secondary"
            @click="editando = true"
          >
            Editar
          </BaseButton>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <h4 class="mb-1 font-semibold text-ink-700 dark:text-ink-200">N° de Preventivo</h4>
          <ul v-if="comprobante.preventivos.length" class="list-inside list-disc text-ink-700 dark:text-ink-300">
            <li v-for="p in comprobante.preventivos" :key="p.id ?? p.numeroPreventivo">
              {{ p.numeroPreventivo }}
            </li>
          </ul>
          <p v-else class="text-ink-400">—</p>
        </div>
        <div>
          <h4 class="mb-1 font-semibold text-ink-700 dark:text-ink-200">N° de Devengado</h4>
          <ul v-if="comprobante.devengados.length" class="list-inside list-disc text-ink-700 dark:text-ink-300">
            <li v-for="d in comprobante.devengados" :key="d.id ?? d.numeroDevengado">
              {{ d.numeroDevengado }}
            </li>
          </ul>
          <p v-else class="text-ink-400">—</p>
        </div>
        <div>
          <h4 class="mb-1 font-semibold text-ink-700 dark:text-ink-200">Beneficiarios</h4>
          <ul v-if="comprobante.beneficiarios.length" class="list-inside list-disc text-ink-700 dark:text-ink-300">
            <li v-for="b in comprobante.beneficiarios" :key="b.id ?? b.nombreBeneficiario">
              {{ b.nombreBeneficiario }}
            </li>
          </ul>
          <p v-else class="text-ink-400">—</p>
        </div>

        <!-- Cheques: solo lectura -->
        <div v-if="!editando">
          <h4 class="mb-1 font-semibold text-ink-700 dark:text-ink-200">Cheques</h4>
          <p v-if="comprobante.cheques.length === 0" class="text-ink-400">Sin cheques asociados.</p>
          <ul v-else class="list-inside list-disc text-ink-600">
            <li v-for="c in comprobante.cheques" :key="c.id ?? c.numeroCheque">
              {{ c.numeroCheque }}
            </li>
          </ul>
        </div>

        <!-- Cheques: edición manual -->
        <div v-else>
          <h4 class="mb-1 font-semibold text-ink-700 dark:text-ink-200">Cheques</h4>
          <div class="space-y-2">
            <div v-for="(_, idx) in form.cheques" :key="idx" class="flex items-center gap-2">
              <input
                v-model="form.cheques[idx]"
                type="text"
                class="w-full rounded-md border border-ink-200 bg-white px-2 py-1.5 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
                placeholder="N° de cheque"
              />
              <button
                type="button"
                class="text-ink-400 hover:text-red-600"
                aria-label="Quitar cheque"
                @click="quitarCheque(idx)"
              >
                ✕
              </button>
            </div>
            <button
              type="button"
              class="text-xs font-medium text-ink-700 hover:underline dark:text-ink-300"
              @click="agregarCheque"
            >
              + Agregar cheque
            </button>
          </div>
        </div>
      </div>

      <!-- Solo lectura -->
      <div v-if="!editando" class="space-y-4">
        <div>
          <h4 class="mb-1 font-semibold text-ink-700 dark:text-ink-200">N° de folio</h4>
          <p class="text-ink-700 dark:text-ink-300">{{ comprobante.numeroFolio || 'Sin asignar aún.' }}</p>
        </div>
        <div>
          <h4 class="mb-1 font-semibold text-ink-700 dark:text-ink-200">Ubicación física</h4>
          <p class="text-ink-700 dark:text-ink-300">{{ comprobante.ubicacionFisica || 'Sin asignar aún.' }}</p>
        </div>
      </div>

      <!-- Edición manual: estado, folio, ubicación/carpeta -->
      <div v-else class="space-y-4 rounded-md border border-ink-100 bg-ink-50/50 p-4 dark:border-white/10 dark:bg-white/5">
        <div>
          <label class="mb-1 block text-sm font-medium text-ink-700 dark:text-ink-200">Estado del comprobante</label>
          <select
            v-model="form.estadoFisico"
            class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
          >
            <option v-for="opt in estadosEditables" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <BaseInput v-model="form.numeroFolio" label="N° de folio" />
        <BaseInput
          v-model="form.ubicacionFisica"
          label="Ubicación física / N° de carpeta"
          hint="Ej. ARCHIVOS GAMSL - Carpeta 12"
        />

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <div class="flex justify-end gap-2">
          <BaseButton variant="ghost" size="sm" :disabled="guardando" @click="cancelarEdicion">
            Cancelar
          </BaseButton>
          <BaseButton size="sm" :loading="guardando" @click="guardar"> Guardar cambios </BaseButton>
        </div>
      </div>

      <div v-if="comprobante.observaciones">
        <h4 class="mb-1 font-semibold text-ink-700 dark:text-ink-200">Observaciones</h4>
        <p class="text-ink-700 dark:text-ink-300">{{ comprobante.observaciones }}</p>
      </div>
    </div>
  </BaseModal>
</template>
