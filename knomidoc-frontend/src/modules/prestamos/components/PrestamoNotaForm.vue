<script setup lang="ts">
import { reactive } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { PrestamoNotaCreatePayload } from '@/types/prestamos.types'

defineProps<{ saving?: boolean }>()
const emit = defineEmits<{ submit: [payload: PrestamoNotaCreatePayload] }>()

const form = reactive<PrestamoNotaCreatePayload>({
  numeroNotaSolicitud: '',
  unidadSolicitante: '',
  aQuienSePresta: '',
  items: [{ comprobanteId: '' }],
})

function addItem() {
  form.items.push({ comprobanteId: '' })
}

function removeItem(index: number) {
  if (form.items.length > 1) form.items.splice(index, 1)
}

function handleSubmit() {
  const payload: PrestamoNotaCreatePayload = {
    ...form,
    items: form.items.filter((i) => i.comprobanteId || i.carpetaId),
  }
  emit('submit', payload)
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        v-model="form.numeroNotaSolicitud"
        label="N° de nota de solicitud"
        placeholder="Ej: NOTA-AUD-045/2026"
        required
      />
      <BaseInput
        v-model="form.unidadSolicitante"
        label="Unidad solicitante"
        placeholder="Ej: Auditoría Interna"
        required
      />
      <BaseInput v-model="form.aQuienSePresta" label="Responsable que recibe" required />
    </div>

    <section>
      <h3 class="mb-2 text-sm font-semibold text-ink-800">
        Comprobantes o carpetas incluidos en el préstamo
      </h3>
      <div v-for="(item, i) in form.items" :key="i" class="mb-2 flex gap-2">
        <BaseInput v-model="item.comprobanteId" placeholder="Código de comprobante C31" class="flex-1" />
        <BaseInput v-model="item.carpetaId" placeholder="o código de carpeta completa" class="flex-1" />
        <BaseButton variant="ghost" size="sm" type="button" @click="removeItem(i)">✕</BaseButton>
      </div>
      <BaseButton variant="secondary" size="sm" type="button" @click="addItem">
        + Agregar ítem
      </BaseButton>
    </section>

    <BaseButton type="submit" :loading="saving">Registrar préstamo en lote</BaseButton>
  </form>
</template>
