import { SetMetadata } from '@nestjs/common';

export type RolUsuario = 'ADMIN' | 'REGISTRADOR' | 'CONSULTA';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
