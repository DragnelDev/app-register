import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { AuditoriaService, sanitizarDetalle } from './auditoria.service';
import type { Usuario } from '../usuarios/entities/usuario.entity';

const METODOS_AUDITADOS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
/** Rutas que no aportan valor a la bitácora. */
const RUTAS_OMITIDAS = ['auth/forgot-password', 'auth/reset-password'];

const ACCIONES_POR_SUBRUTA: Record<string, string> = {
  devolver: 'DEVOLVER',
  import: 'IMPORTAR',
  activar: 'ACTIVAR',
  cerrar: 'CERRAR',
  reabrir: 'REABRIR',
  estado: 'CAMBIAR_ESTADO',
};

interface PeticionAutenticada extends Request {
  user?: Usuario;
}

/** Descompone '/api/v1/comprobantes-c31/12/devolver?x=1' en sus partes útiles. */
export function analizarRuta(url: string): {
  entidad: string;
  registroId: string | null;
  subruta: string | null;
  rutaLimpia: string;
} {
  const rutaLimpia = url.split('?')[0];
  const segmentos = rutaLimpia
    .split('/')
    .filter(Boolean)
    .filter((s) => s !== 'api' && !/^v\d+$/.test(s));
  const [entidad = 'desconocido', ...resto] = segmentos;
  const registroId = resto.find((s) => /^\d+$/.test(s)) ?? null;
  const subruta = resto.find((s) => !/^\d+$/.test(s)) ?? null;
  return { entidad, registroId, subruta, rutaLimpia };
}

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(private readonly auditoria: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<PeticionAutenticada>();
    if (!METODOS_AUDITADOS.has(req.method)) return next.handle();

    const { entidad, registroId, subruta, rutaLimpia } = analizarRuta(
      req.originalUrl ?? req.url,
    );
    if (RUTAS_OMITIDAS.some((r) => rutaLimpia.endsWith(r))) {
      return next.handle();
    }

    const esLogin = rutaLimpia.endsWith('auth/login');
    const detalle = esLogin ? null : sanitizarDetalle(req.body);

    return next.handle().pipe(
      tap((respuesta: unknown) => {
        let usuario = req.user;
        if (esLogin) {
          usuario = (respuesta as { usuario?: Usuario } | undefined)?.usuario;
        }
        // Sin usuario identificado no hay a quién atribuir la acción
        if (!usuario) return;

        let accion: string;
        if (esLogin) accion = 'LOGIN';
        else if (subruta && ACCIONES_POR_SUBRUTA[subruta])
          accion = ACCIONES_POR_SUBRUTA[subruta];
        else if (req.method === 'POST') accion = 'CREAR';
        else if (req.method === 'DELETE') accion = 'ELIMINAR';
        else accion = 'ACTUALIZAR';

        // Para altas, el id del registro creado viene en la respuesta
        const idRespuesta = (respuesta as { id?: number | string } | undefined)
          ?.id;

        void this.auditoria.registrar({
          usuarioId: usuario.id ?? null,
          usuarioNombre: usuario.nombreCompleto ?? usuario.username ?? null,
          rol: usuario.rolActivo ?? usuario.rol ?? null,
          accion,
          entidad,
          registroId:
            registroId ??
            (idRespuesta !== undefined ? String(idRespuesta) : null),
          metodo: req.method,
          ruta: rutaLimpia.slice(0, 255),
          ip: req.ip ?? null,
          detalle,
        });
      }),
    );
  }
}
