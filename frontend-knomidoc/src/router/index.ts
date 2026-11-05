import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { useAuthStore } from '@/stores/auth.store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.public) {
    if (auth.isAuthenticated && to.name === 'login') {
      return { name: 'dashboard' }
    }
    return true
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (!auth.usuario) {
    try {
      await auth.fetchProfile()
    } catch {
      auth.logout()
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  // Sin correo verificado solo se puede verificar o corregir el correo en el perfil
  if (auth.emailPendiente && to.name !== 'verificar-email' && to.name !== 'perfil') {
    return { name: 'verificar-email' }
  }
  if (!auth.emailPendiente && to.name === 'verificar-email') {
    return { name: 'dashboard' }
  }

  const requiredRoles = to.meta.roles as string[] | undefined
  if (requiredRoles && (!auth.rol || !requiredRoles.includes(auth.rol))) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
