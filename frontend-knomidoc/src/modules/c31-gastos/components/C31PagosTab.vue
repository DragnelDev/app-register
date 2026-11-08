<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import PagoFormModal from '@/modules/pagos/components/PagoFormModal.vue'
import { pagosService } from '@/services/pagos.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import { bs, fechaCorta, TIPO_PAGO_LABEL } from '@/utils/estados'
import type { Pago, PagosDeComprobante } from '@/types/pagos.types'

const props = defineProps<{ comprobanteId: number; puedeEditar: boolean }>()

const datos = ref<PagosDeComprobante | null>(null)
const error = ref('')
const modal = ref(false)
const pagoEditado = ref<Pago | null>(null)
const beneficiarioElegido = ref<number | null>(null)

async function cargar() {
  error.value = ''
  try {
    datos.value = await pagosService.porComprobante(props.comprobanteId)
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudieron cargar los pagos.')
  }
}

function nuevo(beneficiarioId: number | null) {
  pagoEditado.value = null
  beneficiarioElegido.value = beneficiarioId
  modal.value = true
}
function editar(p: Pago) {
  pagoEditado.value = p
  modal.value = true
}
async function anular(p: Pago) {
  if (!confirm('¿Anular este pago? Quedará registrado como anulado.')) return
  try {
    await pagosService.update(p.id, { estadoPago: 'ANULADO' })
    await cargar()
  } catch (err) {
    error.value = extractApiErrorMessage(err)
  }
}

onMounted(cargar)
watch(() => props.comprobanteId, cargar)
</script>

<template>
  <div class="space-y-4 text-sm">
    <p
      v-if="error"
      class="rounded-md bg-red-50 px-3 py-2 text-red-700 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ error }}
    </p>

    <template v-if="datos">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-md border border-ink-100 p-3 dark:border-white/10">
          <p class="text-xs text-ink-500">Monto total del documento</p>
          <p class="text-base font-semibold text-ink-900 dark:text-white">
            Bs {{ bs(datos.resumen.montoTotal) }}
          </p>
        </div>
        <div class="rounded-md border border-ink-100 p-3 dark:border-white/10">
          <p class="text-xs text-ink-500">Pagado</p>
          <p class="text-base font-semibold text-emerald-700 dark:text-emerald-300">
            Bs {{ bs(datos.resumen.pagado) }}
          </p>
        </div>
        <div class="rounded-md border border-ink-100 p-3 dark:border-white/10">
          <p class="text-xs text-ink-500">Pendiente de pago</p>
          <p class="text-base font-semibold text-amber-700 dark:text-amber-300">
            Bs {{ bs(datos.resumen.pendiente) }}
          </p>
        </div>
        <div
          class="rounded-md border border-ink-100 p-3 dark:border-white/10"
          title="Retenciones, impuestos u otros conceptos sin pago a beneficiarios"
        >
          <p class="text-xs text-ink-500">Sin asignar</p>
          <p class="text-base font-semibold text-ink-900 dark:text-white">
            Bs {{ bs(datos.resumen.sinAsignar) }}
          </p>
        </div>
      </div>

      <div
        v-for="b in datos.beneficiarios"
        :key="b.id"
        class="rounded-md border border-ink-100 dark:border-white/10"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-3 py-2 dark:border-white/10"
        >
          <div>
            <p class="font-medium text-ink-900 dark:text-white">{{ b.nombreBeneficiario }}</p>
            <p class="text-xs text-ink-500">
              Pagado Bs {{ bs(b.totalPagado) }} · Pendiente Bs {{ bs(b.totalPendiente) }} ·
              {{ b.pagos.length }} pago(s)
            </p>
          </div>
          <BaseButton v-if="puedeEditar" size="sm" variant="secondary" @click="nuevo(b.id)"
            >+ Pago</BaseButton
          >
        </div>
        <p v-if="b.pagos.length === 0" class="px-3 py-3 text-xs text-ink-400">
          Sin pagos registrados.
        </p>
        <table v-else class="w-full text-left text-xs">
          <tbody class="divide-y divide-ink-100 dark:divide-white/10">
            <tr
              v-for="p in b.pagos"
              :key="p.id"
              :class="p.estadoPago === 'ANULADO' ? 'opacity-50' : ''"
            >
              <td class="px-3 py-2">
                {{ TIPO_PAGO_LABEL[p.tipoPago] }}
                <span v-if="p.numeroDocumento" class="font-mono"> · {{ p.numeroDocumento }}</span>
                <span v-if="p.banco" class="text-ink-500"> · {{ p.banco }}</span>
              </td>
              <td class="px-3 py-2 text-right font-medium">Bs {{ bs(p.monto) }}</td>
              <td class="px-3 py-2">{{ fechaCorta(p.fechaPago) }}</td>
              <td class="px-3 py-2"><BaseBadge :estado="p.estadoPago" /></td>
              <td class="px-3 py-2 text-right whitespace-nowrap">
                <button
                  v-if="p.estadoPago !== 'ANULADO'"
                  class="mr-3 text-ink-600 hover:underline dark:text-ink-300"
                  title="Descargar constancia de pago (PDF)"
                  @click="pagosService.constanciaPdf(p.id)"
                >
                  <i class="fa-solid fa-file-pdf" aria-hidden="true" /> PDF
                </button>
                <button
                  v-if="puedeEditar && p.estadoPago !== 'ANULADO'"
                  class="text-seal-600 hover:underline dark:text-seal-300"
                  @click="editar(p)"
                >
                  Editar
                </button>
                <button
                  v-if="puedeEditar && p.estadoPago !== 'ANULADO'"
                  class="ml-3 text-red-600 hover:underline"
                  @click="anular(p)"
                >
                  Anular
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <PagoFormModal
      v-model="modal"
      :comprobante-id="comprobanteId"
      :pago="pagoEditado"
      :beneficiario-id="beneficiarioElegido"
      @saved="cargar"
    />
  </div>
</template>
