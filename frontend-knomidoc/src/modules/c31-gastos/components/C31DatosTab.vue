<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useC31Store } from '@/stores/c31.store'
import { extractApiErrorMessage } from '@/utils/http-error'
import { bs, fechaCorta } from '@/utils/estados'
import { identificadorC31, type ComprobanteC31 } from '@/types/c31.types'

const props = defineProps<{ comprobante: ComprobanteC31; puedeEditar: boolean }>()
const store = useC31Store()

const editando = ref(false)
const guardando = ref(false)
const error = ref('')
const nuevoBeneficiario = ref('')

const form = reactive({
  tipoC31: 'CON_IMPUTACION',
  numero: '',
  descripcion: '',
  montoTotal: '' as string | number,
  fechaElaboracion: '',
  numeroFolio: '',
  ubicacionFisica: '',
  observaciones: '',
  beneficiarios: [] as string[],
})

const sinCompletar = 'Sin completar'
const falta = computed(() => {
  const c = props.comprobante
  return [
    !c.beneficiarios.length && 'beneficiarios',
    !c.descripcion?.trim() && 'glosa',
    !(Number(c.montoTotal) > 0) && 'monto total',
    !c.fechaElaboracion && 'fecha',
  ].filter(Boolean) as string[]
})
const anulado = computed(() => props.comprobante.estadoFisico === 'ANULADO')

function cargar() {
  const c = props.comprobante
  form.tipoC31 = c.tipoC31
  form.numero = identificadorC31(c) ?? ''
  form.descripcion = c.descripcion ?? ''
  form.montoTotal = c.montoTotal ?? ''
  form.fechaElaboracion = c.fechaElaboracion?.slice(0, 10) ?? ''
  form.numeroFolio = c.numeroFolio ?? ''
  form.ubicacionFisica = c.ubicacionFisica ?? ''
  form.observaciones = c.observaciones ?? ''
  form.beneficiarios = c.beneficiarios.map((b) => b.nombreBeneficiario)
  error.value = ''
}
watch(
  () => props.comprobante,
  () => {
    editando.value = false
    cargar()
  },
  { immediate: true },
)

function agregar() {
  const n = nuevoBeneficiario.value.trim()
  if (!n || form.beneficiarios.some((b) => b.toUpperCase() === n.toUpperCase())) return
  form.beneficiarios.push(n)
  nuevoBeneficiario.value = ''
}

async function guardar() {
  guardando.value = true
  error.value = ''
  try {
    if (nuevoBeneficiario.value.trim()) agregar()
    const numero = form.numero.trim()
    await store.update(props.comprobante.id, {
      tipoC31: form.tipoC31 as ComprobanteC31['tipoC31'],
      numeroPreventivo: form.tipoC31 === 'CON_IMPUTACION' ? numero : undefined,
      numeroDevengado: form.tipoC31 === 'SIN_IMPUTACION' ? numero : undefined,
      descripcion: form.descripcion.trim() || undefined,
      montoTotal: Number(form.montoTotal) > 0 ? Number(form.montoTotal) : undefined,
      fechaElaboracion: form.fechaElaboracion || undefined,
      numeroFolio: form.numeroFolio.trim(),
      ubicacionFisica: form.ubicacionFisica.trim(),
      observaciones: form.observaciones.trim(),
      beneficiarios: form.beneficiarios,
    })
    editando.value = false
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudieron guardar los cambios.')
  } finally {
    guardando.value = false
  }
}

const campo =
  'w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100'
const etiqueta = 'mb-1 block text-xs font-semibold text-ink-700 dark:text-ink-200'
const titulo = 'mb-1 font-semibold text-ink-700 dark:text-ink-200'
</script>

<template>
  <div class="space-y-4 text-sm">
    <p
      v-if="!editando && falta.length && comprobante.estadoFisico === 'EN_TRAMITE'"
      class="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-400/10 dark:text-amber-200"
    >
      Faltan por completar: <strong>{{ falta.join(', ') }}</strong
      >. Al completarlos el comprobante pasa solo a “En revisión / firmado”.
    </p>
    <div v-if="!editando" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h4 :class="titulo">
            {{ comprobante.tipoC31 === 'CON_IMPUTACION' ? 'N° de preventivo' : 'N° de devengado' }}
          </h4>
          <p>{{ identificadorC31(comprobante) ?? '—' }}</p>
        </div>
        <div>
          <h4 :class="titulo">Monto total del documento</h4>
          <p>{{ comprobante.montoTotal ? `Bs ${bs(comprobante.montoTotal)}` : sinCompletar }}</p>
        </div>
        <div>
          <h4 :class="titulo">Beneficiarios</h4>
          <ul v-if="comprobante.beneficiarios.length" class="list-inside list-disc">
            <li v-for="b in comprobante.beneficiarios" :key="b.id ?? b.nombreBeneficiario">
              {{ b.nombreBeneficiario }}
            </li>
          </ul>
          <p v-else class="text-ink-400">{{ sinCompletar }}</p>
        </div>
        <div>
          <h4 :class="titulo">Fecha de elaboración</h4>
          <p>
            {{
              comprobante.fechaElaboracion ? fechaCorta(comprobante.fechaElaboracion) : sinCompletar
            }}
            · Gestión {{ comprobante.gestion }}
          </p>
        </div>
        <div>
          <h4 :class="titulo">N° de folio</h4>
          <p>{{ comprobante.numeroFolio || 'Sin asignar aún.' }}</p>
        </div>
        <div>
          <h4 :class="titulo">Ubicación física</h4>
          <p>{{ comprobante.ubicacionFisica || 'Sin asignar aún.' }}</p>
        </div>
        <div v-if="comprobante.actaEntrega">
          <h4 :class="titulo">Acta de entrega</h4>
          <p>{{ comprobante.actaEntrega.numeroActa }}</p>
        </div>
      </div>
      <div>
        <h4 :class="titulo">Descripción / glosa</h4>
        <p class="whitespace-pre-line">{{ comprobante.descripcion || sinCompletar }}</p>
      </div>
      <div v-if="comprobante.observaciones">
        <h4 :class="titulo">Observaciones</h4>
        <p class="whitespace-pre-line">{{ comprobante.observaciones }}</p>
      </div>
      <BaseButton
        v-if="puedeEditar && !anulado"
        size="sm"
        variant="secondary"
        @click="editando = true"
      >
        Completar o corregir datos
      </BaseButton>
    </div>

    <form v-else class="space-y-4" @submit.prevent="guardar">
      <p
        v-if="error"
        class="rounded-md bg-red-50 px-3 py-2 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ error }}
      </p>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label :class="etiqueta">Tipo de C31</label>
          <select v-model="form.tipoC31" :class="campo">
            <option value="CON_IMPUTACION">Con imputación</option>
            <option value="SIN_IMPUTACION">Sin imputación</option>
          </select>
        </div>
        <div>
          <label :class="etiqueta">{{
            form.tipoC31 === 'CON_IMPUTACION' ? 'N° de preventivo' : 'N° de devengado'
          }}</label>
          <input v-model="form.numero" type="text" :class="campo" />
        </div>
        <div>
          <label :class="etiqueta">Monto total (Bs)</label>
          <input v-model="form.montoTotal" type="number" step="0.01" :class="campo" />
        </div>
        <div>
          <label :class="etiqueta">Fecha de elaboración</label>
          <input v-model="form.fechaElaboracion" type="date" :class="campo" />
        </div>
        <div>
          <label :class="etiqueta">N° de folio</label>
          <input v-model="form.numeroFolio" type="text" :class="campo" />
        </div>
        <div>
          <label :class="etiqueta">Ubicación física (estante / caja / carpeta)</label>
          <input v-model="form.ubicacionFisica" type="text" :class="campo" />
        </div>
      </div>

      <div>
        <label :class="etiqueta">Beneficiarios</label>
        <ul class="mb-2 space-y-1">
          <li
            v-for="(b, i) in form.beneficiarios"
            :key="b"
            class="flex items-center justify-between rounded border border-ink-100 px-2 py-1 dark:border-white/10"
          >
            <span>{{ b }}</span>
            <button
              type="button"
              class="text-xs text-red-600 hover:underline"
              @click="form.beneficiarios.splice(i, 1)"
            >
              Quitar
            </button>
          </li>
        </ul>
        <div class="flex gap-2">
          <input
            v-model="nuevoBeneficiario"
            type="text"
            :class="campo"
            placeholder="Agregar beneficiario"
            @keydown.enter.prevent="agregar"
          />
          <BaseButton type="button" variant="secondary" size="sm" @click="agregar"
            >Agregar</BaseButton
          >
        </div>
        <p class="mt-1 text-xs text-ink-400">
          Un beneficiario con pagos registrados no se puede quitar.
        </p>
      </div>

      <div>
        <label :class="etiqueta">Descripción / glosa</label>
        <textarea v-model="form.descripcion" rows="3" :class="campo" />
      </div>
      <div>
        <label :class="etiqueta">Observaciones</label>
        <textarea v-model="form.observaciones" rows="2" :class="campo" />
      </div>

      <div class="flex justify-end gap-2">
        <BaseButton
          type="button"
          variant="ghost"
          size="sm"
          :disabled="guardando"
          @click="
            editando = false;
            cargar()
          "
          >Cancelar</BaseButton
        >
        <BaseButton type="submit" size="sm" :loading="guardando">Guardar cambios</BaseButton>
      </div>
    </form>
  </div>
</template>
