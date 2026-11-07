<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import { c31Service } from '@/services/c31.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import { ESTADO_C31_LABEL, fechaCorta, fechaHora } from '@/utils/estados'
import type { C31Seguimiento } from '@/types/c31.types'

const props = defineProps<{ comprobanteId: number | string }>()

const datos = ref<C31Seguimiento | null>(null)
const error = ref('')

async function cargar() {
  error.value = ''
  try {
    datos.value = await c31Service.seguimiento(props.comprobanteId)
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo cargar el seguimiento.')
  }
}
onMounted(cargar)
watch(() => props.comprobanteId, cargar)

const ORIGEN: Record<string, string> = {
  REGISTRO: 'Registro',
  MANUAL: 'Manual',
  ACTA: 'Acta de entrega',
  PRESTAMO: 'Préstamo',
  SISTEMA: 'Ubicación / sistema',
  REMISION: 'Remisión',
}
</script>

<template>
  <div class="space-y-6 text-sm">
    <p
      v-if="error"
      class="rounded-md bg-red-50 px-3 py-2 text-red-700 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ error }}
    </p>

    <template v-if="datos">
      <section>
        <h4 class="mb-2 font-semibold text-ink-800 dark:text-ink-100">Ubicación del archivo físico</h4>
        <div
          v-if="datos.ubicacion.enPoderDe"
          class="mb-3 rounded-md px-3 py-2 text-xs"
          :class="
            datos.ubicacion.enPoderDe.vencido
              ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
              : 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200'
          "
        >
          <strong>Fuera del archivo:</strong> lo tiene {{ datos.ubicacion.enPoderDe.solicitante }}
          ({{ datos.ubicacion.enPoderDe.institucionOArea }}) desde
          {{ fechaCorta(datos.ubicacion.enPoderDe.desde) }} · {{ datos.ubicacion.enPoderDe.referencia }}
          <template v-if="datos.ubicacion.enPoderDe.devolucionEstimada">
            · devolución estimada {{ fechaCorta(datos.ubicacion.enPoderDe.devolucionEstimada) }}
          </template>
        </div>
        <ul v-if="datos.ubicacion.carpetas.length" class="space-y-2">
          <li
            v-for="u in datos.ubicacion.carpetas"
            :key="u.id"
            class="rounded-md border border-ink-100 px-3 py-2 dark:border-white/10"
          >
            <p class="font-medium text-ink-900 dark:text-white">
              <i class="fa-solid fa-warehouse mr-1 text-ink-400" aria-hidden="true" />
              {{ u.deposito ?? 'Sin depósito' }}
              <span class="text-ink-400">›</span> Estante {{ u.estante ?? '—' }}
              <span class="text-ink-400">›</span> Carpeta {{ u.carpeta ?? '—' }}
              <span class="ml-1 text-xs font-normal text-ink-500">(parte {{ u.numeroParte }})</span>
            </p>
            <p v-if="u.referencia" class="text-xs text-ink-500">{{ u.referencia }}</p>
          </li>
        </ul>
        <p v-else class="text-ink-400">
          Aún no tiene carpeta asignada.
          <template v-if="datos.ubicacion.ubicacionFisica">
            Ubicación referencial: {{ datos.ubicacion.ubicacionFisica }}.
          </template>
        </p>
        <p v-if="datos.ubicacion.numeroFolio" class="mt-2 text-xs text-ink-500">
          Folio: {{ datos.ubicacion.numeroFolio }}
        </p>
        <p v-if="datos.acta" class="text-xs text-ink-500">
          Acta de entrega: {{ datos.acta.numeroActa }} ({{ datos.acta.estado }})
        </p>
      </section>

      <section>
        <h4 class="mb-2 font-semibold text-ink-800 dark:text-ink-100">Préstamos</h4>
        <div
          v-if="datos.prestamos.length"
          class="mb-3 flex flex-wrap gap-4 text-xs text-ink-600 dark:text-ink-300"
        >
          <span>{{ datos.resumenPrestamos.total }} en total</span>
          <span>{{ datos.resumenPrestamos.activos }} activo(s)</span>
          <span :class="datos.resumenPrestamos.vencidos ? 'font-semibold text-red-600' : ''">
            {{ datos.resumenPrestamos.vencidos }} vencido(s)
          </span>
          <span>{{ datos.resumenPrestamos.conNovedad }} devuelto(s) con novedad</span>
        </div>
        <p v-if="datos.prestamos.length === 0" class="text-ink-400">
          Este comprobante nunca fue prestado.
        </p>

        <ol class="space-y-3">
          <li
            v-for="p in datos.prestamos"
            :key="`${p.tipo}-${p.id}`"
            class="rounded-md border p-3"
            :class="
              p.vencido
                ? 'border-red-300 dark:border-red-500/40'
                : 'border-ink-100 dark:border-white/10'
            "
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-medium text-ink-900 dark:text-white">
                {{ p.referencia }}
                <span class="ml-1 text-xs font-normal text-ink-500">
                  ({{ p.tipo === 'NOTA' ? 'nota oficial' : 'cuaderno' }})
                </span>
              </p>
              <div class="flex items-center gap-2">
                <span
                  v-if="p.vencido"
                  class="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-400/15 dark:text-red-300"
                >
                  Vencido hace {{ p.diasVencido }} día(s)
                </span>
                <BaseBadge :estado="p.devuelto ? 'DEVUELTO' : 'ENTREGADO'">
                  {{ p.devuelto ? 'Devuelto' : 'En préstamo' }}
                </BaseBadge>
              </div>
            </div>

            <dl class="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
              <div>
                <dt class="inline text-ink-500">Recibe:</dt>
                <dd class="inline">{{ p.solicitante }}</dd>
              </div>
              <div>
                <dt class="inline text-ink-500">Institución / área:</dt>
                <dd class="inline">{{ p.institucionOArea }}</dd>
              </div>
              <div>
                <dt class="inline text-ink-500">Salida:</dt>
                <dd class="inline">
                  {{ p.tipo === 'CUADERNO' ? fechaHora(p.fechaSalida) : fechaCorta(p.fechaSalida) }}
                </dd>
              </div>
              <div>
                <dt class="inline text-ink-500">Devolución estimada:</dt>
                <dd class="inline">{{ fechaCorta(p.fechaDevolucionEstimada) }}</dd>
              </div>
              <div>
                <dt class="inline text-ink-500">Devolución real:</dt>
                <dd class="inline">
                  {{
                    p.devuelto
                      ? p.tipo === 'CUADERNO'
                        ? fechaHora(p.fechaDevolucion)
                        : fechaCorta(p.fechaDevolucion)
                      : 'Pendiente'
                  }}
                </dd>
              </div>
              <div>
                <dt class="inline text-ink-500">
                  Tiempo {{ p.devuelto ? 'prestado' : 'transcurrido' }}:
                </dt>
                <dd class="inline">{{ p.diasPrestado }} día(s)</dd>
              </div>
              <div>
                <dt class="inline text-ink-500">Entregó (registró):</dt>
                <dd class="inline">{{ p.registradoPor ?? '—' }}</dd>
              </div>
              <div>
                <dt class="inline text-ink-500">Recibió la devolución:</dt>
                <dd class="inline">{{ p.recibidoPor ?? '—' }}</dd>
              </div>
              <div v-if="p.metodoVerificacion">
                <dt class="inline text-ink-500">Verificación:</dt>
                <dd class="inline">
                  {{ p.metodoVerificacion === 'FIRMA_MANUAL' ? 'Firma manual' : 'Huella digital' }}
                </dd>
              </div>
            </dl>

            <p v-if="p.observaciones" class="mt-2 text-xs">
              <span class="text-ink-500">Al prestar: </span>{{ p.observaciones }}
            </p>
            <p v-if="p.devuelto" class="mt-1 text-xs">
              <span class="text-ink-500">Al devolver: </span>
              <span
                :class="
                  p.condicionDevolucion === 'CON_NOVEDAD'
                    ? 'font-semibold text-orange-700 dark:text-orange-300'
                    : ''
                "
              >
                {{ p.condicionDevolucion === 'CON_NOVEDAD' ? 'con novedad' : 'conforme' }}
              </span>
              <span v-if="p.observacionesDevolucion"> — {{ p.observacionesDevolucion }}</span>
            </p>
          </li>
        </ol>
      </section>

      <section>
        <h4 class="mb-2 font-semibold text-ink-800 dark:text-ink-100">Historial de estados</h4>
        <ol class="space-y-3 border-l border-ink-200 pl-4 dark:border-white/10">
          <li v-for="h in datos.historial" :key="h.id" class="relative">
            <span class="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-seal-500" />
            <p class="text-xs text-ink-500">
              {{ fechaHora(h.fecha) }} · {{ ORIGEN[h.origen] ?? h.origen }}
              <span v-if="h.referencia"> · {{ h.referencia }}</span>
              <span v-if="h.usuario"> · {{ h.usuario }}</span>
            </p>
            <p
              v-if="h.origen === 'SISTEMA' && h.estadoAnterior === h.estadoNuevo"
              class="text-ink-900 dark:text-white"
            >
              <strong>Movimiento de ubicación</strong>
            </p>
            <p v-else class="text-ink-900 dark:text-white">
              <template v-if="h.estadoAnterior"
                >{{ ESTADO_C31_LABEL[h.estadoAnterior] }} →
              </template>
              <strong>{{ ESTADO_C31_LABEL[h.estadoNuevo] ?? h.estadoNuevo }}</strong>
            </p>
            <p v-if="h.detalle" class="text-xs text-ink-600 dark:text-ink-300">{{ h.detalle }}</p>
          </li>
        </ol>
      </section>
    </template>
  </div>
</template>
