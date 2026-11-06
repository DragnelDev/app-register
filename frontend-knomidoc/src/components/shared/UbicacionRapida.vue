<script setup lang="ts">
import { ref } from 'vue'
import DepositoModal from '@/modules/archivo/components/DepositoModal.vue'
import EstanteModal from '@/modules/archivo/components/EstanteModal.vue'
import CarpetaModal from '@/modules/carpetas/components/CarpetaModal.vue'
import { depositosService, estantesService } from '@/services/archivo.service'
import { carpetasService } from '@/services/carpetas.service'
import { extractApiErrorMessage } from '@/utils/http-error'
import type { Deposito, DepositoPayload, Estante, EstantePayload } from '@/types/archivo.types'
import type { CarpetaCreatePayload, CarpetaUpdatePayload } from '@/types/c31.types'

/**
 * Alta rápida de Depósito, Estante y Carpeta desde los selectores en cascada,
 * sin salir de la pantalla. El padre llama a `abrir(tipo, ctx)` y recibe
 * `creado` con el id nuevo para seleccionarlo y recargar sus opciones.
 */
const emit = defineEmits<{
  creado: [datos: { tipo: 'deposito' | 'estante' | 'carpeta'; id: number }]
}>()

const tipo = ref<'deposito' | 'estante' | 'carpeta' | null>(null)
const depositos = ref<Deposito[]>([])
const estantes = ref<Estante[]>([])
const depositoInicial = ref<number | string | null>(null)
const estanteInicial = ref<number | string | null>(null)
const guardando = ref(false)
const error = ref('')

async function abrir(
  t: 'deposito' | 'estante' | 'carpeta',
  ctx: { depositoId?: number | string | null; estanteId?: number | string | null } = {},
) {
  error.value = ''
  depositoInicial.value = ctx.depositoId || null
  estanteInicial.value = ctx.estanteId || null
  if (t === 'estante') depositos.value = await depositosService.opciones().catch(() => [])
  if (t === 'carpeta') estantes.value = await estantesService.opciones().catch(() => [])
  tipo.value = t
}
defineExpose({ abrir })

const cerrar = () => (tipo.value = null)

async function guardar(
  t: 'deposito' | 'estante' | 'carpeta',
  fn: () => Promise<{ id?: number | string }>,
  mensaje: string,
) {
  guardando.value = true
  error.value = ''
  try {
    const creado = await fn()
    cerrar()
    emit('creado', { tipo: t, id: Number(creado.id) })
  } catch (err) {
    error.value = extractApiErrorMessage(err, mensaje)
  } finally {
    guardando.value = false
  }
}

const guardarDeposito = (p: DepositoPayload) =>
  guardar('deposito', () => depositosService.create(p), 'No se pudo registrar el depósito.')
const guardarEstante = (p: EstantePayload) =>
  guardar('estante', () => estantesService.create(p), 'No se pudo registrar el estante.')
const guardarCarpeta = (p: CarpetaCreatePayload) =>
  guardar('carpeta', () => carpetasService.create(p), 'No se pudo registrar la carpeta.')
</script>

<template>
  <DepositoModal
    :model-value="tipo === 'deposito'"
    :saving="guardando"
    :error-message="error"
    @update:model-value="(v: boolean) => !v && cerrar()"
    @save="guardarDeposito"
  />
  <EstanteModal
    :model-value="tipo === 'estante'"
    :depositos="depositos"
    :deposito-inicial="depositoInicial"
    :saving="guardando"
    :error-message="error"
    @update:model-value="(v: boolean) => !v && cerrar()"
    @save="guardarEstante"
  />
  <CarpetaModal
    :model-value="tipo === 'carpeta'"
    :estantes="estantes"
    :estante-inicial="estanteInicial"
    :saving="guardando"
    :error-message="error"
    @update:model-value="(v: boolean) => !v && cerrar()"
    @create="guardarCarpeta"
    @update="(_id: string | number, _p: CarpetaUpdatePayload) => undefined"
  />
</template>
