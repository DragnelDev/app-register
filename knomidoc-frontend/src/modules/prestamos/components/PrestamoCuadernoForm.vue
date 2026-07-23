<script setup lang="ts">
import { reactive } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { PrestamoCuadernoCreatePayload } from '@/types/prestamos.types'

defineProps<{ saving?: boolean }>()
const emit = defineEmits<{ submit: [payload: PrestamoCuadernoCreatePayload] }>()

const currentYear = new Date().getFullYear()

const form = reactive<PrestamoCuadernoCreatePayload>({
  comprobanteId: '',
  gestion: currentYear,
  quienRemite: '',
  aQuienSePresta: '',
})

function handleSubmit() {
  emit('submit', { ...form })
  form.comprobanteId = ''
  form.quienRemite = ''
  form.aQuienSePresta = ''
}
</script>

<template>
  <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="handleSubmit">
    <BaseInput
      v-model="form.comprobanteId"
      label="Comprobante C31 (código o folio)"
      placeholder="Ej: C31-0045"
      required
    />
    <BaseInput v-model.number="form.gestion" type="number" label="Gestión (año)" required />
    <BaseInput v-model="form.quienRemite" label="Quién remite (funcionario)" required />
    <BaseInput v-model="form.aQuienSePresta" label="A quién se presta (funcionario/oficina)" required />

    <div class="sm:col-span-2">
      <BaseButton type="submit" :loading="saving">Registrar préstamo</BaseButton>
    </div>
  </form>
</template>
