import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { useAuthStore } from '@/stores/auth.store'
import { useGestionStore } from '@/stores/gestion.store'

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
      return { path: auth.rutaInicial }
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

  // La gestión activa se conoce antes de abrir cualquier vista (filtro por defecto)
  await useGestionStore().iniciar()

  // Con varios perfiles, primero se elige con cuál trabajar (como en el SIGEP)
  if (auth.perfilPendiente && to.name !== 'seleccionar-perfil' && !auth.emailPendiente) {
    return { name: 'seleccionar-perfil' }
  }
  if (!auth.perfilPendiente && to.name === 'seleccionar-perfil' && auth.perfiles.length < 2) {
    return { path: auth.rutaInicial }
  }

  // Sin correo verificado solo se puede verificar o corregir el correo en el perfil
  if (auth.emailPendiente && to.name !== 'verificar-email' && to.name !== 'perfil') {
    return { name: 'verificar-email' }
  }
  if (!auth.emailPendiente && to.name === 'verificar-email') {
    return { name: 'dashboard' }
  }

  // El remitente solo entra a sus pantallas (las que lo declaran en meta.roles)
  if (
    auth.esRemitente &&
    !to.meta.abiertoATodos &&
    !(to.meta.roles as string[] | undefined)?.includes('REMITENTE_C31')
  ) {
    return { path: '/actas-entrega' }
  }

  // Solo lectura: únicamente consulta comprobantes y su ubicación (más su perfil)
  if (
    auth.esSoloUbicacion &&
    !(to.path.startsWith('/c31/con-imputacion') || to.path.startsWith('/c31/sin-imputacion') || to.path === '/c31' || to.path === '/perfil' || to.name === 'seleccionar-perfil' || to.name === 'verificar-email')
  ) {
    return { path: auth.rutaInicial }
  }

  const requiredRoles = to.meta.roles as string[] | undefined
  if (requiredRoles && (!auth.rol || !requiredRoles.includes(auth.rol))) {
    return { path: auth.rutaInicial }
  }

  return true
})

export default router
