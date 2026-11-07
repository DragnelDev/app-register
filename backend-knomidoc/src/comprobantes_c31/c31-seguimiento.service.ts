import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComprobantesC31 } from './entities/comprobantes_c31.entity';
import { C31Historial } from '../c31-historial/entities/c31-historial.entity';
import { PrestamosNota } from '../prestamos-nota/entities/prestamos-nota.entity';
import { C31CarpetasUbicacion } from '../c31-carpetas-ubicacion/entities/c31-carpetas-ubicacion.entity';
import { PrestamosCuaderno } from '../prestamos-cuaderno/entities/prestamos-cuaderno.entity';

export interface PrestamoSeguimiento {
  tipo: 'CUADERNO' | 'NOTA';
  id: number;
  /** Referencia: N° de nota o "Cuaderno de salida". */
  referencia: string;
  solicitante: string;
  institucionOArea: string;
  fechaSalida: string;
  fechaDevolucionEstimada: string | null;
  fechaDevolucion: string | null;
  devuelto: boolean;
  vencido: boolean;
  diasPrestado: number;
  diasVencido: number;
  registradoPor: string | null;
  recibidoPor: string | null;
  metodoVerificacion: string | null;
  evidenciaVerificacionUrl: string | null;
  observaciones: string | null;
  condicionDevolucion: string | null;
  observacionesDevolucion: string | null;
}

const DIA_MS = 24 * 60 * 60 * 1000;
const aFecha = (v?: Date | string | null): string | null =>
  v ? (v instanceof Date ? v.toISOString() : String(v)) : null;
/** Días enteros entre dos fechas (solo la parte de fecha). */
const diasEntre = (desde: string, hasta: string): number =>
  Math.max(
    0,
    Math.floor(
      (Date.parse(hasta.slice(0, 10)) - Date.parse(desde.slice(0, 10))) /
        DIA_MS,
    ),
  );

/** Seguimiento de un comprobante: bitácora de estados y detalle de cada préstamo. */
@Injectable()
export class C31SeguimientoService {
  constructor(
    @InjectRepository(ComprobantesC31)
    private readonly repo: Repository<ComprobantesC31>,
    @InjectRepository(C31Historial)
    private readonly historialRepo: Repository<C31Historial>,
    @InjectRepository(PrestamosNota)
    private readonly notaRepo: Repository<PrestamosNota>,
    @InjectRepository(PrestamosCuaderno)
    private readonly cuadernoRepo: Repository<PrestamosCuaderno>,
  ) {}

  async obtener(id: number) {
    const comprobante = await this.repo.findOne({
      where: { id },
      relations: { actaEntrega: true },
    });
    if (!comprobante)
      throw new NotFoundException('El comprobante C31 no existe');

    const [historial, notas, cuaderno] = await Promise.all([
      this.historialRepo.find({
        where: { comprobanteId: id },
        relations: { usuario: true },
        order: { fecha: 'DESC', id: 'DESC' },
      }),
      this.notaRepo.find({
        where: { comprobanteId: id },
        relations: { registradoPor: true, recibidoPor: true },
      }),
      this.cuadernoRepo.find({
        where: { comprobanteId: id },
        relations: {
          funcionario: true,
          solicitante: true,
          registradoPor: true,
          recibidoPor: true,
        },
      }),
    ]);

    // Dónde está físicamente: carpeta(s) → estante → depósito
    const ubicaciones = await this.repo.manager.find(C31CarpetasUbicacion, {
      where: { comprobante: { id } },
      relations: { carpeta: { estante: { deposito: true } } },
      order: { numeroParte: 'ASC' },
    });

    const ahora = new Date().toISOString();
    const hoy = ahora.slice(0, 10);

    const prestamos: PrestamoSeguimiento[] = [
      ...notas.map((p): PrestamoSeguimiento => {
        const devuelto = p.estadoPrestamo === 'DEVUELTO';
        const salida = String(p.fechaPrestamo);
        const estimada = p.fechaDevolucionEstimada ?? null;
        const vencido = !devuelto && !!estimada && estimada < hoy;
        return {
          tipo: 'NOTA',
          id: p.id as number,
          referencia: `Nota ${p.numeroNotaSolicitud}`,
          solicitante: p.funcionarioResponsable ?? '—',
          institucionOArea: p.institucionSolicitante ?? '—',
          fechaSalida: salida,
          fechaDevolucionEstimada: estimada,
          fechaDevolucion: p.fechaDevolucionReal ?? null,
          devuelto,
          vencido,
          diasPrestado: diasEntre(salida, p.fechaDevolucionReal ?? hoy),
          diasVencido: vencido ? diasEntre(estimada as string, hoy) : 0,
          registradoPor: p.registradoPor?.nombreCompleto ?? null,
          recibidoPor: p.recibidoPor?.nombreCompleto ?? null,
          metodoVerificacion: null,
          evidenciaVerificacionUrl: null,
          observaciones: p.observaciones ?? null,
          condicionDevolucion: p.condicionDevolucion ?? null,
          observacionesDevolucion: p.observacionesDevolucion ?? null,
        };
      }),
      ...cuaderno.map((p): PrestamoSeguimiento => {
        const salida = aFecha(p.fechaHoraSalida) as string;
        const estimada = p.fechaDevolucionEstimada ?? null;
        const vencido = !p.devuelto && !!estimada && estimada < hoy;
        return {
          tipo: 'CUADERNO',
          id: p.id as number,
          referencia: 'Cuaderno de salida',
          solicitante: p.funcionario
            ? `${p.funcionario.nombres} ${p.funcionario.apellidos}`
            : (p.solicitante?.nombreCompleto ?? '—'),
          institucionOArea: p.areaUnidad as string,
          fechaSalida: salida,
          fechaDevolucionEstimada: estimada,
          fechaDevolucion: aFecha(p.fechaHoraDevolucion),
          devuelto: !!p.devuelto,
          vencido,
          diasPrestado: diasEntre(
            salida,
            aFecha(p.fechaHoraDevolucion) ?? ahora,
          ),
          diasVencido: vencido ? diasEntre(estimada as string, hoy) : 0,
          registradoPor: p.registradoPor?.nombreCompleto ?? null,
          recibidoPor: p.recibidoPor?.nombreCompleto ?? null,
          metodoVerificacion: p.metodoVerificacion ?? null,
          evidenciaVerificacionUrl: p.evidenciaVerificacionUrl ?? null,
          observaciones: p.observaciones ?? null,
          condicionDevolucion: p.condicionDevolucion ?? null,
          observacionesDevolucion: p.observacionesDevolucion ?? null,
        };
      }),
    ].sort((a, b) => b.fechaSalida.localeCompare(a.fechaSalida));

    // Quién lo tiene hoy, si está prestado
    const activo = prestamos.find((p) => !p.devuelto) ?? null;

    return {
      comprobanteId: id,
      estadoFisico: comprobante.estadoFisico,
      ubicacion: {
        ubicacionFisica: comprobante.ubicacionFisica ?? null,
        numeroFolio: comprobante.numeroFolio ?? null,
        carpetas: ubicaciones.map((u) => ({
          id: u.id,
          numeroParte: u.numeroParte,
          carpeta: u.carpeta?.codigoCarpeta ?? null,
          referencia: u.carpeta?.ubicacionFisica ?? null,
          estante: u.carpeta?.estante?.codigo ?? null,
          deposito: u.carpeta?.estante?.deposito
            ? `${u.carpeta.estante.deposito.codigo} — ${u.carpeta.estante.deposito.nombre}`
            : null,
        })),
        enPoderDe: activo
          ? {
              solicitante: activo.solicitante,
              institucionOArea: activo.institucionOArea,
              desde: activo.fechaSalida,
              devolucionEstimada: activo.fechaDevolucionEstimada,
              vencido: activo.vencido,
              referencia: activo.referencia,
            }
          : null,
      },
      acta: comprobante.actaEntrega
        ? {
            id: comprobante.actaEntrega.id,
            numeroActa: comprobante.actaEntrega.numeroActa,
            estado: comprobante.actaEntrega.estado,
          }
        : null,
      resumenPrestamos: {
        total: prestamos.length,
        activos: prestamos.filter((p) => !p.devuelto).length,
        vencidos: prestamos.filter((p) => p.vencido).length,
        conNovedad: prestamos.filter(
          (p) => p.condicionDevolucion === 'CON_NOVEDAD',
        ).length,
      },
      prestamos,
      historial: historial.map((h) => ({
        id: h.id,
        fecha: h.fecha,
        estadoAnterior: h.estadoAnterior ?? null,
        estadoNuevo: h.estadoNuevo,
        origen: h.origen,
        referencia: h.referencia ?? null,
        detalle: h.detalle ?? null,
        usuario: h.usuario?.nombreCompleto ?? null,
      })),
    };
  }
}
