<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import FormC31Dynamic from '../components/FormC31Dynamic.vue'
import { c31Service } from '@/services/c31.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { ComprobanteC31FormPayload } from '@/types/c31.types'

const router = useRouter()
const saving = ref(false)
const serverError = ref('')

async function handleSubmit(payload: ComprobanteC31FormPayload) {
  saving.value = true
  serverError.value = ''
  try {
    await c31Service.create(payload)
    router.push({ name: 'c31-list' })
  } catch (err) {
    serverError.value = extractApiErrorMessage(err, 'No se pudo registrar el comprobante.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-4">
    <div class="card p-6 sm:p-8">
      <h1 class="text-2xl font-semibold text-ink-900 dark:text-white">Registrar comprobante C31</h1>
      <p class="mb-6 mt-1 text-sm text-ink-500 dark:text-ink-400">
        Reserva el número del comprobante. Solo con el N° queda “En trámite”; al completar tipo,
        beneficiarios, glosa, monto y fecha pasa a “En revisión / firmado”. El folio, la ubicación y
        los pagos se completan después desde el detalle.
      </p>
      <FormC31Dynamic :saving="saving" :server-error="serverError" @submit="handleSubmit" />
    </div>
  </div>
</template>
