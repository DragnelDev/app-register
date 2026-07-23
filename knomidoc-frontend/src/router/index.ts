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

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.public && auth.isAuthenticated && to.name === 'login') {
    return { name: 'dashboard' }
  }

  const requiredRoles = to.meta.roles as string[] | undefined

  // Tras un refresh de página el token persiste pero `usuario` (y su rol) se pierde.
  // Si la ruta exige un rol, hay que resolver el perfil ANTES de decidir, para que
  // el chequeo de rol nunca se salte por falta de datos en memoria.
  if (requiredRoles && auth.isAuthenticated && !auth.usuario) {
    try {
      await auth.fetchProfile()
    } catch {
      auth.logout()
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  if (requiredRoles && (!auth.rol || !requiredRoles.includes(auth.rol))) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
