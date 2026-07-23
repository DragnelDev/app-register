<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-ink-100 px-6 py-4 text-center text-xs text-ink-400">
    KnomiDoc · Sistema de Gestión Documental © {{ year }}
  </footer>
</template>
