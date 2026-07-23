<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}

const rolLabel: Record<string, string> = {
  ADMIN: 'Administrador',
  REGISTRADOR: 'Registrador',
  CONSULTA: 'Consulta',
}
</script>

<template>
  <header class="flex h-16 items-center justify-between border-b border-ink-100 bg-white px-6">
    <div class="lg:hidden">
      <span class="font-display text-lg font-semibold text-ink-900">KnomiDoc</span>
    </div>

    <div class="hidden text-sm text-ink-400 lg:block">
      Gestión de comprobantes C31 y control de préstamos
    </div>

    <div class="flex items-center gap-4">
      <div v-if="auth.usuario" class="text-right leading-tight">
        <p class="text-sm font-medium text-ink-900">{{ auth.usuario.nombreCompleto }}</p>
        <p class="text-xs text-ink-400">{{ rolLabel[auth.usuario.rol] ?? auth.usuario.rol }}</p>
      </div>
      <BaseButton variant="ghost" size="sm" @click="handleLogout">Cerrar sesión</BaseButton>
    </div>
  </header>
</template>
