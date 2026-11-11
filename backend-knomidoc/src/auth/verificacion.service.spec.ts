/**
 * VerificacionService: códigos de 6 dígitos de un solo uso (verificación de
 * correo y recuperación de contraseña). Reglas: solo se guarda el hash, vence,
 * máximo 5 intentos y 60 s entre reenvíos.
 */
import { BadRequestException, HttpException } from '@nestjs/common';
import * as crypto from 'crypto';
import { VerificacionService } from './verificacion.service';

/** Mismo cálculo que el servicio, para fabricar filas "guardadas". */
const hashDe = (usuarioId: number, proposito: string, codigo: string) =>
  crypto
    .createHash('sha256')
    .update(
      `${usuarioId}:${proposito}:${codigo}:${process.env.JWT_TOKEN ?? ''}`,
    )
    .digest('hex');

function crear() {
  const repo = {
    findOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(undefined),
    increment: jest.fn().mockResolvedValue(undefined),
    create: jest.fn((x: unknown) => x),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const mail = { sendCodigo: jest.fn().mockResolvedValue(undefined) };
  const servicio = new VerificacionService(repo as never, mail as never);
  return { servicio, repo, mail };
}

const USUARIO = { id: 7, email: 'jperez@gamsl.gob.bo', nombreCompleto: 'Juan' };

describe('VerificacionService.emitir', () => {
  const ttlOriginal = process.env.CODIGO_EXPIRA_MINUTOS;
  afterEach(() => {
    if (ttlOriginal === undefined) delete process.env.CODIGO_EXPIRA_MINUTOS;
    else process.env.CODIGO_EXPIRA_MINUTOS = ttlOriginal;
  });

  it('envía por correo un código de 6 dígitos y guarda SOLO su hash', async () => {
    const { servicio, repo, mail } = crear();

    const r = await servicio.emitir(USUARIO, 'EMAIL_VERIFICACION');

    expect(r).toBe(true);
    const codigo = mail.sendCodigo.mock.calls[0][2] as string;
    expect(codigo).toMatch(/^\d{6}$/);

    const guardado = repo.save.mock.calls[0][0];
    expect(guardado.codigoHash).toBe(hashDe(7, 'EMAIL_VERIFICACION', codigo));
    expect(Object.values(guardado)).not.toContain(codigo); // nunca en claro
    expect(guardado).toMatchObject({
      usuarioId: 7,
      proposito: 'EMAIL_VERIFICACION',
      email: USUARIO.email,
      intentos: 0,
      usado: false,
    });
  });

  it('el código vence a los 10 minutos por defecto', async () => {
    delete process.env.CODIGO_EXPIRA_MINUTOS;
    const { servicio, repo } = crear();
    const antes = Date.now();

    await servicio.emitir(USUARIO, 'EMAIL_VERIFICACION');

    const expira = (repo.save.mock.calls[0][0].expira as Date).getTime();
    expect(expira - antes).toBeGreaterThanOrEqual(10 * 60_000 - 50);
    expect(expira - antes).toBeLessThanOrEqual(10 * 60_000 + 1000);
  });

  it.each([
    ['1', 5], // mínimo permitido
    ['120', 30], // máximo permitido
  ])(
    'CODIGO_EXPIRA_MINUTOS=%s se limita a %i minutos',
    async (env, minutos) => {
      process.env.CODIGO_EXPIRA_MINUTOS = env;
      const { servicio, repo } = crear();
      const antes = Date.now();

      await servicio.emitir(USUARIO, 'EMAIL_VERIFICACION');

      const expira = (repo.save.mock.calls[0][0].expira as Date).getTime();
      expect(Math.round((expira - antes) / 60_000)).toBe(minutos);
    },
  );

  it('anula los códigos anteriores sin usar del mismo propósito', async () => {
    const { servicio, repo } = crear();

    await servicio.emitir(USUARIO, 'RECUPERACION_PASSWORD');

    expect(repo.update).toHaveBeenCalledWith(
      { usuarioId: 7, proposito: 'RECUPERACION_PASSWORD', usado: false },
      { usado: true },
    );
  });

  it('antes de 60 s no reenvía: lanza 429 y no manda correo', async () => {
    const { servicio, repo, mail } = crear();
    repo.findOne.mockResolvedValue({
      fechaCreacion: new Date(Date.now() - 20_000),
    });

    const intento = servicio.emitir(USUARIO, 'EMAIL_VERIFICACION');

    await expect(intento).rejects.toBeInstanceOf(HttpException);
    await expect(intento).rejects.toMatchObject({ status: 429 });
    await expect(intento).rejects.toThrow(/Espere \d+ segundos/);
    expect(mail.sendCodigo).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('en modo silencioso el reenvío anticipado devuelve false sin error', async () => {
    const { servicio, repo, mail } = crear();
    repo.findOne.mockResolvedValue({
      fechaCreacion: new Date(Date.now() - 20_000),
    });

    const r = await servicio.emitir(USUARIO, 'RECUPERACION_PASSWORD', true);

    expect(r).toBe(false);
    expect(mail.sendCodigo).not.toHaveBeenCalled();
  });

  it('pasados los 60 s sí permite pedir otro', async () => {
    const { servicio, repo, mail } = crear();
    repo.findOne.mockResolvedValue({
      fechaCreacion: new Date(Date.now() - 61_000),
    });

    await expect(servicio.emitir(USUARIO, 'EMAIL_VERIFICACION')).resolves.toBe(
      true,
    );
    expect(mail.sendCodigo).toHaveBeenCalledTimes(1);
  });
});

describe('VerificacionService.validar', () => {
  const vigente = (codigo: string, extra: Record<string, unknown> = {}) => ({
    id: 50,
    codigoHash: hashDe(7, 'EMAIL_VERIFICACION', codigo),
    intentos: 0,
    ...extra,
  });
  const usuario = { id: 7, email: USUARIO.email };

  it('sin código vigente (vencido, usado o de otro correo) → 400', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(null);

    await expect(
      servicio.validar(usuario, 'EMAIL_VERIFICACION', '123456'),
    ).rejects.toThrow('no es válido o ya expiró');
  });

  it('busca solo códigos sin usar, no vencidos y del mismo correo y propósito', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(null);

    await servicio
      .validar(usuario, 'EMAIL_VERIFICACION', '123456')
      .catch(() => undefined);

    const where = repo.findOne.mock.calls[0][0].where;
    expect(where).toMatchObject({
      usuarioId: 7,
      proposito: 'EMAIL_VERIFICACION',
      email: usuario.email,
      usado: false,
    });
    expect(where.expira).toBeDefined(); // MoreThan(ahora)
  });

  it('un código correcto queda consumido (un solo uso)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(vigente('123456'));

    await expect(
      servicio.validar(usuario, 'EMAIL_VERIFICACION', '123456'),
    ).resolves.toBeUndefined();
    expect(repo.update).toHaveBeenCalledWith(50, { usado: true });
  });

  it('un código incorrecto suma un intento e informa cuántos quedan', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(vigente('123456', { intentos: 1 }));

    await expect(
      servicio.validar(usuario, 'EMAIL_VERIFICACION', '999999'),
    ).rejects.toThrow('Le quedan 3 intento(s)');
    expect(repo.increment).toHaveBeenCalledWith({ id: 50 }, 'intentos', 1);
    expect(repo.update).not.toHaveBeenCalled(); // no se consume
  });

  it('el quinto intento fallido pide solicitar un código nuevo', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(vigente('123456', { intentos: 4 }));

    await expect(
      servicio.validar(usuario, 'EMAIL_VERIFICACION', '999999'),
    ).rejects.toThrow('Solicite un código nuevo');
  });

  it('con 5 intentos agotados ni el código correcto sirve y se invalida', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue(vigente('123456', { intentos: 5 }));

    await expect(
      servicio.validar(usuario, 'EMAIL_VERIFICACION', '123456'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      servicio.validar(usuario, 'EMAIL_VERIFICACION', '123456'),
    ).rejects.toThrow('máximo de intentos');
    expect(repo.update).toHaveBeenCalledWith(50, { usado: true });
  });

  it('un código emitido para otro propósito NO sirve (el propósito va en el hash)', async () => {
    const { servicio, repo } = crear();
    // Guardado como verificación de correo, presentado como recuperación
    repo.findOne.mockResolvedValue(vigente('123456'));

    await expect(
      servicio.validar(usuario, 'RECUPERACION_PASSWORD', '123456'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('un código de otro usuario NO sirve (el id va en el hash)', async () => {
    const { servicio, repo } = crear();
    repo.findOne.mockResolvedValue({
      id: 50,
      codigoHash: hashDe(8, 'EMAIL_VERIFICACION', '123456'),
      intentos: 0,
    });

    await expect(
      servicio.validar(usuario, 'EMAIL_VERIFICACION', '123456'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
