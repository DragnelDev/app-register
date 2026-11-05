import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/auth-public.decorator';
import { SIN_VERIFICACION_EMAIL_KEY } from '../decorators/sin-verificacion-email.decorator';
import { Usuario } from '../../usuarios/entities/usuario.entity';

/**
 * Bloquea el uso del sistema hasta que el usuario verifique su correo con el
 * código recibido. Se desactiva con EMAIL_VERIFICACION_OBLIGATORIA=false.
 */
@Injectable()
export class EmailVerificadoGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (process.env.EMAIL_VERIFICACION_OBLIGATORIA === 'false') return true;

    const objetivos = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, objetivos))
      return true;
    if (
      this.reflector.getAllAndOverride<boolean>(
        SIN_VERIFICACION_EMAIL_KEY,
        objetivos,
      )
    )
      return true;

    const usuario = context
      .switchToHttp()
      .getRequest<{ user?: Usuario }>().user;
    if (usuario && usuario.emailVerificado === false) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EMAIL_NO_VERIFICADO',
        message: 'Debe verificar su correo electrónico para continuar',
      });
    }
    return true;
  }
}
