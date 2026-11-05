import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { MoreThan, Repository } from 'typeorm';
import {
  CodigoVerificacion,
  PropositoCodigo,
} from './entities/codigo-verificacion.entity';
import { MailService } from '../mail/mail.service';

const MAX_INTENTOS = 5;
const REENVIO_SEGUNDOS = 60;

/** Minutos de vigencia del código (10 por defecto; configurable entre 5 y 30). */
const ttlMinutos = (): number =>
  Math.min(30, Math.max(5, Number(process.env.CODIGO_EXPIRA_MINUTOS ?? 10)));

const hashCodigo = (usuarioId: number, proposito: string, codigo: string) =>
  crypto
    .createHash('sha256')
    .update(
      `${usuarioId}:${proposito}:${codigo}:${process.env.JWT_TOKEN ?? ''}`,
    )
    .digest('hex');

/** Genera, envía y valida códigos numéricos de un solo uso. */
@Injectable()
export class VerificacionService {
  constructor(
    @InjectRepository(CodigoVerificacion)
    private readonly repo: Repository<CodigoVerificacion>,
    private readonly mail: MailService,
  ) {}

  /**
   * Crea un código nuevo (anulando los anteriores) y lo envía por correo.
   * Devuelve false si se omitió por el tiempo mínimo entre reenvíos y
   * `silencioso` es true (recuperación de contraseña, para no revelar datos).
   */
  async emitir(
    usuario: { id: number; email: string; nombreCompleto?: string },
    proposito: PropositoCodigo,
    silencioso = false,
  ): Promise<boolean> {
    const reciente = await this.repo.findOne({
      where: { usuarioId: usuario.id, proposito },
      order: { id: 'DESC' },
    });
    if (reciente?.fechaCreacion) {
      const pasados = (Date.now() - reciente.fechaCreacion.getTime()) / 1000;
      if (pasados < REENVIO_SEGUNDOS) {
        if (silencioso) return false;
        throw new HttpException(
          `Espere ${Math.ceil(REENVIO_SEGUNDOS - pasados)} segundos antes de pedir otro código`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    await this.repo.update(
      { usuarioId: usuario.id, proposito, usado: false },
      { usado: true },
    );

    const codigo = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.repo.save(
      this.repo.create({
        usuarioId: usuario.id,
        proposito,
        email: usuario.email,
        codigoHash: hashCodigo(usuario.id, proposito, codigo),
        expira: new Date(Date.now() + ttlMinutos() * 60_000),
        intentos: 0,
        usado: false,
      }),
    );

    await this.mail.sendCodigo(
      usuario.email,
      usuario.nombreCompleto ?? '',
      codigo,
      proposito,
      ttlMinutos(),
    );
    return true;
  }

  /** Valida el código; si es correcto queda consumido. Lanza error si no sirve. */
  async validar(
    usuario: { id: number; email: string },
    proposito: PropositoCodigo,
    codigo: string,
  ): Promise<void> {
    const invalido = new BadRequestException(
      'El código no es válido o ya expiró. Solicite uno nuevo.',
    );
    const vigente = await this.repo.findOne({
      where: {
        usuarioId: usuario.id,
        proposito,
        email: usuario.email,
        usado: false,
        expira: MoreThan(new Date()),
      },
      order: { id: 'DESC' },
    });
    if (!vigente) throw invalido;

    if ((vigente.intentos ?? 0) >= MAX_INTENTOS) {
      await this.repo.update(vigente.id as number, { usado: true });
      throw new BadRequestException(
        'Superó el máximo de intentos. Solicite un código nuevo.',
      );
    }

    const esperado = Buffer.from(vigente.codigoHash as string, 'hex');
    const recibido = Buffer.from(
      hashCodigo(usuario.id, proposito, codigo),
      'hex',
    );
    const coincide =
      esperado.length === recibido.length &&
      crypto.timingSafeEqual(esperado, recibido);

    if (!coincide) {
      await this.repo.increment({ id: vigente.id }, 'intentos', 1);
      const restantes = MAX_INTENTOS - (vigente.intentos ?? 0) - 1;
      throw new BadRequestException(
        restantes > 0
          ? `Código incorrecto. Le quedan ${restantes} intento(s).`
          : 'Código incorrecto. Solicite un código nuevo.',
      );
    }
    await this.repo.update(vigente.id as number, { usado: true });
  }
}
