import {
  ForbiddenException,
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RolUsuario } from '../decorators/roles.decorator';
import { ABIERTO_A_TODOS_KEY } from '../decorators/abierto-a-todos.decorator';
import { ABIERTO_A_SOLO_LECTURA_KEY } from '../decorators/abierto-a-solo-lectura.decorator';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

/** Perfiles que solo acceden a lo que declara su rol (no al "abierto a cualquier autenticado"). */
const PERFILES_RESTRINGIDOS: readonly string[] = ['REMITENTE_C31'];

/** Perfiles de consulta básica: solo ven el comprobante y su ubicación. */
const PERFILES_SOLO_UBICACION: readonly string[] = [
  'SOLO_LECTURA',
  'CONSULTA_EXTERNA',
];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const objetivos = [context.getHandler(), context.getClass()];
    const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      objetivos,
    );

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const usuario = request.user;
    // Perfil con el que trabaja en esta sesión (token); si falta, el rol principal
    const rol = usuario?.rolActivo ?? usuario?.rol;

    // Sin @Roles(): cualquier usuario autenticado, salvo los perfiles restringidos
    if (!requiredRoles || requiredRoles.length === 0) {
      if (
        usuario &&
        rol &&
        PERFILES_SOLO_UBICACION.includes(rol) &&
        !this.reflector.getAllAndOverride<boolean>(
          ABIERTO_A_SOLO_LECTURA_KEY,
          objetivos,
        )
      ) {
        throw new ForbiddenException(
          'Su perfil solo permite consultar comprobantes y su ubicación',
        );
      }
      if (
        usuario &&
        rol &&
        PERFILES_RESTRINGIDOS.includes(rol) &&
        !this.reflector.getAllAndOverride<boolean>(
          ABIERTO_A_TODOS_KEY,
          objetivos,
        )
      ) {
        throw new ForbiddenException(
          'Su perfil no tiene acceso a este recurso',
        );
      }
      return true;
    }

    if (!usuario || !rol || !requiredRoles.includes(rol as RolUsuario)) {
      throw new ForbiddenException(
        'No tiene permisos suficientes para realizar esta acción',
      );
    }

    return true;
  }
}
