<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { svgCode128 } from '@/utils/code128'
import { imprimirEtiquetas, type EtiquetaArchivo } from '@/utils/etiquetas'

const props = defineProps<{ modelValue: boolean; etiqueta: EtiquetaArchivo | null }>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()

const svg = computed(() => (props.etiqueta ? svgCode128(props.etiqueta.codigo, { alto: 70, modulo: 2.2 }) : ''))
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="etiqueta?.titulo ?? 'Código de barras'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="etiqueta" class="space-y-3 text-center">
      <p v-if="etiqueta.subtitulo" class="text-sm text-ink-500 dark:text-ink-400">{{ etiqueta.subtitulo }}</p>
      <!-- Fondo blanco fijo: el lector necesita contraste aun en modo oscuro -->
      <div class="mx-auto inline-block rounded bg-white p-3" v-html="svg" />
      <p class="font-mono text-lg tracking-widest">{{ etiqueta.codigo }}</p>
      <p class="text-xs text-ink-400">Code 128 · escanee con un lector USB para buscar este código.</p>
    </div>
    <template #footer>
      <BaseButton variant="secondary" @click="emit('update:modelValue', false)">Cerrar</BaseButton>
      <BaseButton v-if="etiqueta" @click="imprimirEtiquetas([etiqueta])">
        <i class="fa-solid fa-print mr-1" aria-hidden="true" /> Imprimir etiqueta
      </BaseButton>
    </template>
  </BaseModal>
</template>
