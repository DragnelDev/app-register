<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

const route = useRoute()
const isPublicPage = computed(() => Boolean(route.meta.public))
</script>

<template>
  <!-- Páginas públicas (login) ocupan toda la pantalla sin chrome de la app -->
  <RouterView v-if="isPublicPage" />

  <div v-else class="flex min-h-screen bg-paper">
    <AppSidebar />
    <div class="flex flex-1 flex-col">
      <AppNavbar />
      <main class="flex-1 px-6 py-6 lg:px-10">
        <RouterView />
      </main>
      <AppFooter />
    </div>
  </div>
</template>
