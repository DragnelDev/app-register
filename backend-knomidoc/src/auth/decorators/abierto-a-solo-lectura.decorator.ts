import { SetMetadata } from '@nestjs/common';

export const ABIERTO_A_SOLO_LECTURA_KEY = 'abiertoASoloLectura';

/**
 * Endpoints a los que entra el perfil SOLO_LECTURA (y CONSULTA_EXTERNA): su única
 * función es consultar el comprobante y dónde está. Todo lo demás queda cerrado.
 */
export const AbiertoASoloLectura = () =>
  SetMetadata(ABIERTO_A_SOLO_LECTURA_KEY, true);
