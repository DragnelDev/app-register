/**
 * Guardas de navegación (router.beforeEach): sesión, perfil pendiente, correo
 * sin verificar y acceso por rol. Es la contraparte del sidebar: aunque el
 * menú oculte un enlace, escribir la URL a mano debe redirigir igual.
 *
 * Se usa el router REAL (con su guarda) pero con las vistas sustituidas por un
 * componente vacío, para no cargar las pantallas ni hacer peticiones.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import router from '@/router';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { usuarioCon } from '@/test/fixtures';
import type { RolUsuario } from '@/types/common.types';

const { iniciarGestion } = vi.hoisted(() => ({ iniciarGestion: vi.fn() }));

vi.mock('@/router/routes', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/router/routes')>();
  const vacio = { render: () => null };
  return {
    routes: original.routes.map((r) => ({
      ...r,
      component: r.redirect ? undefined : vacio,
    })),
  };
});
vi.mock('@/stores/gestion.store', () => ({
  useGestionStore: () => ({ iniciar: iniciarGestion }),
}));
vi.mock('@/services/auth.service', () => ({
  authService: { me: vi.fn(), cambiarPerfil: vi.fn() },
}));

const ROLES: RolUsuario[] = [
  'ADMIN',
  'OPERADOR_ARCHIVOS',
  'AUXILIAR_ARCHIVOS',
  'ENCARGADO_PRESTAMOS',
  'REMITENTE_C31',
  'CONSULTA_AVANZADA',
  'SOLO_LECTURA',
  'CONSULTA_EXTERNA',
];

const RUTA_INICIAL: Record<RolUsuario, string> = {
  ADMIN: '/',
  OPERADOR_ARCHIVOS: '/',
  AUXILIAR_ARCHIVOS: '/',
  ENCARGADO_PRESTAMOS: '/',
  REMITENTE_C31: '/actas-entrega',
  CONSULTA_AVANZADA: '/',
  SOLO_LECTURA: '/c31/con-imputacion',
  CONSULTA_EXTERNA: '/c31/con-imputacion',
};

/** Perfil activo con sesión iniciada (token + usuario cargado). */
function iniciarSesion(rol: RolUsuario, extra: Record<string, unknown> = {}) {
  const auth = useAuthStore();
  auth.accessToken = 'token';
  auth.usuario = { ...usuarioCon(rol), ...extra } as never;
  return auth;
}

/** Navega y devuelve dónde terminó (path) tras aplicar las guardas. */
async function ir(destino: string) {
  await router.push(destino);
  return router.currentRoute.value;
}

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  setActivePinia(createPinia());
  iniciarGestion.mockReset().mockResolvedValue(undefined);
  vi.mocked(authService.me).mockReset();
  // Punto de partida neutro (ruta pública) para no chocar con "navegación duplicada"
  await router.replace('/forgot-password');
});

describe('guardas · sin sesión', () => {
  it.each(['/', '/usuarios', '/c31/con-imputacion', '/perfil'])(
    '%s redirige a /login recordando a dónde iba',
    async (ruta) => {
      const r = await ir(ruta);
      expect(r.name).toBe('login');
      expect(r.query.redirect).toBe(ruta);
    },
  );

  it.each(['/login', '/forgot-password', '/reset-password'])(
    'las rutas públicas (%s) se abren sin sesión',
    async (ruta) => {
      await router.replace('/login'); // evita que sea la misma ruta de partida
      const r = await ir(ruta);
      expect(r.path).toBe(ruta);
    },
  );

  it('las rutas públicas no cargan la gestión activa', async () => {
    await ir('/login');
    expect(iniciarGestion).not.toHaveBeenCalled();
  });
});

describe('guardas · /login con sesión iniciada', () => {
  it.each(ROLES)('%s no ve el login: va a su ruta inicial', async (rol) => {
    iniciarSesion(rol);
    const r = await ir('/login');
    expect(r.path).toBe(RUTA_INICIAL[rol]);
  });
});

describe('guardas · carga del perfil', () => {
  it('con token pero sin usuario en memoria, lo recupera del servidor y continúa', async () => {
    const auth = useAuthStore();
    auth.accessToken = 'token';
    auth.usuario = null;
    vi.mocked(authService.me).mockResolvedValue(usuarioCon('ADMIN') as never);

    const r = await ir('/usuarios');

    expect(authService.me).toHaveBeenCalledTimes(1);
    expect(r.path).toBe('/usuarios');
  });

  it('si el servidor rechaza el token, cierra la sesión y vuelve al login', async () => {
    const auth = useAuthStore();
    auth.accessToken = 'vencido';
    auth.usuario = null;
    vi.mocked(authService.me).mockRejectedValue(new Error('401'));

    const r = await ir('/usuarios');

    expect(r.name).toBe('login');
    expect(r.query.redirect).toBe('/usuarios');
    expect(auth.isAuthenticated).toBe(false);
  });

  it('carga la gestión activa antes de abrir una vista protegida', async () => {
    iniciarSesion('ADMIN');
    await ir('/beneficiarios');
    expect(iniciarGestion).toHaveBeenCalledTimes(1);
  });
});

/**
 * Oráculo independiente de las rutas con restricción de rol (no se lee de
 * routes.ts: así un cambio accidental en la meta hace fallar el test).
 */
const PERMITIDOS: Record<string, RolUsuario[]> = {
  '/usuarios': ['ADMIN'],
  '/parametros': ['ADMIN'],
  '/auditoria': ['ADMIN'],
  '/c31/aprobaciones': ['ADMIN'],
  '/reportes': ['ADMIN', 'OPERADOR_ARCHIVOS', 'CONSULTA_AVANZADA'],
  '/funcionarios': ['ADMIN', 'ENCARGADO_PRESTAMOS'],
  '/prestamos/cuaderno': ['ADMIN', 'ENCARGADO_PRESTAMOS', 'CONSULTA_AVANZADA'],
  '/prestamos/notas': ['ADMIN', 'ENCARGADO_PRESTAMOS', 'CONSULTA_AVANZADA'],
  '/c31/vinculos': ['ADMIN', 'OPERADOR_ARCHIVOS', 'AUXILIAR_ARCHIVOS'],
  '/c31/nuevo': [
    'ADMIN',
    'OPERADOR_ARCHIVOS',
    'AUXILIAR_ARCHIVOS',
    'REMITENTE_C31',
  ],
  '/actas-entrega': [
    'ADMIN',
    'OPERADOR_ARCHIVOS',
    'AUXILIAR_ARCHIVOS',
    'CONSULTA_AVANZADA',
    'REMITENTE_C31',
  ],
  '/cites': [
    'ADMIN',
    'OPERADOR_ARCHIVOS',
    'AUXILIAR_ARCHIVOS',
    'ENCARGADO_PRESTAMOS',
    'CONSULTA_AVANZADA',
  ],
};

describe('guardas · acceso por rol (matriz perfil × ruta)', () => {
  const casos = ROLES.flatMap((rol) =>
    Object.keys(PERMITIDOS).map((ruta) => {
      const permitido = PERMITIDOS[ruta]!.includes(rol);
      return {
        rol,
        ruta,
        permitido,
        esperado: permitido ? ruta : RUTA_INICIAL[rol],
      };
    }),
  );

  it.each(casos)('$rol → $ruta: $esperado', async ({ rol, ruta, esperado }) => {
    iniciarSesion(rol);
    const r = await ir(ruta);
    expect(r.path).toBe(esperado);
  });

  it('ADMIN entra a todas las rutas restringidas', () => {
    expect(
      casos.filter((c) => c.rol === 'ADMIN').every((c) => c.permitido),
    ).toBe(true);
  });
});

describe('guardas · rutas abiertas a cualquier perfil autenticado', () => {
  it.each(['/beneficiarios', '/pagos', '/carpetas', '/archivo/depositos'])(
    '%s está disponible para los perfiles que no son remitente ni de solo ubicación',
    async (ruta) => {
      for (const rol of [
        'ADMIN',
        'OPERADOR_ARCHIVOS',
        'AUXILIAR_ARCHIVOS',
        'ENCARGADO_PRESTAMOS',
        'CONSULTA_AVANZADA',
      ] as RolUsuario[]) {
        setActivePinia(createPinia());
        await router.replace('/forgot-password');
        iniciarSesion(rol);
        expect((await ir(ruta)).path).toBe(ruta);
      }
    },
  );

  it.each(['/c31', '/c31/con-imputacion', '/c31/sin-imputacion', '/perfil'])(
    '%s lo abren TODOS los perfiles',
    async (ruta) => {
      for (const rol of ROLES) {
        setActivePinia(createPinia());
        await router.replace('/forgot-password');
        iniciarSesion(rol);
        expect((await ir(ruta)).path).toBe(ruta);
      }
    },
  );
});

describe('guardas · REMITENTE_C31 (solo sus pantallas)', () => {
  it.each([
    '/',
    '/beneficiarios',
    '/pagos',
    '/carpetas',
    '/reportes',
    '/usuarios',
  ])('no puede abrir %s: lo manda a sus actas', async (ruta) => {
    iniciarSesion('REMITENTE_C31');
    expect((await ir(ruta)).path).toBe('/actas-entrega');
  });

  it.each(['/actas-entrega', '/c31/nuevo', '/c31/con-imputacion', '/perfil'])(
    'sí puede abrir %s',
    async (ruta) => {
      iniciarSesion('REMITENTE_C31');
      expect((await ir(ruta)).path).toBe(ruta);
    },
  );
});

describe('guardas · perfiles de solo ubicación (SOLO_LECTURA / CONSULTA_EXTERNA)', () => {
  it.each(['SOLO_LECTURA', 'CONSULTA_EXTERNA'] as const)(
    '%s solo consulta comprobantes: todo lo demás lo devuelve al listado',
    async (rol) => {
      for (const ruta of [
        '/',
        '/beneficiarios',
        '/pagos',
        '/carpetas',
        '/archivo/estantes',
        '/actas-entrega',
        '/reportes',
        '/usuarios',
        '/c31/nuevo',
      ]) {
        setActivePinia(createPinia());
        await router.replace('/forgot-password');
        iniciarSesion(rol);
        expect((await ir(ruta)).path, `${rol} en ${ruta}`).toBe(
          '/c31/con-imputacion',
        );
      }
    },
  );

  it.each(['/c31/con-imputacion', '/c31/sin-imputacion', '/perfil'])(
    'SOLO_LECTURA sí puede abrir %s',
    async (ruta) => {
      iniciarSesion('SOLO_LECTURA');
      expect((await ir(ruta)).path).toBe(ruta);
    },
  );
});

describe('guardas · redirecciones y rutas inexistentes', () => {
  it('/notas-auditoria redirige a Préstamos por nota, pestaña auditoría', async () => {
    iniciarSesion('ADMIN');
    const r = await ir('/notas-auditoria');
    expect(r.path).toBe('/prestamos/notas');
    expect(r.query.tab).toBe('auditoria');
  });

  it('una ruta inexistente cae en el inicio', async () => {
    iniciarSesion('ADMIN');
    expect((await ir('/esto-no-existe')).path).toBe('/');
  });

  it('una ruta inexistente de un remitente termina en sus actas', async () => {
    iniciarSesion('REMITENTE_C31');
    expect((await ir('/esto-no-existe')).path).toBe('/actas-entrega');
  });
});

describe('guardas · elección de perfil', () => {
  it('con perfil pendiente, cualquier ruta lleva a elegir perfil', async () => {
    const auth = iniciarSesion('ADMIN', { roles: ['ADMIN', 'SOLO_LECTURA'] });
    auth.perfilPendiente = true;

    const r = await ir('/usuarios');
    expect(r.name).toBe('seleccionar-perfil');
  });

  it('con perfil pendiente puede quedarse en la pantalla de elegir', async () => {
    const auth = iniciarSesion('ADMIN', { roles: ['ADMIN', 'SOLO_LECTURA'] });
    auth.perfilPendiente = true;

    expect((await ir('/seleccionar-perfil')).name).toBe('seleccionar-perfil');
  });

  it('con un solo perfil y nada pendiente, la pantalla de elegir no tiene sentido: va al inicio', async () => {
    iniciarSesion('ADMIN', { roles: ['ADMIN'] });
    expect((await ir('/seleccionar-perfil')).path).toBe('/');
  });

  it('con varios perfiles puede reabrirla para cambiar de perfil', async () => {
    iniciarSesion('ADMIN', { roles: ['ADMIN', 'SOLO_LECTURA'] });
    expect((await ir('/seleccionar-perfil')).name).toBe('seleccionar-perfil');
  });

  it('la pantalla de elegir perfil está abierta a todos los roles (no la bloquea el remitente)', async () => {
    const auth = iniciarSesion('REMITENTE_C31', {
      roles: ['REMITENTE_C31', 'ADMIN'],
    });
    auth.perfilPendiente = true;

    expect((await ir('/seleccionar-perfil')).name).toBe('seleccionar-perfil');
  });
});

describe('guardas · correo sin verificar', () => {
  it.each(['/', '/usuarios', '/c31/con-imputacion', '/reportes'])(
    'bloquea %s hasta verificar el correo',
    async (ruta) => {
      iniciarSesion('ADMIN', { emailVerificado: false });
      expect((await ir(ruta)).name).toBe('verificar-email');
    },
  );

  it('permite verificar el correo y corregirlo desde el perfil', async () => {
    iniciarSesion('ADMIN', { emailVerificado: false });
    expect((await ir('/perfil')).name).toBe('perfil');
    expect((await ir('/verificar-correo')).name).toBe('verificar-email');
  });

  it('con el correo ya verificado, la pantalla de verificación lleva al panel', async () => {
    iniciarSesion('ADMIN', { emailVerificado: true });
    expect((await ir('/verificar-correo')).name).toBe('dashboard');
  });

  it('el correo pendiente tiene prioridad sobre elegir perfil', async () => {
    const auth = iniciarSesion('ADMIN', {
      emailVerificado: false,
      roles: ['ADMIN', 'SOLO_LECTURA'],
    });
    auth.perfilPendiente = true;

    expect((await ir('/usuarios')).name).toBe('verificar-email');
  });
});
