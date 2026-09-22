import { SetMetadata } from '@nestjs/common';
import type { RolUsuario } from '../../common/constants/roles.constant';

export type { RolUsuario };

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
