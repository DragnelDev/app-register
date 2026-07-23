<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useC31Store } from '@/stores/c31.store'
import { usePrestamosStore } from '@/stores/prestamos.store'
import { useAuthStore } from '@/stores/auth.store'
import BaseBadge from '@/components/ui/BaseBadge.vue'

const c31Store = useC31Store()
const prestamosStore = usePrestamosStore()
const auth = useAuthStore()

onMounted(() => {
  c31Store.fetchList()
  prestamosStore.fetchCuaderno()
  prestamosStore.fetchNotas()
})

const stats = computed(() => [
  { label: 'Comprobantes C31 registrados', value: c31Store.total },
  { label: 'Pendientes de aprobación', value: c31Store.pendientes.length },
  { label: 'Préstamos (cuaderno) activos', value: prestamosStore.cuadernoPrestados.length },
  { label: 'Préstamos (nota oficial) activos', value: prestamosStore.notasPrestadas.length },
])
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Hola, {{ auth.usuario?.nombreCompleto ?? 'usuario' }}</h1>
      <p class="text-sm text-ink-400">Resumen del estado actual del archivo documental.</p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label" class="card p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-ink-400">{{ stat.label }}</p>
        <p class="mt-2 font-display text-3xl font-semibold text-ink-900">{{ stat.value }}</p>
      </div>
    </div>

    <div class="card p-5">
      <h2 class="mb-3 text-base font-semibold text-ink-900">Últimos comprobantes registrados</h2>
      <ul class="divide-y divide-ink-100">
        <li
          v-for="c in c31Store.items.slice(0, 6)"
          :key="c.id"
          class="flex items-center justify-between py-3 text-sm"
        >
          <div>
            <p class="font-medium text-ink-800">{{ c.descripcion }}</p>
            <p class="text-xs text-ink-400">Bs {{ c.montoTotal.toFixed(2) }} · {{ c.fechaElaboracion }}</p>
          </div>
          <BaseBadge :estado="c.estadoAprobacion" />
        </li>
        <li v-if="c31Store.items.length === 0" class="py-6 text-center text-sm text-ink-400">
          Aún no hay comprobantes registrados.
        </li>
      </ul>
    </div>
  </div>
</template>
