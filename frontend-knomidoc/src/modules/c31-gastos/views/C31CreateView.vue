<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import FormC31Dynamic from '../components/FormC31Dynamic.vue'
import { c31Service } from '@/services/c31.service'
import type { ComprobanteC31FormPayload } from '@/types/c31.types'

const router = useRouter()
const saving = ref(false)

async function handleSubmit(payload: ComprobanteC31FormPayload) {
  saving.value = true
  try {
    await c31Service.create(payload)
    router.push({ name: 'c31-list' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-4">
    <div>
      <h1 class="text-2xl font-semibold text-ink-900 dark:text-white">Registrar comprobante C31</h1>
      <p class="text-sm text-ink-500 dark:text-ink-400">
        Soporta preventivos y devengados "2 en 1", múltiples beneficiarios y cheques opcionales.
        Úsalo para registrar un comprobante suelto (sin acta de entrega); si el comprobante llega
        como parte de un lote de Tesorería, agrégalo desde el acta correspondiente.
      </p>
    </div>

    <div class="card p-6">
      <FormC31Dynamic :saving="saving" @submit="handleSubmit" @cancel="router.back()" />
    </div>
  </div>
</template>
