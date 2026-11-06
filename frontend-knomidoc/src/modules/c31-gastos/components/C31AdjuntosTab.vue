<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import IconButton from '@/components/ui/IconButton.vue'
import { c31Service } from '@/services/c31.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { C31Adjunto, TipoAdjuntoC31 } from '@/types/c31.types'

const props = defineProps<{ comprobanteId: number; puedeEditar: boolean }>()
/** Se avisa al subir/eliminar para refrescar el indicador "digitalizado" del listado */
const emit = defineEmits<{ cambio: [] }>()

const MAX_MB = 20
const ACEPTA = 'application/pdf,image/jpeg,image/png,image/webp'

const adjuntos = ref<C31Adjunto[]>([])
const cargando = ref(false)
const subiendo = ref(false)
const error = ref('')
const tipo = ref<TipoAdjuntoC31>('C31')
const arrastrando = ref(false)
const entrada = ref<HTMLInputElement | null>(null)

// Vista previa (PDF en iframe / imagen)
const previewAbierta = ref(false)
const previewUrl = ref('')
const previewNombre = ref('')
const previewEsPdf = ref(false)

const tamanoLegible = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`

const principal = computed(() => adjuntos.value.find((a) => a.tipo === 'C31'))

async function cargar() {
  cargando.value = true
  try {
    adjuntos.value = await c31Service.listAdjuntos(props.comprobanteId)
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudieron cargar los archivos.')
  } finally {
    cargando.value = false
  }
}

async function subir(files: FileList | File[]) {
  error.value = ''
  const lista = Array.from(files)
  if (!lista.length) return
  subiendo.value = true
  try {
    for (const file of lista) {
      if (!ACEPTA.split(',').includes(file.type)) {
        throw new Error(`“${file.name}”: solo se admiten PDF o imágenes (JPG, PNG, WEBP).`)
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        throw new Error(`“${file.name}” supera el máximo de ${MAX_MB} MB.`)
      }
      await c31Service.subirAdjunto(props.comprobanteId, file, tipo.value)
    }
    await cargar()
    emit('cambio')
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo subir el archivo.')
  } finally {
    subiendo.value = false
    if (entrada.value) entrada.value.value = ''
  }
}

function alSoltar(e: DragEvent) {
  arrastrando.value = false
  if (props.puedeEditar && e.dataTransfer?.files) void subir(e.dataTransfer.files)
}

function liberarPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

async function previsualizar(a: C31Adjunto) {
  error.value = ''
  try {
    const blob = await c31Service.obtenerAdjunto(props.comprobanteId, a.id)
    liberarPreview()
    previewUrl.value = URL.createObjectURL(new Blob([blob], { type: a.mimeType }))
    previewNombre.value = a.nombreOriginal
    previewEsPdf.value = a.mimeType === 'application/pdf'
    previewAbierta.value = true
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo abrir el archivo.')
  }
}

async function descargar(a: C31Adjunto) {
  error.value = ''
  try {
    const blob = await c31Service.obtenerAdjunto(props.comprobanteId, a.id)
    const url = URL.createObjectURL(new Blob([blob], { type: a.mimeType }))
    const link = document.createElement('a')
    link.href = url
    link.download = a.nombreOriginal
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo descargar el archivo.')
  }
}

async function eliminar(a: C31Adjunto) {
  if (!confirm(`¿Eliminar “${a.nombreOriginal}”? Esta acción no se puede deshacer.`)) return
  error.value = ''
  try {
    await c31Service.eliminarAdjunto(props.comprobanteId, a.id)
    await cargar()
    emit('cambio')
  } catch (err) {
    error.value = extractApiErrorMessage(err, 'No se pudo eliminar el archivo.')
  }
}

function cerrarPreview(abierta: boolean) {
  previewAbierta.value = abierta
  if (!abierta) liberarPreview()
}

onMounted(cargar)
onBeforeUnmount(liberarPreview)
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex items-center gap-2 rounded-md px-3 py-2 text-sm"
      :class="
        principal
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200'
          : 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200'
      "
      role="status"
    >
      <i
        :class="principal ? 'fa-solid fa-circle-check' : 'fa-solid fa-hourglass-half'"
        aria-hidden="true"
      />
      {{
        principal
          ? `Digitalizado el ${new Date(principal.fechaCarga).toLocaleDateString('es-BO')}.`
          : 'Pendiente de digitalizar: aún no se cargó el escaneo del C31.'
      }}
    </div>

    <p
      v-if="error"
      class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ error }}
    </p>

    <div v-if="puedeEditar" class="space-y-2">
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <label class="font-medium text-ink-700 dark:text-ink-200" for="adj-tipo"
          >Tipo de archivo</label
        >
        <select
          id="adj-tipo"
          v-model="tipo"
          class="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
        >
          <option value="C31">C31 escaneado</option>
          <option value="RESPALDO">Respaldo del gasto</option>
        </select>
      </div>
      <div
        class="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center text-sm transition-colors"
        :class="
          arrastrando
            ? 'border-seal-500 bg-seal-50 dark:bg-seal-400/10'
            : 'border-ink-200 dark:border-white/15'
        "
        @dragover.prevent="arrastrando = true"
        @dragleave.prevent="arrastrando = false"
        @drop.prevent="alSoltar"
      >
        <p class="text-ink-600 dark:text-ink-300">Arrastre aquí el PDF o las imágenes, o</p>
        <BaseButton size="sm" :loading="subiendo" @click="entrada?.click()">
          Seleccionar archivos
        </BaseButton>
        <p class="text-xs text-ink-400">PDF, JPG, PNG o WEBP · máx. {{ MAX_MB }} MB por archivo</p>
        <input
          ref="entrada"
          type="file"
          class="hidden"
          multiple
          :accept="ACEPTA"
          @change="(e) => subir((e.target as HTMLInputElement).files ?? [])"
        />
      </div>
    </div>

    <p v-if="cargando" class="text-sm text-ink-400">Cargando archivos…</p>
    <p v-else-if="!adjuntos.length" class="text-sm text-ink-400">
      Este comprobante no tiene archivos digitalizados.
    </p>
    <ul
      v-else
      class="divide-y divide-ink-100 rounded-md border border-ink-100 dark:divide-white/10 dark:border-white/10"
    >
      <li v-for="a in adjuntos" :key="a.id" class="flex flex-wrap items-center gap-3 px-3 py-2">
        <i
          :class="
            a.mimeType === 'application/pdf'
              ? 'fa-solid fa-file-pdf text-red-500'
              : 'fa-solid fa-file-image text-sky-500'
          "
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-ink-900 dark:text-ink-100">
            {{ a.nombreOriginal }}
          </p>
          <p class="text-xs text-ink-400">
            {{ a.tipo === 'C31' ? 'C31 escaneado' : 'Respaldo' }} · {{ tamanoLegible(a.tamano) }} ·
            {{ new Date(a.fechaCarga).toLocaleString('es-BO') }}
          </p>
        </div>
        <div class="flex gap-1">
          <IconButton
            icon="fa-eye"
            label="Vista previa"
            variant="primary"
            @click="previsualizar(a)"
          />
          <IconButton icon="fa-download" label="Descargar" @click="descargar(a)" />
          <IconButton
            v-if="puedeEditar"
            icon="fa-trash"
            label="Eliminar"
            variant="danger"
            @click="eliminar(a)"
          />
        </div>
      </li>
    </ul>

    <BaseModal
      :model-value="previewAbierta"
      :title="previewNombre"
      size="lg"
      @update:model-value="cerrarPreview"
    >
      <iframe
        v-if="previewEsPdf"
        :src="previewUrl"
        class="h-[65vh] w-full rounded border-0"
        :title="previewNombre"
      />
      <img v-else :src="previewUrl" :alt="previewNombre" class="mx-auto max-h-[65vh] rounded" />
    </BaseModal>
  </div>
</template>
