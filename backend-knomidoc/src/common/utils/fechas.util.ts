import { BadRequestException } from '@nestjs/common';

/** Rechaza fechas fuera de un rango razonable (antes de 2000 o más de un año a futuro). */
export function validarRangoFecha(
  etiqueta: string,
  fecha?: string | null,
): void {
  if (!fecha) return;
  const anio = new Date(fecha).getUTCFullYear();
  if (
    Number.isNaN(anio) ||
    anio < 2000 ||
    anio > new Date().getFullYear() + 1
  ) {
    throw new BadRequestException(
      `${etiqueta} está fuera de un rango razonable`,
    );
  }
}

/** La fecha final no puede ser anterior a la inicial. */
export function validarOrdenFechas(
  mensaje: string,
  desde?: string | null,
  hasta?: string | null,
): void {
  if (desde && hasta && hasta.slice(0, 10) < desde.slice(0, 10)) {
    throw new BadRequestException(mensaje);
  }
}
