import { SetMetadata } from '@nestjs/common';

export const SIN_VERIFICACION_EMAIL_KEY = 'sinVerificacionEmail';
/** Permite el acceso aunque el correo del usuario aún no esté verificado. */
export const SinVerificacionEmail = () =>
  SetMetadata(SIN_VERIFICACION_EMAIL_KEY, true);
