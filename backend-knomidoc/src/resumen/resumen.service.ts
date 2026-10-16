import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ComprobantesC31,
  EstadoFisicoC31,
} from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { Carpeta } from '../carpetas/entities/carpeta.entity';
import { Estante } from '../estantes/entities/estante.entity';
import { Deposito } from '../depositos/entities/deposito.entity';
import { ActasEntrega } from '../actas-entrega/entities/actas-entrega.entity';
import { PrestamosCuaderno } from '../prestamos-cuaderno/entities/prestamos-cuaderno.entity';
import {
  EstadoPrestamoNota,
  PrestamosNota,
} from '../prestamos-nota/entities/prestamos-nota.entity';

export interface ResumenSistema {
  comprobantes: {
    total: number;
    enTramite: number;
    enRevision: number;
    enArchivo: number;
    archivados: number;
    observados: number;
    prestados: number;
    anulados: number;
    conImputacion: number;
    sinImputacion: number;
  };
  /** Comprobantes vigentes que aún requieren regularizar su vínculo. */
  regularizacion: {
    sinActa: number;
    sinCarpeta: number;
    total: number;
  };
  archivo: { depositos: number; estantes: number; carpetas: number };
  actas: number;
  prestamosActivos: { cuaderno: number; nota: number };
}

@Injectable()
export class ResumenService {
  constructor(private readonly dataSource: DataSource) {}

  async obtener(): Promise<ResumenSistema> {
    const c31 = this.dataSource.getRepository(ComprobantesC31);

    const [
      total,
      enTramite,
      enRevision,
      enArchivo,
      archivados,
      observados,
      prestados,
      anulados,
      conImputacion,
      sinImputacion,
      sinActa,
      sinCarpeta,
      depositos,
      estantes,
      carpetas,
      actas,
      cuaderno,
      nota,
    ] = await Promise.all([
      c31.count(),
      c31.countBy({ estadoFisico: EstadoFisicoC31.EN_TRAMITE }),
      c31.countBy({ estadoFisico: EstadoFisicoC31.EN_REVISION }),
      c31.countBy({ estadoFisico: EstadoFisicoC31.EN_ARCHIVO }),
      c31.countBy({ estadoFisico: EstadoFisicoC31.ARCHIVADO }),
      c31.countBy({ estadoFisico: EstadoFisicoC31.OBSERVADO }),
      c31.countBy({ estadoFisico: EstadoFisicoC31.PRESTADO }),
      c31.countBy({ estadoFisico: EstadoFisicoC31.ANULADO }),
      c31.countBy({ tipoC31: 'CON_IMPUTACION' as ComprobantesC31['tipoC31'] }),
      c31.countBy({ tipoC31: 'SIN_IMPUTACION' as ComprobantesC31['tipoC31'] }),
      this.contarSinActa(),
      this.contarSinCarpeta(),
      this.dataSource.getRepository(Deposito).count(),
      this.dataSource.getRepository(Estante).count(),
      this.dataSource.getRepository(Carpeta).count(),
      this.dataSource.getRepository(ActasEntrega).count(),
      this.dataSource
        .getRepository(PrestamosCuaderno)
        .countBy({ devuelto: false }),
      this.dataSource
        .getRepository(PrestamosNota)
        .countBy({ estadoPrestamo: EstadoPrestamoNota.ENTREGADO }),
    ]);

    return {
      comprobantes: {
        total,
        enTramite,
        enRevision,
        enArchivo,
        archivados,
        observados,
        prestados,
        anulados,
        conImputacion,
        sinImputacion,
      },
      regularizacion: { sinActa, sinCarpeta, total: sinActa + sinCarpeta },
      archivo: { depositos, estantes, carpetas },
      actas,
      prestamosActivos: { cuaderno, nota },
    };
  }

  /** Firmados (En revisión) que todavía no van en ningún acta de entrega. */
  contarSinActa(): Promise<number> {
    return this.dataSource
      .getRepository(ComprobantesC31)
      .createQueryBuilder('c')
      .where('c.acta_entrega_id IS NULL')
      .andWhere("c.estado_fisico = 'EN_REVISION'")
      .getCount();
  }

  /** En archivo (físicamente guardados) sin ninguna carpeta asignada. */
  contarSinCarpeta(): Promise<number> {
    return this.dataSource
      .getRepository(ComprobantesC31)
      .createQueryBuilder('c')
      .where("c.estado_fisico = 'EN_ARCHIVO'")
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM c31_carpetas_ubicacion u WHERE u.comprobante_id = c.id)`,
      )
      .getCount();
  }
}
