import type { RouteRecordRaw } from 'vue-router'
import type { RolUsuario } from '@/types/common.types'

// Meta.roles vacío o ausente = accesible para cualquier usuario autenticado
export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/modules/auth/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/modules/dashboard/views/DashboardView.vue'),
  },
  {
    path: '/notas-entrega',
    name: 'notas-entrega',
    component: () => import('@/modules/notas-entrega/views/NotasEntregaListView.vue'),
    meta: { roles: ['ADMIN', 'REGISTRADOR'] as RolUsuario[] },
  },
  {
    path: '/c31',
    name: 'c31-list',
    component: () => import('@/modules/c31-gastos/views/C31ListView.vue'),
  },
  {
    path: '/c31/nuevo',
    name: 'c31-create',
    component: () => import('@/modules/c31-gastos/views/C31CreateView.vue'),
    meta: { roles: ['ADMIN', 'REGISTRADOR'] as RolUsuario[] },
  },
  {
    path: '/c31/aprobaciones',
    name: 'c31-aprobaciones',
    component: () => import('@/modules/c31-gastos/views/C31AprobacionesView.vue'),
    meta: { roles: ['ADMIN'] as RolUsuario[] },
  },
  {
    path: '/usuarios',
    name: 'usuarios',
    component: () => import('@/modules/usuarios/views/UsuariosListView.vue'),
    meta: { roles: ['ADMIN'] as RolUsuario[] },
  },
  {
    path: '/prestamos/cuaderno',
    name: 'prestamos-cuaderno',
    component: () => import('@/modules/prestamos/views/PrestamosCuadernoView.vue'),
    meta: { roles: ['ADMIN', 'REGISTRADOR'] as RolUsuario[] },
  },
  {
    path: '/prestamos/notas',
    name: 'prestamos-notas',
    component: () => import('@/modules/prestamos/views/PrestamosNotasView.vue'),
    meta: { roles: ['ADMIN', 'REGISTRADOR'] as RolUsuario[] },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]
