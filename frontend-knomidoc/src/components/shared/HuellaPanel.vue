<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { obtenerLector } from '@/services/huella/lector-huella'
import { funcionariosService } from '@/services/funcionarios.service'
import { extractApiErrorMessage } from '@/utils/http-error'

/**
 * Panel del lector de huellas. modo "enrolar": registra la huella del funcionario.
 * modo "verificar": confirma que quien está frente al lector es el funcionario;
 * emite `verificado` cuando coincide.
 */
const props = defineProps<{
  funcionarioId: number
  modo: 'enrolar' | 'verificar'
  tieneHuella?: boolean
}>()
const emit = defineEmits<{ verificado: []; enrolada: []; fallo: [mensaje: string] }>()

const lector = obtenerLector()
const estado = ref<'reposo' | 'leyendo' | 'ok' | 'error'>('reposo')
const progreso = ref(0)
const mensaje = ref('')
const calidad = ref<number | null>(null)

const etiquetaBoton = computed(() =>
  props.modo === 'enrolar' ? (props.tieneHuella ? 'Volver a registrar huella' : 'Registrar huella') : 'Leer huella',
)

async function iniciar() {
  estado.value = 'leyendo'
  progreso.value = 0
  mensaje.value = 'Coloque el dedo sobre el lector…'
  try {
    if (!(await lector.disponible())) throw new Error('No se detecta el lector de huellas')
    const captura = await lector.capturar(String(props.funcionarioId), (p) => (progreso.value = p))
    calidad.value = captura.calidad
    if (props.modo === 'enrolar') {
      await funcionariosService.registrarHuella(props.funcionarioId, captura.plantilla, captura.lector)
      estado.value = 'ok'
      mensaje.value = 'Huella registrada correctamente'
      emit('enrolada')
    } else {
      const r = await funcionariosService.verificarHuella(props.funcionarioId, captura.plantilla)
      if (r.coincide) {
        estado.value = 'ok'
        mensaje.value = 'Identidad verificada'
        emit('verificado')
      } else {
        estado.value = 'error'
        mensaje.value = 'La huella no coincide'
        emit('fallo', mensaje.value)
      }
    }
  } catch (e) {
    estado.value = 'error'
    mensaje.value = extractApiErrorMessage(e, (e as Error).message || 'No se pudo leer la huella')
    emit('fallo', mensaje.value)
  }
}
</script>

<template>
  <div class="rounded-md border border-ink-200 bg-ink-50/60 p-3 text-sm dark:border-white/10 dark:bg-white/5">
    <div class="flex items-center gap-3">
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
        :class="{
          'bg-ink-100 text-ink-500 dark:bg-white/10 dark:text-ink-300': estado === 'reposo',
          'animate-pulse bg-seal-100 text-seal-600 dark:bg-seal-500/20 dark:text-seal-300': estado === 'leyendo',
          'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300': estado === 'ok',
          'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300': estado === 'error',
        }"
      >
        <i class="fa-solid fa-fingerprint" aria-hidden="true" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="font-medium text-ink-800 dark:text-ink-100">
          {{ lector.nombre }}
          <span v-if="lector.esDemo" class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">DEMO</span>
        </p>
        <p v-if="mensaje" class="text-xs text-ink-500 dark:text-ink-400">
          {{ mensaje }}<template v-if="calidad !== null && estado === 'ok'"> · calidad {{ calidad }}%</template>
        </p>
        <div v-if="estado === 'leyendo'" class="mt-1 h-1.5 w-full overflow-hidden rounded bg-ink-200 dark:bg-white/10">
          <div class="h-full bg-seal-500 transition-all" :style="{ width: progreso + '%' }" />
        </div>
      </div>
      <BaseButton
        type="button"
        size="sm"
        :variant="estado === 'ok' && modo === 'verificar' ? 'secondary' : 'primary'"
        :loading="estado === 'leyendo'"
        @click="iniciar"
      >
        {{ etiquetaBoton }}
      </BaseButton>
    </div>
    <p v-if="lector.esDemo" class="mt-2 text-[11px] text-ink-400">
      Modo demostración: la captura es simulada. Al conectar un lector real solo cambia el adaptador.
    </p>
  </div>
</template>
