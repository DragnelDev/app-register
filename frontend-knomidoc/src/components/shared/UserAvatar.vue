<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{ nombre?: string; foto?: string | null; size?: number }>(),
  { nombre: '', foto: null, size: 36 },
)

// Si la URL de la foto no carga, se vuelve a las iniciales
const falla = ref(false)
watch(() => props.foto, () => (falla.value = false))

const iniciales = computed(
  () =>
    props.nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?',
)
const estilo = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.max(10, props.size * 0.36)}px`,
}))
</script>

<template>
  <img
    v-if="foto && !falla"
    :src="foto"
    :alt="`Foto de ${nombre}`"
    :style="estilo"
    class="shrink-0 rounded-full object-cover"
    referrerpolicy="no-referrer"
    @error="falla = true"
  />
  <div
    v-else
    :style="estilo"
    class="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-seal-400 to-seal-600 font-bold text-white"
    aria-hidden="true"
  >
    {{ iniciales }}
  </div>
</template>
