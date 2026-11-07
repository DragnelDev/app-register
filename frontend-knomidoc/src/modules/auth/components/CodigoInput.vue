<script setup lang="ts">
/** Campo para el código numérico de 6 dígitos (acepta pegar el código completo). */
const model = defineModel<string>({ required: true })

function alCambiar(e: Event) {
  model.value = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6)
}
</script>

<template>
  <input
    :value="model"
    type="text"
    inputmode="numeric"
    autocomplete="one-time-code"
    maxlength="6"
    placeholder="000000"
    aria-label="Código de 6 dígitos"
    class="w-full rounded-md border border-ink-200 bg-white px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] text-ink-900 dark:border-white/10 dark:bg-ink-950 dark:text-ink-100 focus:border-seal-500"
    @input="alCambiar"
  />
</template>
