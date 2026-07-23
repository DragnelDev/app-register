<script setup lang="ts">
import { reactive } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { ComprobanteC31FormPayload } from '@/types/c31.types'

const emit = defineEmits<{ submit: [payload: ComprobanteC31FormPayload]; cancel: [] }>()

const props = defineProps<{ saving?: boolean }>()

// El formulario inicia con un elemento por lista repetible; el usuario agrega más
// según las reglas de negocio (preventivos 2 en 1, múltiples beneficiarios, hasta 5 carpetas)
const form = reactive<ComprobanteC31FormPayload>({
  montoTotal: 0,
  fechaElaboracion: '',
  descripcion: '',
  numeroFolio: null,
  estaFoliado: false,
  preventivos: [''],
  devengados: [''],
  beneficiarios: [''],
  cheques: [],
  carpetas: [{ carpetaId: '', numeroParte: 1 }],
})

function addItem(list: string[]) {
  list.push('')
}

function removeItem(list: string[], index: number) {
  if (list.length > 1) list.splice(index, 1)
}

function addCarpeta() {
  if (form.carpetas.length >= 5) return // regla de negocio: máximo 5 carpetas por comprobante
  form.carpetas.push({ carpetaId: '', numeroParte: form.carpetas.length + 1 })
}

function removeCarpeta(index: number) {
  if (form.carpetas.length > 1) form.carpetas.splice(index, 1)
}

function handleSubmit() {
  const payload: ComprobanteC31FormPayload = {
    ...form,
    preventivos: form.preventivos.filter(Boolean),
    devengados: form.devengados.filter(Boolean),
    beneficiarios: form.beneficiarios.filter(Boolean),
    cheques: form.cheques.filter(Boolean),
    carpetas: form.carpetas.filter((c) => c.carpetaId),
  }
  emit('submit', payload)
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput v-model="form.descripcion" label="Descripción / glosa del comprobante" required />
      <BaseInput v-model.number="form.montoTotal" type="number" label="Monto total (Bs)" required />
      <BaseInput v-model="form.fechaElaboracion" type="date" label="Fecha de elaboración" required />
      <BaseInput v-model.number="form.numeroFolio" type="number" label="N° de folio (si ya está foliado)" />
    </section>

    <label class="flex items-center gap-2 text-sm text-ink-700">
      <input v-model="form.estaFoliado" type="checkbox" class="rounded border-ink-300" />
      Este comprobante ya está foliado
    </label>

    <!-- Preventivos 2 en 1 -->
    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800">N° de Preventivo (soporta "2 en 1")</h3>
      <div v-for="(_, i) in form.preventivos" :key="i" class="mb-2 flex gap-2">
        <BaseInput v-model="form.preventivos[i]" placeholder="Ej: PREV-001" class="flex-1" />
        <BaseButton variant="ghost" size="sm" type="button" @click="removeItem(form.preventivos, i)">✕</BaseButton>
      </div>
      <BaseButton variant="secondary" size="sm" type="button" @click="addItem(form.preventivos)">
        + Agregar preventivo
      </BaseButton>
    </section>

    <!-- Devengados 2 en 1 -->
    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800">N° de Devengado (soporta "2 en 1")</h3>
      <div v-for="(_, i) in form.devengados" :key="i" class="mb-2 flex gap-2">
        <BaseInput v-model="form.devengados[i]" placeholder="Ej: DEV-001" class="flex-1" />
        <BaseButton variant="ghost" size="sm" type="button" @click="removeItem(form.devengados, i)">✕</BaseButton>
      </div>
      <BaseButton variant="secondary" size="sm" type="button" @click="addItem(form.devengados)">
        + Agregar devengado
      </BaseButton>
    </section>

    <!-- Beneficiarios múltiples -->
    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800">Beneficiarios</h3>
      <div v-for="(_, i) in form.beneficiarios" :key="i" class="mb-2 flex gap-2">
        <BaseInput v-model="form.beneficiarios[i]" placeholder="Nombre completo del beneficiario" class="flex-1" />
        <BaseButton variant="ghost" size="sm" type="button" @click="removeItem(form.beneficiarios, i)">✕</BaseButton>
      </div>
      <BaseButton variant="secondary" size="sm" type="button" @click="addItem(form.beneficiarios)">
        + Agregar beneficiario
      </BaseButton>
    </section>

    <!-- Cheques opcionales -->
    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800">Cheques (opcional)</h3>
      <div v-for="(_, i) in form.cheques" :key="i" class="mb-2 flex gap-2">
        <BaseInput v-model="form.cheques[i]" placeholder="N° de cheque" class="flex-1" />
        <BaseButton variant="ghost" size="sm" type="button" @click="removeItem(form.cheques, i)">✕</BaseButton>
      </div>
      <BaseButton variant="secondary" size="sm" type="button" @click="form.cheques.push('')">
        + Agregar cheque
      </BaseButton>
    </section>

    <!-- Ubicación física en carpetas, hasta 5 -->
    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800">
        Ubicación física en carpetas (hasta 5, ej. Parte 1 de 5)
      </h3>
      <div v-for="(carpeta, i) in form.carpetas" :key="i" class="mb-2 flex items-end gap-2">
        <BaseInput v-model="carpeta.carpetaId" label="Código de carpeta" placeholder="CARP-2026-001" class="flex-1" />
        <BaseInput v-model.number="carpeta.numeroParte" type="number" label="N° de parte" class="w-28" />
        <BaseButton variant="ghost" size="sm" type="button" @click="removeCarpeta(i)">✕</BaseButton>
      </div>
      <BaseButton
        variant="secondary"
        size="sm"
        type="button"
        :disabled="form.carpetas.length >= 5"
        @click="addCarpeta"
      >
        + Agregar carpeta ({{ form.carpetas.length }}/5)
      </BaseButton>
    </section>

    <div class="flex justify-end gap-2 border-t border-ink-100 pt-4">
      <BaseButton variant="secondary" type="button" @click="emit('cancel')">Cancelar</BaseButton>
      <BaseButton type="submit" :loading="props.saving">Registrar comprobante</BaseButton>
    </div>
  </form>
</template>
