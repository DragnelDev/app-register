<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useResumenStore } from '@/stores/resumen.store'
import { useSidebar } from '@/composables/useSidebar'

const auth = useAuthStore()
const resumen = useResumenStore()
const route = useRoute()
const { abierto, cerrar, colapsado, alternarColapso } = useSidebar()

interface NavItem {
  to: string
  label: string
  icon: string
  roles?: string[]
  badge?: { value: number; warning?: boolean }
}

interface NavGroup {
  title: string
  items: NavItem[]
  /** Línea divisoria después del grupo (como en el diseño) */
  divider?: boolean
}

const ARCHIVO = ['ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS']
const PRESTAMOS = ['ADMIN', 'ENCARGADO_PRESTAMOS']
const CONSULTA = ['CONSULTA_AVANZADA']
// Solo lectura: únicamente comprobantes y su ubicación
const SOLO_UBICACION = ['SOLO_LECTURA', 'CONSULTA_EXTERNA']
const ARCHIVO_Y_CONSULTA = [...ARCHIVO, ...CONSULTA]
const PRESTAMOS_Y_CONSULTA = [...PRESTAMOS, ...CONSULTA]

const navGroups = computed<NavGroup[]>(() => [
  {
    title: 'Principal',
    items: [
      {
        to: '/',
        label: 'Panel principal',
        icon: 'fa-chart-pie',
        roles: [
          'ADMIN',
          'OPERADOR_ARCHIVOS',
          'AUXILIAR_ARCHIVOS',
          'ENCARGADO_PRESTAMOS',
          'CONSULTA_AVANZADA',
        ],
      },
      {
        to: '/actas-entrega',
        label: 'Actas de entrega',
        icon: 'fa-file-invoice',
        roles: [...ARCHIVO_Y_CONSULTA, 'REMITENTE_C31'],
      },
    ],
  },
  {
    title: 'Gestión SIGEP (Gastos)',
    divider: true,
    items: [
      {
        to: '/c31/con-imputacion',
        label: 'C31 Con Imputación',
        icon: 'fa-file-circle-check',
        roles: [...ARCHIVO_Y_CONSULTA, 'ENCARGADO_PRESTAMOS', 'REMITENTE_C31', ...SOLO_UBICACION],
      },
      {
        to: '/c31/sin-imputacion',
        label: 'C31 Sin Imputación',
        icon: 'fa-file-circle-xmark',
        roles: [...ARCHIVO_Y_CONSULTA, 'ENCARGADO_PRESTAMOS', 'REMITENTE_C31', ...SOLO_UBICACION],
      },
      {
        to: '/c31/nuevo',
        label: 'Registrar Comprobante',
        icon: 'fa-circle-plus',
        roles: [...ARCHIVO, 'REMITENTE_C31'],
      },
      { to: '/pagos', label: 'Pagos', icon: 'fa-money-check-dollar' },
      {
        to: '/cites',
        label: 'Registro de CITEs',
        icon: 'fa-stamp',
        roles: [
          'ADMIN',
          'OPERADOR_ARCHIVOS',
          'AUXILIAR_ARCHIVOS',
          'ENCARGADO_PRESTAMOS',
          'CONSULTA_AVANZADA',
        ],
      },
      {
        to: '/beneficiarios',
        label: 'Beneficiarios',
        icon: 'fa-address-book',
        roles: [...ARCHIVO, 'ENCARGADO_PRESTAMOS', ...CONSULTA],
      },
      {
        to: '/c31/vinculos',
        label: 'Vínculos / Regularización',
        icon: 'fa-link',
        roles: ARCHIVO,
        badge: { value: resumen.pendientesRegularizar, warning: true },
      },
    ],
  },
  {
    title: 'Archivo Físico',
    items: [
      {
        to: '/archivo/depositos',
        label: 'Depósitos de Archivo',
        icon: 'fa-warehouse',
        badge: { value: resumen.depositos },
      },
      { to: '/archivo/estantes', label: 'Estantes', icon: 'fa-layer-group' },
      { to: '/carpetas', label: 'Carpetas', icon: 'fa-folder-open' },
    ],
  },
  {
    title: 'Préstamos Documentales',
    divider: true,
    items: [
      {
        to: '/prestamos/cuaderno',
        label: 'Préstamo (Cuaderno)',
        icon: 'fa-book',
        roles: PRESTAMOS_Y_CONSULTA,
      },
      {
        to: '/prestamos/notas',
        label: 'Préstamo (Nota oficial)',
        icon: 'fa-envelope-open-text',
        roles: PRESTAMOS_Y_CONSULTA,
      },
      {
        to: '/funcionarios',
        label: 'Funcionarios',
        icon: 'fa-id-badge',
        roles: PRESTAMOS,
      },
    ],
  },
  {
    title: 'Control y Análisis',
    items: [
      {
        to: '/reportes',
        label: 'Reportes Financieros',
        icon: 'fa-chart-line',
        roles: ['ADMIN', 'OPERADOR_ARCHIVOS', 'CONSULTA_AVANZADA'],
      },
      {
        to: '/auditoria',
        label: 'Auditoría / Historial',
        icon: 'fa-clock-rotate-left',
        roles: ['ADMIN'],
      },
    ],
  },
  {
    title: 'Administración',
    items: [
      { to: '/usuarios', label: 'Usuarios y Roles', icon: 'fa-users-gear', roles: ['ADMIN'] },
      { to: '/parametros', label: 'Parámetros de Gestión', icon: 'fa-gear', roles: ['ADMIN'] },
    ],
  },
])

const visibleGroups = computed(() =>
  navGroups.value
    .map((group) => ({
      ...group,
      items: group.items.filter(
        // Los ítems sin roles son para cualquier perfil, salvo el remitente (solo ve lo suyo)
        (item) =>
          item.roles
            ? Boolean(auth.rol && item.roles.includes(auth.rol))
            : !auth.esRemitente && !auth.esSoloUbicacion,
      ),
    }))
    .filter((group) => group.items.length > 0),
)

// Cada navegación refresca las insignias y cierra el cajón en móvil
watch(
  () => route.fullPath,
  () => {
    cerrar()
    if (auth.isAuthenticated) resumen.fetch()
  },
  { immediate: true },
)
</script>

<template>
  <!-- Fondo oscuro del cajón (solo móvil) -->
  <div v-if="abierto" class="sidebar-backdrop lg:hidden" aria-hidden="true" @click="cerrar" />

  <nav
    class="sidebar"
    :class="{ 'sidebar--open': abierto, 'sidebar--colapsado': colapsado }"
    aria-label="Navegación principal"
  >
    <!-- Logo y nombre del sistema -->
    <div class="sidebar-header">
      <!-- Imagen centrada desde assets/images -->
      <img
        src="@/assets/images/logo.png"
        alt="KnomiDoc Logo"
        class="mx-auto mb-3 h-12 w-auto object-contain"
      />
      <div class="logo-text">KnomiDoc</div>
      <button
        type="button"
        class="collapse-btn"
        :aria-label="colapsado ? 'Expandir barra lateral' : 'Contraer barra lateral'"
        :title="colapsado ? 'Expandir barra lateral' : 'Contraer barra lateral'"
        @click="alternarColapso"
      >
        <i
          class="fa-solid"
          :class="colapsado ? 'fa-angles-right' : 'fa-angles-left'"
          aria-hidden="true"
        />
      </button>
    </div>

    <div class="sidebar-menu">
      <template v-for="(group, gi) in visibleGroups" :key="group.title">
        <div class="menu-category">{{ group.title }}</div>
        <RouterLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="menu-item"
          active-class=""
          exact-active-class="active"
          :title="colapsado ? item.label : undefined"
        >
          <i class="fa-solid" :class="item.icon" aria-hidden="true" />
          <span class="menu-label">{{ item.label }}</span>
          <span
            v-if="item.badge && item.badge.value > 0"
            class="menu-badge"
            :class="{ warning: item.badge.warning }"
          >
            {{ item.badge.value }}
          </span>
        </RouterLink>
        <div v-if="group.divider && gi < visibleGroups.length - 1" class="menu-divider" />
      </template>
    </div>

    <div class="sidebar-footer">
      <span class="menu-label">Gestión de comprobantes C31 v1.0</span>
    </div>
  </nav>
</template>

<style scoped>
/* ───────── Modo claro (index - modo claro.html) ───────── */
.sidebar {
  --sidebar-bg: #ffffff;
  --sidebar-hover: #f1f5f9;
  --sidebar-active: #2563eb;
  --accent-color: #2563eb;
  --text-main: #1e293b;
  --text-muted: #64748b;
  --border-color: #e2e8f0;
  --logo-bg: linear-gradient(135deg, #2563eb, #1d4ed8);
  --logo-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
  --logo-text: #0f172a;
  --hover-text: #0f172a;
  --active-text: #ffffff;
  --active-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  --badge-bg: #dbeafe;
  --badge-fg: #1d4ed8;
  --badge-warn-bg: #fef3c7;
  --badge-warn-fg: #d97706;
  --scroll-thumb: #cbd5e1;

  width: 290px;
  flex-shrink: 0;
  background-color: var(--sidebar-bg);
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  z-index: 40;
}

.sidebar-header {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.logo-box {
  background: var(--logo-bg);
  color: #fff;
  font-weight: bold;
  font-size: 20px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  margin-right: 12px;
  box-shadow: var(--logo-shadow);
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--logo-text);
}

.sidebar-menu {
  padding: 15px 12px;
  flex-grow: 1;
}

.menu-category {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin: 18px 0 8px 10px;
  font-weight: 600;
}
.menu-category:first-child {
  margin-top: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 10px 10px;
  gap: 0;
  white-space: nowrap;
  color: var(--text-main);
  text-decoration: none;
  border-radius: 6px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
  font-size: 14px;
}

.menu-item i {
  width: 22px;
  margin-right: 8px;
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 15px;
  transition: color 0.2s;
}

.menu-item:hover {
  background-color: var(--sidebar-hover);
  color: var(--hover-text);
}
.menu-item:hover i {
  color: var(--accent-color);
}

.menu-item.active {
  background-color: var(--sidebar-active);
  color: var(--active-text);
  font-weight: 600;
  box-shadow: var(--active-shadow);
}
.menu-item.active i {
  color: #ffffff;
}

.menu-badge {
  margin-left: auto;
  flex-shrink: 0;
  background-color: var(--badge-bg);
  color: var(--badge-fg);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}
.menu-badge.warning {
  background-color: var(--badge-warn-bg);
  color: var(--badge-warn-fg);
}

.menu-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 12px 10px;
}

.sidebar-footer {
  border-top: 1px solid var(--border-color);
  padding: 14px 20px;
  font-size: 11px;
  color: var(--text-muted);
}

.sidebar::-webkit-scrollbar {
  width: 5px;
}
.sidebar::-webkit-scrollbar-thumb {
  background: var(--scroll-thumb);
  border-radius: 10px;
}

.collapse-btn {
  display: none;
  margin-left: auto;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
}
.collapse-btn:hover {
  background-color: var(--sidebar-hover);
  color: var(--hover-text);
}

/* ───────── Escritorio: barra contraída (solo íconos) ───────── */
@media (min-width: 1024px) {
  .sidebar {
    transition: width 0.2s ease;
  }
  .collapse-btn {
    display: inline-flex;
  }
  .sidebar--colapsado {
    width: 72px;
  }
  .sidebar--colapsado .sidebar-header {
    flex-direction: column;
    gap: 10px;
    padding: 14px 0;
  }
  .sidebar--colapsado .logo-box {
    margin-right: 0;
  }
  .sidebar--colapsado .logo-text,
  .sidebar--colapsado .menu-label,
  .sidebar--colapsado .sidebar-footer {
    display: none;
  }
  .sidebar--colapsado .collapse-btn {
    margin-left: 0;
  }
  .sidebar--colapsado .menu-category {
    height: 1px;
    margin: 12px 10px;
    padding: 0;
    overflow: hidden;
    font-size: 0;
    background-color: var(--border-color);
  }
  .sidebar--colapsado .menu-item {
    justify-content: center;
    position: relative;
    padding: 10px 0;
  }
  .sidebar--colapsado .menu-item i {
    margin-right: 0;
  }
  .sidebar--colapsado .menu-badge {
    position: absolute;
    top: 2px;
    right: 6px;
    margin-left: 0;
    padding: 0 5px;
    font-size: 10px;
  }
  .sidebar--colapsado .menu-divider {
    display: none;
  }
}

/* ───────── Móvil: cajón deslizable ───────── */
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.55);
  z-index: 39;
}

@media (max-width: 1023px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    max-width: 85vw;
  }
  .sidebar--open {
    transform: translateX(0);
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.35);
  }
}
</style>

<!-- Variables del modo oscuro: bloque sin alcance para que dependan de <html data-theme> -->
<style>
/* ───────── Modo oscuro (index - modo oscuro.html) ───────── */
:root[data-theme='dark'] .sidebar {
  --sidebar-bg: #0a192f;
  --sidebar-hover: #112240;
  --sidebar-active: #1d4ed8;
  --accent-color: #38bdf8;
  --text-main: #e2e8f0;
  --text-muted: #8892b0;
  --border-color: rgba(255, 255, 255, 0.08);
  --logo-bg: linear-gradient(135deg, #38bdf8, #2563eb);
  --logo-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  --logo-text: #ffffff;
  --hover-text: #ffffff;
  --active-text: #ffffff;
  --active-shadow: inset 3px 0 0 #38bdf8;
  --badge-bg: rgba(56, 189, 248, 0.15);
  --badge-fg: #38bdf8;
  --badge-warn-bg: rgba(245, 158, 11, 0.2);
  --badge-warn-fg: #fcd34d;
  --scroll-thumb: rgba(255, 255, 255, 0.1);
}
</style>
