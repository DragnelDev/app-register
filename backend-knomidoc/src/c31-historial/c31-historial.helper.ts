import { EntityManager } from 'typeorm';
import { C31Historial, OrigenCambioC31 } from './entities/c31-historial.entity';

/** Registra un cambio de estado del comprobante dentro de la transacción en curso. */
export function registrarCambioEstado(
  manager: EntityManager,
  datos: {
    comprobanteId: number;
    estadoAnterior?: string | null;
    estadoNuevo: string;
    origen: OrigenCambioC31;
    usuarioId?: number | null;
    detalle?: string | null;
    referencia?: string | null;
  },
): Promise<C31Historial> {
  return manager.save(
    C31Historial,
    manager.create(C31Historial, {
      comprobanteId: datos.comprobanteId,
      estadoAnterior: datos.estadoAnterior ?? null,
      estadoNuevo: datos.estadoNuevo,
      origen: datos.origen,
      usuarioId: datos.usuarioId ?? null,
      detalle: datos.detalle ?? null,
      referencia: datos.referencia ?? null,
    }),
  );
}
