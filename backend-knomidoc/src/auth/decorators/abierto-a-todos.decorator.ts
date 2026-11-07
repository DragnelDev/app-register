import { SetMetadata } from '@nestjs/common';

export const ABIERTO_A_TODOS_KEY = 'abiertoATodosLosPerfiles';

/**
 * Endpoints sin @Roles() a los que también entran los perfiles restringidos
 * (REMITENTE_C31): sesión, perfil propio y cambio de perfil.
 */
export const AbiertoATodosLosPerfiles = () =>
  SetMetadata(ABIERTO_A_TODOS_KEY, true);
