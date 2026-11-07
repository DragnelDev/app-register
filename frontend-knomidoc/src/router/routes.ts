import type { RouteRecordRaw } from 'vue-router'
import type { RolUsuario } from '@/types/common.types'

const ARCHIVO: RolUsuario[] = ['ADMIN', 'OPERADOR_ARCHIVOS']
const PRESTAMOS: RolUsuario[] = ['ADMIN', 'ENCARGADO_PRESTAMOS']
// Los perfiles de consulta ven las listas (sin botones de registro) de actas y préstamos
const CONSULTA: RolUsuario[] = ['CONSULTA_AVANZADA', 'SOLO_LECTURA', 'CONSULTA_EXTERNA']
const ARCHIVO_Y_CONSULTA: RolUsuario[] = [...ARCHIVO, ...CONSULTA]
const PRESTAMOS_Y_CONSULTA: RolUsuario[] = [...PRESTAMOS, ...CONSULTA]

// Meta.roles vacío o ausente = accesible para cualquier usuario autenticado
export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/modules/auth/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/modules/auth/views/ForgotPasswordView.vue'),
    meta: { public: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/modules/auth/views/ResetPasswordView.vue'),
    meta: { public: true },
  },
  {
    path: '/verificar-correo',
    name: 'verificar-email',
    component: () => import('@/modules/auth/views/VerificarCorreoView.vue'),
    meta: { fullscreen: true },
  },
  {
    path: '/seleccionar-perfil',
    name: 'seleccionar-perfil',
    component: () => import('@/modules/auth/views/SeleccionarPerfilView.vue'),
    meta: { fullscreen: true, abiertoATodos: true },
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/modules/dashboard/views/DashboardView.vue'),
  },
  {
    path: '/actas-entrega',
    name: 'actas-entrega',
    component: () => import('@/modules/actas-entrega/views/ActasEntregaListView.vue'),
    meta: { roles: ARCHIVO_Y_CONSULTA },
  },

  // ── Gestión SIGEP (gastos) ──
  {
    path: '/c31',
    name: 'c31-list',
    component: () => import('@/modules/c31-gastos/views/C31ListView.vue'),
  },
  {
    path: '/c31/con-imputacion',
    name: 'c31-con-imputacion',
    component: () => import('@/modules/c31-gastos/views/C31ListView.vue'),
    meta: { tipoC31: 'CON_IMPUTACION' },
  },
  {
    path: '/c31/sin-imputacion',
    name: 'c31-sin-imputacion',
    component: () => import('@/modules/c31-gastos/views/C31ListView.vue'),
    meta: { tipoC31: 'SIN_IMPUTACION' },
  },
  {
    path: '/c31/nuevo',
    name: 'c31-create',
    component: () => import('@/modules/c31-gastos/views/C31CreateView.vue'),
    meta: { roles: ARCHIVO },
  },
  {
    path: '/c31/vinculos',
    name: 'c31-vinculos',
    component: () => import('@/modules/c31-gastos/views/C31VinculosView.vue'),
    meta: { roles: ARCHIVO },
  },
  {
    path: '/c31/aprobaciones',
    name: 'c31-aprobaciones',
    component: () => import('@/modules/c31-gastos/views/C31AprobacionesView.vue'),
    meta: { roles: ['ADMIN'] as RolUsuario[] },
  },

  {
    path: '/remisiones',
    name: 'remisiones',
    component: () => import('@/modules/remisiones/views/RemisionesView.vue'),
    meta: { roles: ['ADMIN', 'OPERADOR_ARCHIVOS', 'REMITENTE_C31'] as RolUsuario[] },
  },
  {
    path: '/beneficiarios',
    name: 'beneficiarios',
    component: () => import('@/modules/beneficiarios/views/BeneficiariosListView.vue'),
  },
  {
    path: '/pagos',
    name: 'pagos',
    component: () => import('@/modules/pagos/views/PagosView.vue'),
  },

  // ── Archivo físico ──
  {
    path: '/archivo/depositos',
    name: 'depositos',
    component: () => import('@/modules/archivo/views/DepositosListView.vue'),
  },
  {
    path: '/archivo/estantes',
    name: 'estantes',
    component: () => import('@/modules/archivo/views/EstantesListView.vue'),
  },
  {
    path: '/carpetas',
    name: 'carpetas',
    component: () => import('@/modules/carpetas/views/CarpetasListView.vue'),
  },

  // ── Préstamos documentales ──
  {
    path: '/prestamos/cuaderno',
    name: 'prestamos-cuaderno',
    component: () => import('@/modules/prestamos/views/PrestamosCuadernoView.vue'),
    meta: { roles: PRESTAMOS_Y_CONSULTA },
  },
  {
    path: '/funcionarios',
    name: 'funcionarios',
    component: () => import('@/modules/funcionarios/views/FuncionariosListView.vue'),
    meta: { roles: PRESTAMOS },
  },
  {
    path: '/prestamos/notas',
    name: 'prestamos-notas',
    component: () => import('@/modules/prestamos/views/PrestamosNotasView.vue'),
    meta: { roles: PRESTAMOS_Y_CONSULTA },
  },

  // ── Control y análisis ──
  {
    path: '/reportes',
    name: 'reportes',
    component: () => import('@/modules/reportes/views/ReportesFinancierosView.vue'),
    meta: {
      roles: ['ADMIN', 'OPERADOR_ARCHIVOS', 'CONSULTA_AVANZADA', 'CONSULTA_EXTERNA'] as RolUsuario[],
    },
  },
  {
    path: '/auditoria',
    name: 'auditoria',
    component: () => import('@/modules/auditoria/views/AuditoriaView.vue'),
    meta: { roles: ['ADMIN'] as RolUsuario[] },
  },

  // ── Administración ──
  {
    path: '/usuarios',
    name: 'usuarios',
    component: () => import('@/modules/usuarios/views/UsuariosListView.vue'),
    meta: { roles: ['ADMIN'] as RolUsuario[] },
  },
  {
    path: '/parametros',
    name: 'parametros',
    component: () => import('@/modules/parametros/views/ParametrosGestionView.vue'),
    meta: { roles: ['ADMIN'] as RolUsuario[] },
  },
  {
    path: '/perfil',
    name: 'perfil',
    component: () => import('@/modules/perfil/views/PerfilView.vue'),
    meta: { abiertoATodos: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]
