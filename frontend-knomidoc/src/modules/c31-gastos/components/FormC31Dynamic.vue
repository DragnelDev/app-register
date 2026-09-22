<script setup lang="ts">
import { reactive } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { ComprobanteC31FormPayload } from '@/types/c31.types'

const emit = defineEmits<{ submit: [payload: ComprobanteC31FormPayload]; cancel: [] }>()

const props = defineProps<{ saving?: boolean }>()

const currentYear = new Date().getFullYear()

// El formulario inicia con un elemento por lista repetible; el usuario agrega más
// según las reglas de negocio (preventivos/devengados "2 en 1", múltiples beneficiarios)
const form = reactive<ComprobanteC31FormPayload>({
  tipoC31: 'CON_IMPUTACION',
  numeroComprobante: '',
  montoTotal: 0,
  fechaElaboracion: '',
  descripcion: '',
  numeroFolio: '',
  gestion: currentYear,
  ubicacionFisica: '',
  observaciones: '',
  preventivos: [''],
  devengados: [''],
  beneficiarios: [''],
  cheques: [],
})

function addItem(list: string[]) {
  list.push('')
}

function removeItem(list: string[], index: number) {
  if (list.length > 1) list.splice(index, 1)
}

function handleSubmit() {
  const payload: ComprobanteC31FormPayload = {
    ...form,
    preventivos: form.preventivos.filter(Boolean),
    devengados: form.devengados.filter(Boolean),
    beneficiarios: form.beneficiarios.filter(Boolean),
    cheques: form.cheques.filter(Boolean),
  }
  emit('submit', payload)
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput v-model="form.descripcion" label="Descripción / glosa del comprobante" required />
      <BaseInput
        v-model.number="form.montoTotal"
        type="number"
        step="0.01"
        label="Monto total (Bs)"
        required
      />
      <BaseInput
        v-model="form.fechaElaboracion"
        type="date"
        label="Fecha de elaboración"
        required
      />
      <BaseInput v-model.number="form.gestion" type="number" label="Gestión (año)" required />

      <div>
        <label class="mb-1 block text-sm font-medium text-ink-700 dark:text-ink-200"
          >Tipo de C31</label
        >
        <select
          v-model="form.tipoC31"
          class="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
        >
          <option value="CON_IMPUTACION">Con imputación</option>
          <option value="SIN_IMPUTACION">Sin imputación</option>
        </select>
      </div>
      <BaseInput v-model="form.numeroComprobante" label="N° de comprobante (opcional)" />
      <BaseInput v-model="form.numeroFolio" label="N° de folio (individual, si ya está foliado)" />
      <BaseInput
        v-model="form.ubicacionFisica"
        label="Ubicación física (ej. Estante 3 - Caja 12)"
      />
    </section>

    <!-- Preventivos 2 en 1 -->
    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
        N° de Preventivo (soporta "2 en 1")
      </h3>
      <div v-for="(_, i) in form.preventivos" :key="i" class="mb-2 flex gap-2">
        <BaseInput v-model="form.preventivos[i]" placeholder="Ej: PREV-001" class="flex-1" />
        <BaseButton variant="ghost" size="sm" type="button" @click="removeItem(form.preventivos, i)"
          >✕</BaseButton
        >
      </div>
      <BaseButton variant="secondary" size="sm" type="button" @click="addItem(form.preventivos)">
        + Agregar preventivo
      </BaseButton>
    </section>

    <!-- Devengados 2 en 1 -->
    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
        N° de Devengado (soporta "2 en 1")
      </h3>
      <div v-for="(_, i) in form.devengados" :key="i" class="mb-2 flex gap-2">
        <BaseInput v-model="form.devengados[i]" placeholder="Ej: DEV-001" class="flex-1" />
        <BaseButton variant="ghost" size="sm" type="button" @click="removeItem(form.devengados, i)"
          >✕</BaseButton
        >
      </div>
      <BaseButton variant="secondary" size="sm" type="button" @click="addItem(form.devengados)">
        + Agregar devengado
      </BaseButton>
    </section>

    <!-- Beneficiarios múltiples -->
    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">Beneficiarios</h3>
      <div v-for="(_, i) in form.beneficiarios" :key="i" class="mb-2 flex gap-2">
        <BaseInput
          v-model="form.beneficiarios[i]"
          placeholder="Nombre completo del beneficiario"
          class="flex-1"
        />
        <BaseButton
          variant="ghost"
          size="sm"
          type="button"
          @click="removeItem(form.beneficiarios, i)"
          >✕</BaseButton
        >
      </div>
      <BaseButton variant="secondary" size="sm" type="button" @click="addItem(form.beneficiarios)">
        + Agregar beneficiario
      </BaseButton>
    </section>

    <!-- Cheques opcionales -->
    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800 dark:text-ink-100">Cheques (opcional)</h3>
      <div v-for="(_, i) in form.cheques" :key="i" class="mb-2 flex gap-2">
        <BaseInput v-model="form.cheques[i]" placeholder="N° de cheque" class="flex-1" />
        <BaseButton variant="ghost" size="sm" type="button" @click="removeItem(form.cheques, i)"
          >✕</BaseButton
        >
      </div>
      <BaseButton variant="secondary" size="sm" type="button" @click="form.cheques.push('')">
        + Agregar cheque
      </BaseButton>
    </section>

    <BaseInput
      v-model="form.observaciones"
      label="Observaciones (opcional)"
      placeholder="Notas adicionales sobre el comprobante"
    />

    <div class="flex justify-end gap-2 border-t border-ink-100 pt-4 dark:border-white/10">
      <BaseButton variant="secondary" type="button" @click="emit('cancel')">Cancelar</BaseButton>
      <BaseButton type="submit" :loading="props.saving">Registrar comprobante</BaseButton>
    </div>
  </form>
</template>
