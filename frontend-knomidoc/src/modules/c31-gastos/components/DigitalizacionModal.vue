<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { c31Service } from '@/services/c31.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { C31Adjunto, TipoAdjuntoC31 } from '@/types/c31.types'

/**
 * Digitalización rápida: fotos/escaneos (JPG/PNG) → se ordenan → un solo PDF adjunto al C31.
 * Las imágenes se reducen en el navegador (máx. 2000 px, JPEG 80 %) antes de enviarlas.
 */
const props = defineProps<{ modelValue: boolean; comprobanteId: number }>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  listo: [adjunto: C31Adjunto, paginas: number]
}>()

const MAX_IMAGENES = 40
const MAX_TOTAL_MB = 80
const LADO_MAX = 2000

interface Pagina {
  id: number
  nombre: string
  blob: Blob
  url: string
}

let contador = 0
const paginas = ref<Pagina[]>([])
const tipo = ref<TipoAdjuntoC31>('C31')
const error = ref('')
const preparando = ref(false)
const enviando = ref(false)
const progreso = ref(0)
const arrastrando = ref(false)
const arrastrada = ref<number | null>(null)
const sobre = ref<number | null>(null)
const entrada = ref<HTMLInputElement | null>(null)

const pesoTotal = computed(() => paginas.value.reduce((s, p) => s + p.blob.size, 0))
const legible = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`

function liberar() {
  paginas.value.forEach((p) => URL.revokeObjectURL(p.url))
  paginas.value = []
}

/** Reduce y re-codifica a JPEG; `giro` en grados (0/90/180/270). Respeta la orientación EXIF del celular. */
async function procesar(origen: Blob, giro = 0): Promise<Blob> {
  const bmp = await createImageBitmap(origen)
  const escala = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * escala)
  const h = Math.round(bmp.height * escala)
  const lienzo = document.createElement('canvas')
  const lado = giro % 180 !== 0
  lienzo.width = lado ? h : w
  lienzo.height = lado ? w : h
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('El navegador no permite procesar imágenes')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, lienzo.width, lienzo.height)
  ctx.translate(lienzo.width / 2, lienzo.height / 2)
  ctx.rotate((giro * Math.PI) / 180)
  ctx.drawImage(bmp, -w / 2, -h / 2, w, h)
  bmp.close()
  const salida = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/jpeg', 0.8))
  if (!salida) throw new Error('No se pudo procesar la imagen')
  // Si no se redujo ni se giró, se conserva el original cuando pesa menos
  return giro === 0 && salida.size >= origen.size ? origen : salida
}

async function agregar(files: FileList | File[]) {
  error.value = ''
  const lista = Array.from(files)
  if (!lista.length) return
  preparando.value = true
  try {
    for (const f of lista) {
      if (!['image/jpeg', 'image/png'].includes(f.type)) {
        error.value = `“${f.name}” se omitió: solo se admiten imágenes JPG o PNG.`
        continue
      }
      if (paginas.value.length >= MAX_IMAGENES) {
        error.value = `Máximo ${MAX_IMAGENES} imágenes por PDF.`
        break
      }
      const blob = await procesar(f)
      paginas.value.push({ id: ++contador, nombre: f.name, blob, url: URL.createObjectURL(blob) })
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo leer una de las imágenes.'
  } finally {
    preparando.value = false
    if (entrada.value) entrada.value.value = ''
  }
}

function alSoltarArchivos(e: DragEvent) {
  arrastrando.value = false
  if (e.dataTransfer?.files?.length) void agregar(e.dataTransfer.files)
}

// --- Orden y edición ---
function mover(desde: number, hasta: number) {
  if (
    desde < 0 ||
    desde >= paginas.value.length ||
    hasta < 0 ||
    hasta >= paginas.value.length ||
    desde === hasta
  )
    return
  const [p] = paginas.value.splice(desde, 1)
  if (!p) return
  paginas.value.splice(hasta, 0, p)
}

function quitar(i: number) {
  const pagina = paginas.value[i]
  if (!pagina) return
  URL.revokeObjectURL(pagina.url)
  paginas.value.splice(i, 1)
}

async function girar(i: number) {
  const p = paginas.value[i]
  if (!p) return
  try {
    const blob = await procesar(p.blob, 90)
    const indiceActual = paginas.value.findIndex((pagina) => pagina.id === p.id)
    if (indiceActual === -1) return
    URL.revokeObjectURL(p.url)
    paginas.value[indiceActual] = { ...p, blob, url: URL.createObjectURL(blob) }
  } catch {
    error.value = 'No se pudo girar la imagen.'
  }
}

function inicioArrastre(i: number, e: DragEvent) {
  arrastrada.value = i
  e.dataTransfer?.setData('text/plain', String(i)) // Firefox exige datos para iniciar el arrastre
}
function soltarSobre(i: number) {
  if (arrastrada.value !== null) mover(arrastrada.value, i)
  arrastrada.value = null
  sobre.value = null
}

// --- Envío ---
async function generar() {
  if (!paginas.value.length || enviando.value) return
  if (pesoTotal.value > MAX_TOTAL_MB * 1024 * 1024) {
    error.value = `El peso total supera ${MAX_TOTAL_MB} MB: elimine algunas imágenes.`
    return
  }
  error.value = ''
  enviando.value = true
  progreso.value = 0
  try {
    const r = await c31Service.digitalizar(
      props.comprobanteId,
      paginas.value.map(
        (p, i) =>
          new File([p.blob], `pagina-${String(i + 1).padStart(2, '0')}.jpg`, { type: p.blob.type }),
      ),
      tipo.value,
      (pct) => (progreso.value = pct),
    )
    emit('listo', r.adjunto, r.paginas)
    // `cerrar` ignora la petición mientras `enviando` sea true; hay que liberarlo
    // antes, o el modal se quedaba abierto tras una subida correcta.
    enviando.value = false
    cerrar(false)
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudo generar el PDF.')
  } finally {
    enviando.value = false
  }
}

function cerrar(v: boolean) {
  if (enviando.value) return
  emit('update:modelValue', v)
}

watch(
  () => props.modelValue,
  (abierto) => {
    if (!abierto) {
      liberar()
      error.value = ''
      progreso.value = 0
    }
  },
)
onBeforeUnmount(liberar)
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Digitalización rápida: fotos a PDF"
    size="lg"
    @update:model-value="cerrar"
  >
    <div class="space-y-4">
      <p
        v-if="error"
        class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ error }}
      </p>

      <div class="flex flex-wrap items-center gap-3 text-sm">
        <label class="font-medium text-ink-700 dark:text-ink-200" for="dig-tipo"
          >Adjuntar como</label
        >
        <select
          id="dig-tipo"
          v-model="tipo"
          :disabled="enviando"
          class="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm dark:border-white/10 dark:bg-ink-950 dark:text-ink-100"
        >
          <option value="C31">C31 escaneado (marca “digitalizado”)</option>
          <option value="RESPALDO">Respaldo del gasto</option>
        </select>
      </div>

      <div
        class="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center text-sm transition-colors"
        :class="
          arrastrando
            ? 'border-seal-500 bg-seal-50 dark:bg-seal-400/10'
            : 'border-ink-200 bg-transparent dark:border-white/15 dark:bg-white/[0.03]'
        "
        @dragover.prevent="arrastrando = true"
        @dragleave.prevent="arrastrando = false"
        @drop.prevent="alSoltarArchivos"
      >
        <p class="text-ink-600 dark:text-ink-300">Arrastre las fotos aquí, o</p>
        <BaseButton size="sm" :loading="preparando" :disabled="enviando" @click="entrada?.click()">
          Seleccionar fotos / usar cámara
        </BaseButton>
        <p class="text-xs text-ink-400">
          JPG o PNG · hasta {{ MAX_IMAGENES }} imágenes · se reducen automáticamente
        </p>
        <input
          ref="entrada"
          type="file"
          class="hidden"
          multiple
          accept="image/jpeg,image/png"
          @change="(e) => agregar((e.target as HTMLInputElement).files ?? [])"
        />
      </div>

      <div v-if="paginas.length">
        <p class="mb-2 text-xs text-ink-500 dark:text-ink-400">
          {{ paginas.length }} página(s) · {{ legible(pesoTotal) }} · Arrastre una miniatura o use
          las flechas para ordenar. La página 1 será la primera del PDF.
        </p>
        <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <li
            v-for="(p, i) in paginas"
            :key="p.id"
            draggable="true"
            class="group relative overflow-hidden rounded-md border bg-white dark:bg-ink-950"
            :class="
              sobre === i
                ? 'border-seal-500 ring-2 ring-seal-400/50'
                : 'border-ink-200 dark:border-white/10'
            "
            @dragstart="inicioArrastre(i, $event)"
            @dragover.prevent="sobre = i"
            @dragleave="sobre = null"
            @drop.prevent.stop="soltarSobre(i)"
            @dragend="((arrastrada = null), (sobre = null))"
          >
            <span
              class="absolute left-1 top-1 rounded bg-ink-900/80 px-1.5 text-xs font-semibold text-white"
              >{{ i + 1 }}</span
            >
            <img
              :src="p.url"
              :alt="`Página ${i + 1}`"
              class="h-32 w-full cursor-grab object-contain bg-ink-50 dark:bg-ink-900"
              draggable="false"
            />
            <div
              class="flex items-center justify-between gap-1 px-1 py-1 text-ink-700 dark:text-ink-200"
            >
              <button
                type="button"
                class="rounded px-1.5 py-0.5 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-white/10"
                :disabled="i === 0 || enviando"
                title="Mover antes"
                @click="mover(i, i - 1)"
              >
                ◀
              </button>
              <button
                type="button"
                class="rounded px-1.5 py-0.5 hover:bg-ink-100 dark:hover:bg-white/10"
                :disabled="enviando"
                title="Girar 90°"
                @click="girar(i)"
              >
                ⟳
              </button>
              <button
                type="button"
                class="rounded px-1.5 py-0.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                :disabled="enviando"
                title="Quitar"
                @click="quitar(i)"
              >
                ✕
              </button>
              <button
                type="button"
                class="rounded px-1.5 py-0.5 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-white/10"
                :disabled="i === paginas.length - 1 || enviando"
                title="Mover después"
                @click="mover(i, i + 1)"
              >
                ▶
              </button>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="enviando" class="space-y-1" role="status">
        <div class="h-2 overflow-hidden rounded bg-ink-100 dark:bg-white/10">
          <div class="h-full bg-seal-500 transition-all" :style="{ width: `${progreso}%` }" />
        </div>
        <p class="text-xs text-ink-500 dark:text-ink-400">
          {{
            progreso < 100
              ? `Enviando imágenes… ${progreso}%`
              : 'Procesando imágenes y generando PDF…'
          }}
        </p>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" :disabled="enviando" @click="cerrar(false)"
        >Cancelar</BaseButton
      >
      <BaseButton :loading="enviando" :disabled="!paginas.length || preparando" @click="generar">
        Generar y adjuntar PDF
      </BaseButton>
    </template>
  </BaseModal>
</template>
