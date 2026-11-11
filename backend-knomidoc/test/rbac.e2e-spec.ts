/**
 * RBAC de punta a punta con Supertest.
 *
 * Cadena real de producción: JwtAuthGuard → EmailVerificadoGuard → RolesGuard,
 * con JWT reales. Los servicios son dobles para comprobar además que, cuando se
 * responde 403, el caso de uso NUNCA llega a ejecutarse.
 *
 * Perfiles probados (src/common/constants/roles.constant.ts):
 *   - REMITENTE_C31: solo ve/arma lo suyo; no importa, no elimina, no digitaliza.
 *   - CONSULTA_AVANZADA / SOLO_LECTURA / CONSULTA_EXTERNA: nunca modifican.
 *   - AUXILIAR_ARCHIVOS / ENCARGADO_PRESTAMOS: límites intermedios.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ComprobantesC31Controller } from '../src/comprobantes_c31/comprobantes_c31.controller';
import { ComprobantesC31Service } from '../src/comprobantes_c31/comprobantes_c31.service';
import { C31SeguimientoService } from '../src/comprobantes_c31/c31-seguimiento.service';
import { C31AdjuntosController } from '../src/uploads/c31-adjuntos.controller';
import { C31AdjuntosService } from '../src/uploads/c31-adjuntos.service';
import { UsuariosController } from '../src/usuarios/usuarios.controller';
import { UsuariosService } from '../src/usuarios/usuarios.service';
import { ParametrosGestionController } from '../src/parametros-gestion/parametros-gestion.controller';
import { ParametrosGestionService } from '../src/parametros-gestion/parametros-gestion.service';
import { AuditoriaController } from '../src/auditoria/auditoria.controller';
import { AuditoriaService } from '../src/auditoria/auditoria.service';
import { crearAppPruebas, mockServicio } from './helpers/auth-app';

type Metodo = 'get' | 'post' | 'patch' | 'delete';
type Ruta = [Metodo, string];

const P = '/api/v1';

/** Rutas que modifican comprobantes, archivos o importan datos. */
const MODIFICACION: Ruta[] = [
  ['post', '/comprobantes-c31'],
  ['post', '/comprobantes-c31/unir'],
  ['patch', '/comprobantes-c31/1'],
  ['patch', '/comprobantes-c31/1/estado'],
  ['delete', '/comprobantes-c31/1'],
  ['delete', '/comprobantes-c31/1/grupo'],
  ['post', '/comprobantes-c31/import'],
  ['post', '/uploads/c31/1'],
  ['post', '/uploads/c31/1/digitalizar'],
  ['delete', '/uploads/c31/1/2'],
];

/** Rutas de administración (solo ADMIN). */
const ADMINISTRACION: Ruta[] = [
  ['get', '/usuarios'],
  ['post', '/usuarios'],
  ['patch', '/usuarios/1'],
  ['delete', '/usuarios/1'],
  ['get', '/auditoria'],
  ['post', '/parametros-gestion'],
  ['patch', '/parametros-gestion/1/cerrar'],
  ['delete', '/parametros-gestion/1'],
];

describe('RBAC (Supertest)', () => {
  let app: INestApplication;
  let tokenPara: (
    rol: string,
    opciones?: { expiresIn?: string | number },
  ) => string;
  const c31 = mockServicio({
    exportExcel: jest.fn().mockResolvedValue(Buffer.from('xlsx-falso')),
  });
  const adjuntos = mockServicio();
  const usuarios = mockServicio();
  const parametros = mockServicio();
  const auditoria = mockServicio();
  const todos = [c31, adjuntos, usuarios, parametros, auditoria];

  /** true si ningún caso de uso fue invocado (la petición se cortó en el guard). */
  const sinLlamadas = () =>
    todos.every((s) =>
      Object.values(s).every((fn) => fn.mock.calls.length === 0),
    );

  beforeAll(async () => {
    ({ app, tokenPara } = await crearAppPruebas({
      controllers: [
        ComprobantesC31Controller,
        C31AdjuntosController,
        UsuariosController,
        ParametrosGestionController,
        AuditoriaController,
      ],
      providers: [
        { provide: ComprobantesC31Service, useValue: c31 },
        { provide: C31SeguimientoService, useValue: mockServicio() },
        { provide: C31AdjuntosService, useValue: adjuntos },
        { provide: UsuariosService, useValue: usuarios },
        { provide: ParametrosGestionService, useValue: parametros },
        { provide: AuditoriaService, useValue: auditoria },
      ],
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const llamar = (rol: string | null, metodo: Metodo, ruta: string) => {
    const r = request(app.getHttpServer())[metodo](`${P}${ruta}`);
    if (rol) r.set('Authorization', `Bearer ${tokenPara(rol)}`);
    return metodo === 'get' || metodo === 'delete' ? r : r.send({});
  };

  describe('autenticación (401)', () => {
    it('sin token → 401', async () => {
      const res = await llamar(null, 'get', '/comprobantes-c31');
      expect(res.status).toBe(401);
      expect(sinLlamadas()).toBe(true);
    });

    it('token con firma inválida → 401', async () => {
      const res = await request(app.getHttpServer())
        .get(`${P}/comprobantes-c31`)
        .set('Authorization', 'Bearer abc.def.ghi');
      expect(res.status).toBe(401);
    });

    it('token vencido → 401', async () => {
      const vencido = tokenPara('ADMIN', { expiresIn: -60 });
      const res = await request(app.getHttpServer())
        .get(`${P}/comprobantes-c31`)
        .set('Authorization', `Bearer ${vencido}`);
      expect(res.status).toBe(401);
    });

    it('un rol inventado en el token no abre rutas con @Roles → 403', async () => {
      const res = await llamar('SUPER_HACKER', 'get', '/auditoria');
      expect(res.status).toBe(403);
      expect(sinLlamadas()).toBe(true);
    });
  });

  describe.each([
    ['CONSULTA_AVANZADA'],
    ['SOLO_LECTURA'],
    ['CONSULTA_EXTERNA'],
  ])('perfil de solo consulta: %s', (rol) => {
    it.each([...MODIFICACION, ...ADMINISTRACION])(
      '%s %s → 403',
      async (metodo, ruta) => {
        const res = await llamar(rol, metodo, ruta);
        expect(res.status).toBe(403);
        expect(sinLlamadas()).toBe(true);
      },
    );
  });

  describe('REMITENTE_C31', () => {
    const PROHIBIDAS: Ruta[] = [
      ['post', '/comprobantes-c31/import'],
      ['delete', '/comprobantes-c31/1'],
      ['post', '/uploads/c31/1'],
      ['post', '/uploads/c31/1/digitalizar'],
      ['delete', '/uploads/c31/1/2'],
      ['get', '/comprobantes-c31/export'], // exportar no es de su perfil
      ['get', '/comprobantes-c31/1/seguimiento'], // sin @Roles: perfil restringido
      ['get', '/uploads/c31/1'], // idem
      ...ADMINISTRACION,
    ];

    it.each(PROHIBIDAS)('%s %s → 403', async (metodo, ruta) => {
      const res = await llamar('REMITENTE_C31', metodo, ruta);
      expect(res.status).toBe(403);
      expect(sinLlamadas()).toBe(true);
    });

    it('sí puede listar comprobantes (abierto a todos los perfiles)', async () => {
      const res = await llamar('REMITENTE_C31', 'get', '/comprobantes-c31');
      expect(res.status).toBe(200);
      expect(c31.findAll).toHaveBeenCalledTimes(1);
    });

    it('sí puede pasar un comprobante a "En revisión" y el servicio recibe su perfil', async () => {
      const res = await request(app.getHttpServer())
        .patch(`${P}/comprobantes-c31/1/estado`)
        .set('Authorization', `Bearer ${tokenPara('REMITENTE_C31')}`)
        .send({ estado: 'EN_REVISION' });

      expect(res.status).toBe(200);
      expect(c31.cambiarEstado).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ estado: 'EN_REVISION' }),
        expect.objectContaining({ rolActivo: 'REMITENTE_C31' }),
      );
    });
  });

  describe('SOLO_LECTURA: únicamente consulta del comprobante y su ubicación', () => {
    it('GET /comprobantes-c31/:id → 200', async () => {
      const res = await llamar('SOLO_LECTURA', 'get', '/comprobantes-c31/1');
      expect(res.status).toBe(200);
    });

    it.each<Ruta>([
      ['get', '/comprobantes-c31/export'],
      ['get', '/comprobantes-c31/1/seguimiento'],
      ['get', '/uploads/c31/1'],
    ])('%s %s (fuera de su alcance) → 403', async (metodo, ruta) => {
      const res = await llamar('SOLO_LECTURA', metodo, ruta);
      expect(res.status).toBe(403);
    });
  });

  describe('CONSULTA_AVANZADA: lee y exporta, no modifica', () => {
    it('puede exportar a Excel (ROLES_REPORTES)', async () => {
      const res = await llamar(
        'CONSULTA_AVANZADA',
        'get',
        '/comprobantes-c31/export',
      );
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename=/,
      );
      expect(c31.exportExcel).toHaveBeenCalledTimes(1);
    });

    it('puede ver el seguimiento (sin @Roles: cualquier perfil no restringido)', async () => {
      const res = await llamar(
        'CONSULTA_AVANZADA',
        'get',
        '/comprobantes-c31/1/seguimiento',
      );
      expect(res.status).toBe(200);
    });
  });

  describe('perfiles intermedios', () => {
    it('AUXILIAR_ARCHIVOS no puede importar masivamente (solo ADMIN y OPERADOR)', async () => {
      const res = await llamar(
        'AUXILIAR_ARCHIVOS',
        'post',
        '/comprobantes-c31/import',
      );
      expect(res.status).toBe(403);
      expect(c31.importExcel).not.toHaveBeenCalled();
    });

    it('AUXILIAR_ARCHIVOS no accede a administración', async () => {
      for (const [m, r] of ADMINISTRACION) {
        expect((await llamar('AUXILIAR_ARCHIVOS', m, r)).status).toBe(403);
      }
      expect(sinLlamadas()).toBe(true);
    });

    it('ENCARGADO_PRESTAMOS no registra ni modifica comprobantes', async () => {
      for (const [m, r] of MODIFICACION) {
        expect((await llamar('ENCARGADO_PRESTAMOS', m, r)).status).toBe(403);
      }
      expect(sinLlamadas()).toBe(true);
    });

    it('AUXILIAR_ARCHIVOS sí puede digitalizar (llega al servicio)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`${P}/uploads/c31/1/2`)
        .set('Authorization', `Bearer ${tokenPara('AUXILIAR_ARCHIVOS')}`);
      expect(res.status).toBe(200);
      expect(adjuntos.eliminar).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('perfiles con acceso (control positivo: el 403 no es "todo prohibido")', () => {
    it.each([['ADMIN'], ['OPERADOR_ARCHIVOS']])(
      '%s puede importar (llega al servicio)',
      async (rol) => {
        c31.importExcel.mockResolvedValueOnce({ creados: 0 });
        const res = await request(app.getHttpServer())
          .post(`${P}/comprobantes-c31/import`)
          .set('Authorization', `Bearer ${tokenPara(rol)}`)
          .field('gestion', '2026')
          .attach('file', Buffer.from('xlsx'), 'a.xlsx');

        expect(res.status).toBe(201);
        expect(c31.importExcel).toHaveBeenCalledTimes(1);
      },
    );

    it('ADMIN accede a administración', async () => {
      expect((await llamar('ADMIN', 'get', '/auditoria')).status).toBe(200);
      expect((await llamar('ADMIN', 'get', '/usuarios')).status).toBe(200);
    });

    it('ADMIN puede eliminar un comprobante', async () => {
      const res = await llamar('ADMIN', 'delete', '/comprobantes-c31/1');
      expect(res.status).toBe(200);
      expect(c31.remove).toHaveBeenCalledWith(1);
    });
  });
});
