/**
 * Arma una aplicación Nest MÍNIMA para pruebas HTTP con Supertest, con la misma
 * cadena de seguridad que producción (app.module.ts):
 *
 *   JwtAuthGuard → EmailVerificadoGuard → RolesGuard
 *
 * - El JWT es real (firmado con @nestjs/jwt y validado por la JwtStrategy real).
 * - Solo se sustituye `AuthService.verifyPayload` (que iría a la BD): devuelve un
 *   usuario cuyo perfil activo es el `rol` del token, igual que hace el real.
 * - Se replica el prefijo `/api` y el versionado URI `/v1` de main.ts, y el
 *   ValidationPipe global.
 *
 * Los servicios de cada controlador se inyectan como dobles (`mockServicio`).
 */
import {
  INestApplication,
  Provider,
  Type,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { JwtStrategy } from '../../src/auth/strategies/jwt.strategy';
import { AuthService } from '../../src/auth/auth.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { EmailVerificadoGuard } from '../../src/auth/guards/email-verificado.guard';
import { RolesGuard } from '../../src/auth/guards/roles.guard';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AppPruebas {
  app: INestApplication;
  /** JWT válido para un perfil. `expiresIn` permite probar tokens vencidos. */
  tokenPara: (
    rol: string,
    opciones?: { expiresIn?: string | number },
  ) => string;
}

export async function crearAppPruebas(meta: {
  controllers: Type<unknown>[];
  providers: Provider[];
}): Promise<AppPruebas> {
  // La JwtStrategy lee el secreto al construirse: debe estar definido antes
  const secreto = process.env.JWT_TOKEN as string;

  const moduleRef = await Test.createTestingModule({
    imports: [PassportModule, JwtModule.register({ secret: secreto })],
    controllers: meta.controllers,
    providers: [
      JwtStrategy,
      {
        provide: AuthService,
        useValue: {
          verifyPayload: async (p: { sub: number; rol?: string }) => ({
            id: p.sub,
            username: `usuario${p.sub}`,
            rol: p.rol,
            rolActivo: p.rol,
            activo: true,
            emailVerificado: true,
          }),
        },
      },
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      { provide: APP_GUARD, useClass: EmailVerificadoGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
      ...meta.providers,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  await app.init();

  const jwt = app.get(JwtService);
  return {
    app,
    tokenPara: (rol, opciones) => jwt.sign({ sub: 1, rol }, opciones as any),
  };
}

/**
 * Doble de un servicio: cualquier método no declarado responde `{ ok: true }`.
 * Los declarados en `base` se usan tal cual (para devolver Buffers, etc.).
 * Cada método es un jest.fn, así que se puede verificar si fue (o no) invocado.
 */
export function mockServicio<T extends Record<string, jest.Mock>>(
  base: T = {} as T,
): Record<string, jest.Mock> & T {
  const cache: Record<string, jest.Mock> = { ...base };
  return new Proxy(cache, {
    get: (obj, prop) => {
      if (typeof prop !== 'string' || prop === 'then') return undefined;
      return (obj[prop] ??= jest.fn().mockResolvedValue({ ok: true }));
    },
  }) as any;
}
