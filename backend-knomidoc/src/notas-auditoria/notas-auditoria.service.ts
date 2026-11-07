import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotaAuditoria } from './entities/nota-auditoria.entity';
import {
  CreateNotaAuditoriaDto,
  UpdateNotaAuditoriaDto,
} from './dto/nota-auditoria.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { notaAuditoriaPdf } from './nota-auditoria-pdf.util';

const hoy = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });

@Injectable()
export class NotasAuditoriaService {
  constructor(
    @InjectRepository(NotaAuditoria) private readonly repo: Repository<NotaAuditoria>,
  ) {}

  /** CITE correlativo por gestión: GAMSL/ARCH/AUD/OF-N° 004/2026 */
  private async siguienteCite(anio: number): Promise<string> {
    const prefijo = process.env.CITE_PREFIJO ?? 'GAMSL/ARCH';
    const filas = await this.repo
      .createQueryBuilder('n')
      .select('n.cite', 'cite')
      .where('n.cite LIKE :p', { p: `${prefijo}/AUD/OF-N° %/${anio}` })
      .getRawMany<{ cite: string }>();
    let max = 0;
    for (const f of filas) {
      const m = /OF-N° (\d+)\//.exec(f.cite);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `${prefijo}/AUD/OF-N° ${String(max + 1).padStart(3, '0')}/${anio}`;
  }

  async create(dto: CreateNotaAuditoriaDto, usuario: Usuario) {
    const fecha = dto.fecha ?? hoy();
    const cite = dto.cite?.trim() || (await this.siguienteCite(Number(fecha.slice(0, 4))));
    if (await this.repo.existsBy({ cite }))
      throw new ConflictException(`Ya existe una nota con el CITE ${cite}`);
    return this.repo.save(
      this.repo.create({
        ...dto,
        cite,
        fecha,
        introduccion: dto.introduccion ?? '',
        cierre: dto.cierre ?? '',
        secciones: dto.secciones ?? [],
        creadoPorId: usuario.id,
      }),
    );
  }

  findAll(search?: string) {
    const qb = this.repo.createQueryBuilder('n').orderBy('n.fecha', 'DESC').addOrderBy('n.id', 'DESC');
    if (search?.trim())
      qb.where('(n.cite ILIKE :s OR n.referencia ILIKE :s)', { s: `%${search.trim()}%` });
    return qb.take(200).getMany();
  }

  async findOne(id: number) {
    const n = await this.repo.findOneBy({ id });
    if (!n) throw new NotFoundException('Nota no encontrada');
    return n;
  }

  async update(id: number, dto: UpdateNotaAuditoriaDto) {
    const n = await this.findOne(id);
    if (dto.cite && dto.cite !== n.cite && (await this.repo.existsBy({ cite: dto.cite })))
      throw new ConflictException(`Ya existe una nota con el CITE ${dto.cite}`);
    Object.assign(n, dto);
    return this.repo.save(n);
  }

  async remove(id: number) {
    await this.repo.softRemove(await this.findOne(id));
  }

  async pdf(id: number) {
    return notaAuditoriaPdf(await this.findOne(id));
  }
}
