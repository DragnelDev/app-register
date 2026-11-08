import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Observable, from, switchMap } from 'rxjs';
import { adjuntarRotuloGrupo } from '../utils/rotulo-grupo.util';

/**
 * Agrega `rotuloGrupo` ("PREV 8 - DEV 7") a todo comprobante unido que salga
 * en cualquier respuesta JSON, para que el sistema lo muestre igual en todas
 * partes (listas, préstamos, actas, detalle).
 */
@Injectable()
export class RotuloGrupoInterceptor implements NestInterceptor {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      switchMap((cuerpo: unknown) =>
        from(
          (async () => {
            if (
              !(cuerpo instanceof StreamableFile) &&
              !Buffer.isBuffer(cuerpo)
            ) {
              try {
                await adjuntarRotuloGrupo(this.ds.manager, cuerpo);
              } catch {
                /* el rótulo es decorativo: nunca debe romper la respuesta */
              }
            }
            return cuerpo;
          })(),
        ),
      ),
    );
  }
}
