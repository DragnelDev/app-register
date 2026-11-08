import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateC31CarpetasUbicacionDto } from './dto/create-c31-carpetas-ubicacion.dto';
import { UpdateC31CarpetasUbicacionDto } from './dto/update-c31-carpetas-ubicacion.dto';
import { Carpeta } from '../carpetas/entities/carpeta.entity';
import { C31CarpetasUbicacion } from './entities/c31-carpetas-ubicacion.entity';
import { ComprobantesC31 } from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { registrarCambioEstado } from '../c31-historial/c31-historial.helper';

@Injectable()
export class C31CarpetasUbicacionService {
  constructor(
    @InjectRepository(C31CarpetasUbicacion)
    private readonly repo: Repository<C31CarpetasUbicacion>,
  ) {}

  async create(dto: CreateC31CarpetasUbicacionDto) {
    const comprobanteId = dto.comprobanteId;
    const carpetaId = dto.carpetaId;

    if (comprobanteId === undefined || carpetaId === undefined) {
      throw new BadRequestException(
        'Faltan datos obligatorios para ubicar la carpeta',
      );
    }

    const totalActual = await this.repo.count({
      where: { comprobante: { id: comprobanteId } },
    });
    if (totalActual >= 5) {
      throw new ConflictException(
        'Este comprobante ya ocupa el máximo de 5 carpetas',
      );
    }

    const comprobante = new ComprobantesC31();
    comprobante.id = comprobanteId;

    const carpeta = new Carpeta();
    carpeta.id = carpetaId;

    const entidad = this.repo.create({
      numeroParte: dto.numeroParte,
      comprobante,
      carpeta,
    });
    const guardado = await this.repo.save(entidad);
    await this.registrarMovimiento(
      comprobanteId,
      carpetaId,
      `Ubicado en la carpeta {C} (parte ${dto.numeroParte})`,
    );
    return guardado;
  }

  /** Deja constancia en el seguimiento del comprobante de cada cambio de carpeta. */
  private async registrarMovimiento(
    comprobanteId: number,
    carpetaId: number,
    texto: string,
  ) {
    const m = this.repo.manager;
    const [c, carpeta] = await Promise.all([
      m.findOne(ComprobantesC31, { where: { id: comprobanteId } }),
      m.findOne(Carpeta, {
        where: { id: carpetaId },
        relations: { estante: { deposito: true } },
      }),
    ]);
    if (!c) return;
    const ruta = [
      carpeta?.estante?.deposito?.nombre,
      carpeta?.estante?.codigo,
      carpeta?.codigoCarpeta,
    ]
      .filter(Boolean)
      .join(' › ');
    await registrarCambioEstado(m, {
      comprobanteId,
      estadoAnterior: c.estadoFisico,
      estadoNuevo: c.estadoFisico as string,
      origen: 'SISTEMA',
      referencia: 'Ubicación física',
      detalle: texto.replace('{C}', ruta || `#${carpetaId}`),
    });
  }

  findAll(comprobanteId?: number) {
    return this.repo.find({
      where: comprobanteId ? { comprobante: { id: comprobanteId } } : {},
      relations: { comprobante: true, carpeta: true },
      order: { numeroParte: 'ASC' },
    });
  }

  async findOne(id: number) {
    const item = await this.repo.findOne({
      where: { id },
      relations: { comprobante: true, carpeta: true },
    });
    if (!item) throw new NotFoundException('Registro no encontrado');
    return item;
  }

  async update(id: number, dto: UpdateC31CarpetasUbicacionDto) {
    const item = await this.findOne(id);
    if (dto.numeroParte !== undefined) item.numeroParte = dto.numeroParte;
    if (dto.carpetaId !== undefined)
      item.carpeta = { id: dto.carpetaId } as any;
    return this.repo.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    const comprobanteId = item.comprobante?.id as number;
    const carpetaId = item.carpeta?.id as number;
    const quitado = await this.repo.remove(item);
    if (comprobanteId && carpetaId)
      await this.registrarMovimiento(
        comprobanteId,
        carpetaId,
        'Retirado de la carpeta {C}',
      );
    return quitado;
  }
}
