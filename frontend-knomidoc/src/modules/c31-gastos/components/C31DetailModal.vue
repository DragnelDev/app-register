<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import C31DatosTab from './C31DatosTab.vue'
import C31PagosTab from './C31PagosTab.vue'
import C31SeguimientoTab from './C31SeguimientoTab.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useC31Store } from '@/stores/c31.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import { ESTADO_C31_LABEL, ESTADOS_C31, TRANSICIONES_MANUALES, bs } from '@/utils/estados'
import { identificadorC31, type ComprobanteC31 } from '@/types/c31.types'
import type { EstadoFisico } from '@/types/common.types'

const props = defineProps<{
  modelValue: boolean
  comprobante: ComprobanteC31 | null
  /** Pestaña con la que se abre */
  tab?: 'datos' | 'pagos' | 'seguimiento'
}>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()

const auth = useAuthStore()
const store = useC31Store()

const pestana = ref<'datos' | 'pagos' | 'seguimiento'>('datos')
const cambiandoEstado = ref(false)
const nuevoEstado = ref<EstadoFisico | ''>('')
const motivo = ref('')
const errorEstado = ref('')
const guardando = ref(false)
const version = ref(0) // fuerza la recarga de las pestañas tras un cambio de estado

watch(
  () => [props.modelValue, props.comprobante?.id],
  () => {
    if (!props.modelValue) return
    pestana.value = props.tab ?? 'datos'
    cambiandoEstado.value = false
    errorEstado.value = ''
  },
  { immediate: true },
)

const siguientes = computed(() =>
  props.comprobante ? TRANSICIONES_MANUALES[props.comprobante.estadoFisico] : [],
)
const requiereMotivo = computed(() => nuevoEstado.value === 'OBSERVADO' || nuevoEstado.value === 'ANULADO')
const ayudaActual = computed(
  () => ESTADOS_C31.find((e) => e.value === props.comprobante?.estadoFisico)?.ayuda ?? '',
)

const AVISO_SISTEMA: Record<string, string> = {
  EN_REVISION: 'Para que pase a “En archivo”, inclúyalo en un acta de entrega y que Archivo la reciba.',
  ARCHIVADO: 'Para prestarlo debe estar “Archivado correctamente”.',
  PRESTADO: 'Vuelve a “Archivado correctamente” al registrar la devolución del préstamo.',
}

async function confirmarEstado() {
  if (!props.comprobante || !nuevoEstado.value) return
  if (requiereMotivo.value && !motivo.value.trim()) {
    errorEstado.value = 'Indique el motivo.'
    return
  }
  guardando.value = true
  errorEstado.value = ''
  try {
    await store.cambiarEstado(props.comprobante.id, nuevoEstado.value, motivo.value.trim() || undefined)
    cambiandoEstado.value = false
    nuevoEstado.value = ''
    motivo.value = ''
    version.value++
  } catch (err) {
    errorEstado.value = extractApiErrorMessage(err, 'No se pudo cambiar el estado.')
  } finally {
    guardando.value = false
  }
}

const tabs = [
  { id: 'datos', label: 'Datos' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'seguimiento', label: 'Seguimiento' },
] as const
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Detalle del comprobante C31"
    size="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="comprobante" class="space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-lg font-semibold text-ink-900 dark:text-white">
            {{ comprobante.tipoC31 === 'CON_IMPUTACION' ? 'Preventivo' : 'Devengado' }}
            {{ identificadorC31(comprobante) ?? '—' }}
          </p>
          <p class="text-sm text-ink-600 dark:text-ink-300">
            Bs {{ bs(comprobante.montoTotal) }} · Gestión {{ comprobante.gestion }} ·
            {{ comprobante.tipoC31 === 'CON_IMPUTACION' ? 'Con imputación' : 'Sin imputación' }}
          </p>
        </div>
        <div class="flex flex-col items-end gap-1">
          <BaseBadge :estado="comprobante.estadoFisico" />
          <button
            v-if="auth.puedeRegistrarC31 && siguientes.length && !cambiandoEstado"
            type="button"
            class="text-xs font-medium text-seal-600 hover:underline dark:text-seal-300"
            @click="cambiandoEstado = true"
          >
            Cambiar estado
          </button>
        </div>
      </div>
      <p class="-mt-2 text-xs text-ink-500">{{ ayudaActual }} {{ AVISO_SISTEMA[comprobante.estadoFisico] ?? '' }}</p>

      <!-- Cambio de estado -->
      <div v-if="cambiandoEstado" class="space-y-3 rounded-md border border-ink-100 bg-ink-50/60 p-3 dark:border-white/10 dark:bg-white/5">
        <p v-if="errorEstado" class="text-sm text-red-600">{{ errorEstado }}</p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">Nuevo estado</label>
            <select v-model="nuevoEstado" class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100">
              <option value="" disabled>Seleccione…</option>
              <option v-for="e in siguientes" :key="e" :value="e">{{ ESTADO_C31_LABEL[e] }}</option>
            </select>
          </div>
          <div v-if="nuevoEstado">
            <label class="mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200">
              {{ requiereMotivo ? 'Motivo (obligatorio)' : 'Nota (opcional)' }}
            </label>
            <input v-model="motivo" type="text" class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100" :placeholder="nuevoEstado === 'OBSERVADO' ? 'Ej: falta la firma del Director' : ''" />
          </div>
        </div>
        <p v-if="nuevoEstado === 'ARCHIVADO'" class="text-xs text-ink-500">
          Requiere N° de folio y ubicación final cargados en la pestaña Datos.
        </p>
        <div class="flex justify-end gap-2">
          <BaseButton size="sm" variant="ghost" :disabled="guardando" @click="cambiandoEstado = false">Cancelar</BaseButton>
          <BaseButton size="sm" :loading="guardando" :disabled="!nuevoEstado" @click="confirmarEstado">Confirmar</BaseButton>
        </div>
      </div>

      <div class="flex gap-1 border-b border-ink-100 dark:border-white/10" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="pestana === t.id"
          class="-mb-px border-b-2 px-3 py-2 text-sm font-medium"
          :class="pestana === t.id ? 'border-seal-500 text-seal-600 dark:text-seal-300' : 'border-transparent text-ink-500 hover:text-ink-800 dark:hover:text-ink-100'"
          @click="pestana = t.id"
        >
          {{ t.label }}
        </button>
      </div>

      <C31DatosTab v-if="pestana === 'datos'" :comprobante="comprobante" :puede-editar="auth.puedeRegistrarC31" />
      <C31PagosTab
        v-else-if="pestana === 'pagos'"
        :key="`p${version}`"
        :comprobante-id="Number(comprobante.id)"
        :puede-editar="auth.puedeRegistrarC31 && comprobante.estadoFisico !== 'ANULADO'"
      />
      <C31SeguimientoTab v-else :key="`s${version}`" :comprobante-id="comprobante.id" />
    </div>
  </BaseModal>
</template>
