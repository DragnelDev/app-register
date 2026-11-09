<script setup lang="ts">
import MontoInput from '@/components/shared/MontoInput.vue'
import FechaInput from '@/components/shared/FechaInput.vue'
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ComprobanteC31Picker from '@/components/shared/ComprobanteC31Picker.vue'
import { pagosService } from '@/services/pagos.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import { bs } from '@/utils/estados'
import { codigoDocumento, fechaRazonable, maxLength, runValidators } from '@/utils/validators'
import { rotuloC31, type ComprobanteC31 } from '@/types/c31.types'
import type { Pago, PagosDeComprobante, TipoPago } from '@/types/pagos.types'

const props = defineProps<{
  modelValue: boolean
  /** Si viene, el pago es de ese comprobante; si no, se elige uno en el formulario */
  comprobanteId?: number | null
  /** Pago a editar (si no, se registra uno nuevo) */
  pago?: Pago | null
  beneficiarioId?: number | null
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [pago: Pago] }>()

const comprobante = ref<ComprobanteC31 | null>(null)
const datos = ref<PagosDeComprobante | null>(null)
const saving = ref(false)
const error = ref('')

const form = reactive({
  beneficiarioId: '' as string | number,
  tipoPago: 'CHEQUE' as TipoPago,
  numeroDocumento: '',
  banco: '',
  monto: '' as string | number,
  fechaPago: '',
  estadoPago: 'PENDIENTE' as 'PENDIENTE' | 'PAGADO' | 'ANULADO',
  observaciones: '',
})

const comprobanteIdActual = computed(
  () => props.comprobanteId ?? (comprobante.value ? Number(comprobante.value.id) : null),
)
const editando = computed(() => Boolean(props.pago))

/** Lo que aún se puede asignar (sin contar este pago si se está editando). */
const disponible = computed(() => {
  if (!datos.value) return null
  const propio =
    props.pago && props.pago.estadoPago !== 'ANULADO' ? Number(props.pago.monto ?? 0) : 0
  return (
    datos.value.resumen.montoTotal -
    datos.value.resumen.pagado -
    datos.value.resumen.pendiente +
    propio
  )
})

async function cargarComprobante(id: number) {
  error.value = ''
  datos.value = await pagosService.porComprobante(id)
  if (!form.beneficiarioId && datos.value.beneficiarios.length === 1) {
    form.beneficiarioId = datos.value.beneficiarios[0]?.id ?? ''
  }
  // Pago nuevo: sugiere el saldo disponible (se puede cambiar)
  if (!props.pago && !form.monto && disponible.value && disponible.value > 0) {
    form.monto = disponible.value.toFixed(2)
  }
}

function reiniciar() {
  error.value = ''
  comprobante.value = null
  datos.value = null
  const p = props.pago
  form.beneficiarioId = p?.beneficiarioId ?? props.beneficiarioId ?? ''
  form.tipoPago = p?.tipoPago ?? 'CHEQUE'
  form.numeroDocumento = p?.numeroDocumento ?? ''
  form.banco = p?.banco ?? ''
  form.monto = p?.monto ?? ''
  form.fechaPago = p?.fechaPago ? p.fechaPago.slice(0, 10) : ''
  form.estadoPago = p?.estadoPago ?? 'PENDIENTE'
  form.observaciones = p?.observaciones ?? ''
  if (props.comprobanteId) cargarComprobante(props.comprobanteId).catch(mostrarError)
}

function mostrarError(err: unknown) {
  error.value = extractApiErrorMessage(err, 'No se pudo completar la operación.')
}

watch(
  () => [props.modelValue, props.pago, props.comprobanteId],
  () => props.modelValue && reiniciar(),
  {
    immediate: true,
  },
)

function elegirComprobante(c: ComprobanteC31) {
  comprobante.value = c
  form.beneficiarioId = ''
  cargarComprobante(Number(c.id)).catch(mostrarError)
}

function usarDisponible() {
  if (disponible.value && disponible.value > 0) form.monto = disponible.value.toFixed(2)
}

async function guardar() {
  error.value = ''
  if (!comprobanteIdActual.value) return (error.value = 'Seleccione el comprobante')
  if (!form.beneficiarioId) return (error.value = 'Seleccione el beneficiario')
  if (!(Number(form.monto) > 0)) return (error.value = 'El monto debe ser mayor a 0')
  if (form.tipoPago === 'CHEQUE' && !form.numeroDocumento.trim())
    return (error.value = 'Indique el N° de cheque')
  if (!/^\d+(\.\d{1,2})?$/.test(String(form.monto)))
    return (error.value = 'El monto admite hasta 2 decimales')
  if (disponible.value !== null && Number(form.monto) > disponible.value + 0.001)
    return (error.value = `El monto supera lo disponible para pagar (Bs ${bs(disponible.value)})`)
  const err =
    runValidators(form.numeroDocumento, [codigoDocumento(), maxLength(60)]) ??
    runValidators(form.banco, [maxLength(100)]) ??
    runValidators(form.fechaPago, [fechaRazonable()]) ??
    runValidators(form.observaciones, [maxLength(500)])
  if (err) return (error.value = err)

  saving.value = true
  try {
    const base = {
      beneficiarioId: Number(form.beneficiarioId),
      tipoPago: form.tipoPago,
      numeroDocumento: form.numeroDocumento.trim() || undefined,
      banco: form.banco.trim() || undefined,
      monto: Number(form.monto),
      fechaPago: form.fechaPago || undefined,
      observaciones: form.observaciones.trim() || undefined,
    }
    const guardado = props.pago
      ? await pagosService.update(props.pago.id, { ...base, estadoPago: form.estadoPago })
      : await pagosService.create({
          ...base,
          comprobanteId: comprobanteIdActual.value,
          estadoPago: form.estadoPago === 'PAGADO' ? 'PAGADO' : 'PENDIENTE',
        })
    emit('saved', guardado)
    emit('update:modelValue', false)
  } catch (err) {
    mostrarError(err)
  } finally {
    saving.value = false
  }
}

const campo =
  'w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'
const etiqueta = 'mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200'
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="editando ? 'Editar pago' : 'Registrar pago'"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="pago-form" class="space-y-4" @submit.prevent="guardar">
      <p
        v-if="error"
        class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ error }}
      </p>

      <div v-if="!comprobanteId && !editando">
        <label :class="etiqueta">Comprobante C31</label>
        <ComprobanteC31Picker
          placeholder="Buscar por glosa, N° de preventivo/devengado o beneficiario…"
          @select="elegirComprobante"
        />
        <p v-if="comprobante" class="mt-1 text-xs text-ink-600 dark:text-ink-300">
          Seleccionado: {{ rotuloC31(comprobante) ?? comprobante.id }} · Bs
          {{ bs(comprobante.montoTotal) }}
        </p>
      </div>

      <div v-if="datos" class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div
          v-for="t in [
            { n: 'Total', v: datos.resumen.montoTotal, c: '' },
            { n: 'Pagado', v: datos.resumen.pagado, c: 'text-emerald-700 dark:text-emerald-300' },
            { n: 'Pendiente', v: datos.resumen.pendiente, c: 'text-amber-700 dark:text-amber-300' },
            { n: 'Disponible', v: disponible ?? 0, c: 'text-seal-700 dark:text-seal-300' },
          ]"
          :key="t.n"
          class="rounded-md border border-ink-100 bg-ink-50 px-3 py-2 dark:border-white/10 dark:bg-white/5"
        >
          <p class="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{{ t.n }}</p>
          <p class="whitespace-nowrap text-sm font-semibold tabular-nums" :class="t.c">Bs {{ bs(t.v) }}</p>
        </div>
      </div>

      <div v-if="datos" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label :class="etiqueta">Beneficiario <span class="text-seal-500">*</span></label>
          <select v-model="form.beneficiarioId" :class="campo">
            <option value="" disabled>Seleccione…</option>
            <option v-for="b in datos.beneficiarios" :key="b.id" :value="b.id">
              {{ b.nombreBeneficiario }}
            </option>
          </select>
        </div>

        <div class="sm:col-span-2">
          <span :class="etiqueta">Forma de pago <span class="text-seal-500">*</span></span>
          <div class="flex gap-5 text-sm text-ink-800 dark:text-ink-100">
            <label class="flex items-center gap-2"
              ><input v-model="form.tipoPago" type="radio" value="CHEQUE" /> Cheque</label
            >
            <label class="flex items-center gap-2"
              ><input v-model="form.tipoPago" type="radio" value="ELECTRONICO" /> Pago
              electrónico</label
            >
          </div>
        </div>

        <div>
          <label :class="etiqueta">
            {{ form.tipoPago === 'CHEQUE' ? 'N° de cheque' : 'N° de transferencia' }}
            <span v-if="form.tipoPago === 'CHEQUE'" class="text-seal-500">*</span>
          </label>
          <input v-model="form.numeroDocumento" type="text" :class="campo" />
        </div>
        <div>
          <label :class="etiqueta">Banco</label>
          <input v-model="form.banco" type="text" :class="campo" />
        </div>

        <div>
          <label :class="etiqueta">Monto (Bs) <span class="text-seal-500">*</span></label>
          <MontoInput v-model="form.monto" />
          <button
            type="button"
            class="mt-1 text-xs text-seal-600 hover:underline dark:text-seal-300"
            @click="usarDisponible"
          >
            Usar todo el disponible
          </button>
        </div>
        <div>
          <label :class="etiqueta">Fecha de pago</label>
          <FechaInput v-model="form.fechaPago" />
        </div>

        <div>
          <label :class="etiqueta">Estado</label>
          <select v-model="form.estadoPago" :class="campo">
            <option value="PENDIENTE">Pendiente</option>
            <option value="PAGADO">Pagado</option>
            <option v-if="editando" value="ANULADO">Anulado</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label :class="etiqueta">Observaciones</label>
          <input v-model="form.observaciones" type="text" :class="campo" />
        </div>
      </div>
    </form>

    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)"
        >Cancelar</BaseButton
      >
      <BaseButton type="submit" form="pago-form" :loading="saving" :disabled="!datos"
        >Guardar pago</BaseButton
      >
    </template>
  </BaseModal>
</template>
