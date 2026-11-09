<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { prestamosService } from '@/services/prestamos.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { PrestamoCuaderno } from '@/types/prestamos.types'

/** Evidencia (foto del cuaderno firmado) de un préstamo: ver, subir o reemplazar. Una por lote. */
const props = defineProps<{ modelValue: boolean; prestamo: PrestamoCuaderno | null; puedeEditar: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; changed: [] }>()

type Momento = 'salida' | 'devolucion'
const urls = ref<Record<Momento, string>>({ salida: '', devolucion: '' })
const tiene = ref<Record<Momento, boolean>>({ salida: false, devolucion: false })
const cargando = ref<Momento | null>(null)
const error = ref('')

function liberar() {
  for (const m of ['salida', 'devolucion'] as Momento[]) {
    if (urls.value[m]) URL.revokeObjectURL(urls.value[m])
    urls.value[m] = ''
  }
}

async function cargar() {
  liberar()
  error.value = ''
  const p = props.prestamo
  if (!p) return
  tiene.value = { salida: Boolean(p.evidenciaSalida), devolucion: Boolean(p.evidenciaDevolucion) }
  for (const m of ['salida', 'devolucion'] as Momento[]) {
    if (!tiene.value[m]) continue
    try {
      urls.value[m] = await prestamosService.urlEvidenciaCuaderno(p.id, m)
    } catch {
      tiene.value[m] = false
    }
  }
}
watch(() => [props.modelValue, props.prestamo?.id], () => props.modelValue && cargar())
onBeforeUnmount(liberar)

async function elegir(m: Momento, e: Event) {
  const input = e.target as HTMLInputElement
  const archivo = input.files?.[0]
  input.value = ''
  if (!archivo || !props.prestamo) return
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) return (error.value = 'Elija una imagen JPG, PNG o WEBP')
  if (archivo.size > 10 * 1024 * 1024) return (error.value = 'La imagen supera los 10 MB')
  cargando.value = m
  error.value = ''
  try {
    await prestamosService.subirEvidenciaCuaderno(props.prestamo.id, m, archivo)
    if (m === 'salida') props.prestamo.evidenciaSalida = 'cargada'
    else props.prestamo.evidenciaDevolucion = 'cargada'
    await cargar()
    emit('changed')
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo subir la imagen.')
  } finally {
    cargando.value = null
  }
}
</script>

<template>
  <BaseModal :model-value="modelValue" size="lg" title="Evidencia del préstamo" @update:model-value="emit('update:modelValue', $event)">
    <p v-if="error" class="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>
    <p class="mb-3 text-xs text-ink-500">
      Foto del cuaderno firmado. Es una por préstamo (aplica a todos los comprobantes que salieron juntos).
    </p>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <section v-for="m in (['salida', 'devolucion'] as const)" :key="m" class="rounded-lg border border-ink-100 p-3 dark:border-white/10">
        <h3 class="mb-2 text-sm font-semibold">{{ m === 'salida' ? 'Salida' : 'Devolución' }}</h3>
        <a v-if="urls[m]" :href="urls[m]" target="_blank" rel="noopener">
          <img :src="urls[m]" :alt="`Evidencia de ${m}`" class="max-h-64 w-full rounded-md object-contain" />
        </a>
        <p v-else class="py-8 text-center text-xs text-ink-400">
          {{ m === 'devolucion' && !prestamo?.devuelto ? 'Aún no se devolvió' : 'Sin imagen cargada' }}
        </p>
        <label
          v-if="puedeEditar && (m === 'salida' || prestamo?.devuelto)"
          class="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium hover:bg-ink-50 dark:border-white/10"
        >
          <i class="fa-solid fa-camera" aria-hidden="true" />
          {{ cargando === m ? 'Subiendo…' : tiene[m] ? 'Reemplazar imagen' : 'Subir imagen' }}
          <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" :disabled="cargando !== null" @change="elegir(m, $event)" />
        </label>
      </section>
    </div>
    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)">Cerrar</BaseButton>
    </template>
  </BaseModal>
</template>
