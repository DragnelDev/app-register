<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { c31Service } from '@/services/c31.service'
import { actasEntregaService } from '@/services/actas-entrega.service'
import { useAuthStore } from '@/stores/auth.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import {
  required,
  maxLength,
  isValidDate,
  runValidators,
  codigoDocumento,
  nombrePersona,
  fechaRazonable,
} from '@/utils/validators'
import { bs } from '@/utils/estados'
import { rotuloC31, type ComprobanteC31 } from '@/types/c31.types'
import type { ActaEntrega, ActaEntregaCreatePayload } from '@/types/actas-entrega.types'

const props = defineProps<{
  modelValue: boolean
  acta?: ActaEntrega | null
  saving?: boolean
  serverError?: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [payload: ActaEntregaCreatePayload]
}>()

const auth = useAuthStore()
const form = reactive({
  numeroActa: '',
  unidadEmisora: 'Tesorería',
  responsableEntrega: '',
  responsableRecepcion: '',
  fechaRecepcion: new Date().toISOString().slice(0, 10),
  observaciones: '',
})
const seleccion = ref<Set<number>>(new Set())
const candidatos = ref<ComprobanteC31[]>([])
const busqueda = ref('')
const cargando = ref(false)
const errorCarga = ref('')
const intentado = ref(false)

const soloLectura = computed(() => Boolean(props.acta && props.acta.estado !== 'BORRADOR'))

async function cargarCandidatos() {
  cargando.value = true
  errorCarga.value = ''
  try {
    // Firmados (En revisión) que todavía no van en ninguna acta
    // El remitente no tiene acceso al listado general: usa el endpoint de candidatos
    const libres = auth.esRemitente
      ? { data: await actasEntregaService.candidatos(busqueda.value || undefined) }
      : await c31Service.list({
          estadoFisico: 'EN_REVISION',
          sinActa: true,
          search: busqueda.value || undefined,
          pageSize: 100,
        })
    const propios = props.acta?.comprobantesC31 ?? []
    const porId = new Map<string, ComprobanteC31>()
    ;[...propios, ...libres.data].forEach((c) => porId.set(String(c.id), c))
    candidatos.value = [...porId.values()]
  } catch (err) {
    errorCarga.value = extractApiErrorMessage(err, 'No se pudieron cargar los comprobantes.')
  } finally {
    cargando.value = false
  }
}

watch(
  () => [props.modelValue, props.acta],
  () => {
    if (!props.modelValue) return
    const a = props.acta
    form.numeroActa = a?.numeroActa ?? ''
    form.unidadEmisora = a?.unidadEmisora ?? 'Tesorería'
    form.responsableEntrega = a?.responsableEntrega ?? (auth.esRemitente ? (auth.usuario?.nombreCompleto ?? '') : '')
    form.responsableRecepcion = a?.responsableRecepcion ?? ''
    form.fechaRecepcion = a?.fechaRecepcion?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
    form.observaciones = a?.observaciones ?? ''
    seleccion.value = new Set((a?.comprobantesC31 ?? []).map((c) => Number(c.id)))
    intentado.value = false
    busqueda.value = ''
    cargarCandidatos()
  },
  { immediate: true },
)

let temporizador: ReturnType<typeof setTimeout> | undefined
watch(busqueda, () => {
  clearTimeout(temporizador)
  temporizador = setTimeout(cargarCandidatos, 350)
})

function alternar(c: ComprobanteC31) {
  if (soloLectura.value) return
  const id = Number(c.id)
  const s = new Set(seleccion.value)
  s.has(id) ? s.delete(id) : s.add(id)
  seleccion.value = s
}
const todosMarcados = computed(
  () =>
    candidatos.value.length > 0 && candidatos.value.every((c) => seleccion.value.has(Number(c.id))),
)
function alternarTodos() {
  if (soloLectura.value) return
  seleccion.value = todosMarcados.value
    ? new Set()
    : new Set([...seleccion.value, ...candidatos.value.map((c) => Number(c.id))])
}

const totalSeleccionado = computed(() =>
  candidatos.value
    .filter((c) => seleccion.value.has(Number(c.id)))
    .reduce((s, c) => s + Number(c.montoTotal || 0), 0),
)

const errores = computed(() => ({
  numeroActa:
    runValidators(form.numeroActa, [
      maxLength(50),
      codigoDocumento(),
    ]) ?? '',
  responsableEntrega:
    runValidators(form.responsableEntrega, [
      required('Indique quién entrega'),
      nombrePersona(),
      maxLength(150),
    ]) ?? '',
  responsableRecepcion:
    (form.responsableRecepcion.trim()
      ? runValidators(form.responsableRecepcion, [nombrePersona(), maxLength(150)])
      : '') ?? '',
  fechaRecepcion:
    runValidators(form.fechaRecepcion, [
      required('La fecha es obligatoria'),
      isValidDate(),
      fechaRazonable(),
    ]) ?? '',
  comprobantes: seleccion.value.size === 0 ? 'Marque al menos un comprobante a entregar' : '',
}))

function handleSubmit() {
  intentado.value = true
  if (Object.values(errores.value).some(Boolean)) return
  emit('save', {
    ...form,
    numeroActa: form.numeroActa.trim() || undefined,
    responsableRecepcion: form.responsableRecepcion.trim() || undefined,
    comprobanteIds: [...seleccion.value],
  })
}
const ver = (e: string) => (intentado.value ? e : '')
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="
      acta
        ? soloLectura
          ? `Acta ${acta.numeroActa}`
          : 'Editar acta de entrega'
        : 'Registrar acta de entrega'
    "
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="acta-entrega-form" class="space-y-5" @submit.prevent="handleSubmit">
      <p
        v-if="serverError"
        class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ serverError }}
      </p>
      <p
        v-if="soloLectura"
        class="rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-600 dark:bg-white/5 dark:text-ink-300"
      >
        El acta está {{ acta?.estado === 'RECIBIDA' ? 'recibida' : 'anulada' }}: solo se puede
        consultar.
      </p>

      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          v-model="form.numeroActa"
          label="N° de acta (automático si se deja vacío)"
          placeholder="Se asigna al guardar (AE-2026-001)"
          :disabled="soloLectura"
          :error="ver(errores.numeroActa)"
        />
        <BaseInput v-model="form.unidadEmisora" label="Unidad emisora" :disabled="soloLectura" />
        <BaseInput
          v-model="form.responsableEntrega"
          label="Responsable de entrega"
          required
          :disabled="soloLectura"
          :error="ver(errores.responsableEntrega)"
        />
        <BaseInput
          v-model="form.responsableRecepcion"
          label="Responsable de recepción (Archivo) — opcional"
          :disabled="soloLectura"
          :error="ver(errores.responsableRecepcion)"
        />
        <BaseInput
          v-model="form.fechaRecepcion"
          type="date"
          label="Fecha de entrega"
          required
          :disabled="soloLectura"
          :error="ver(errores.fechaRecepcion)"
        />
        <BaseInput
          v-model="form.observaciones"
          label="Observaciones (opcional)"
          :disabled="soloLectura"
        />
      </section>

      <section>
        <div class="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 class="text-sm font-semibold text-ink-800 dark:text-ink-100">
              Comprobantes a entregar
            </h3>
            <p class="text-xs text-ink-500">
              Solo aparecen los “En revisión / firmado” que aún no están en un acta.
            </p>
          </div>
          <input
            v-if="!soloLectura"
            v-model="busqueda"
            type="search"
            placeholder="Buscar por N°, glosa o beneficiario…"
            class="w-64 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
          />
        </div>

        <p v-if="errorCarga" class="mb-2 text-sm text-red-600">{{ errorCarga }}</p>
        <div class="max-h-72 overflow-auto rounded-md border border-ink-100 dark:border-white/10">
          <table class="w-full border-collapse text-sm">
            <thead
              class="sticky top-0 border-b border-ink-100 bg-ink-50 dark:border-white/10 dark:bg-ink-950"
            >
              <tr>
                <th class="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    :checked="todosMarcados"
                    :disabled="soloLectura || !candidatos.length"
                    aria-label="Marcar todos"
                    @change="alternarTodos"
                  />
                </th>
                <th class="table-header-cell">N° Prev / Dev</th>
                <th class="table-header-cell">Beneficiario</th>
                <th class="table-header-cell text-right">Monto (Bs)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100 dark:divide-white/10">
              <tr v-if="cargando">
                <td colspan="4" class="px-3 py-5 text-center text-ink-400">Cargando…</td>
              </tr>
              <tr v-else-if="!candidatos.length">
                <td colspan="4" class="px-3 py-5 text-center text-ink-400">
                  No hay comprobantes firmados pendientes de entrega.
                </td>
              </tr>
              <tr
                v-for="c in candidatos"
                :key="c.id"
                class="cursor-pointer hover:bg-ink-50 dark:hover:bg-white/5"
                @click="alternar(c)"
              >
                <td class="px-3 py-2">
                  <input
                    type="checkbox"
                    :checked="seleccion.has(Number(c.id))"
                    :disabled="soloLectura"
                    @click.stop
                    @change="alternar(c)"
                  />
                </td>
                <td class="table-cell font-mono text-xs">{{ rotuloC31(c) ?? c.id }}</td>
                <td class="table-cell">
                  {{ c.beneficiarios.map((b) => b.nombreBeneficiario).join(', ') || '—' }}
                </td>
                <td class="table-cell text-right">{{ bs(c.montoTotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-1 text-xs text-ink-600 dark:text-ink-300">
          {{ seleccion.size }} marcado(s) · Total Bs {{ bs(totalSeleccionado) }}
        </p>
        <p v-if="intentado && errores.comprobantes" class="mt-1 text-xs text-red-600">
          {{ errores.comprobantes }}
        </p>
      </section>
    </form>

    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)">{{
        soloLectura ? 'Cerrar' : 'Cancelar'
      }}</BaseButton>
      <BaseButton v-if="!soloLectura" type="submit" form="acta-entrega-form" :loading="saving"
        >Guardar acta</BaseButton
      >
    </template>
  </BaseModal>
</template>
