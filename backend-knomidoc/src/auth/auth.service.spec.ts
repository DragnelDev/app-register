/**
 * AuthService: login, cambio de perfil, validación del token (JwtStrategy),
 * verificación de correo y recuperación de contraseña.
 * Todas las dependencias (usuarios, JWT, códigos) se reemplazan por mocks.
 */
import {
  BadRequestException,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Usuario } from '../usuarios/entities/usuario.entity';

const usuarioBD = (extra: Partial<Usuario> = {}): Usuario =>
  Object.assign(new Usuario(), {
    id: 7,
    username: 'jperez',
    nombreCompleto: 'Juan Pérez',
    email: 'jperez@gamsl.gob.bo',
    rol: 'OPERADOR_ARCHIVOS',
    activo: true,
    emailVerificado: true,
    ...extra,
  });

function crearServicio() {
  const usuarios = {
    validate: jest.fn(),
    perfilesDe: jest.fn(),
    findOne: jest.fn(),
    findByEmailActivo: jest.fn(),
    marcarEmailVerificado: jest.fn(),
    actualizarPasswordYLimpiarToken: jest.fn(),
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('TOKEN') };
  const verificacion = {
    emitir: jest.fn().mockResolvedValue(true),
    validar: jest.fn().mockResolvedValue(undefined),
  };
  const servicio = new AuthService(
    usuarios as never,
    jwt as never,
    verificacion as never,
  );
  return { servicio, usuarios, jwt, verificacion };
}

describe('AuthService.login', () => {
  it('firma un token con el primer perfil y devuelve el usuario sin contraseña', async () => {
    const { servicio, usuarios, jwt } = crearServicio();
    usuarios.validate.mockResolvedValue(usuarioBD());
    usuarios.perfilesDe.mockResolvedValue(['OPERADOR_ARCHIVOS']);

    const r = await servicio.login({ username: 'jperez', password: 'x' });

    expect(r.accessToken).toBe('TOKEN');
    expect(r.usuario).toMatchObject({
      id: 7,
      username: 'jperez',
      rol: 'OPERADOR_ARCHIVOS',
      roles: ['OPERADOR_ARCHIVOS'],
    });
    expect(r.usuario).not.toHaveProperty('password');
    expect(jwt.signAsync).toHaveBeenCalledWith(
      {
        sub: 7,
        rol: 'OPERADOR_ARCHIVOS',
        username: 'jperez',
        email: 'jperez@gamsl.gob.bo',
      },
      expect.objectContaining({ secret: process.env.JWT_TOKEN }),
    );
  });

  it('con un solo perfil NO pide elegir perfil', async () => {
    const { servicio, usuarios } = crearServicio();
    usuarios.validate.mockResolvedValue(usuarioBD());
    usuarios.perfilesDe.mockResolvedValue(['OPERADOR_ARCHIVOS']);

    const r = await servicio.login({ username: 'jperez', password: 'x' });
    expect(r.requierePerfil).toBe(false);
  });

  it('con varios perfiles pide elegir y arranca con el principal', async () => {
    const { servicio, usuarios } = crearServicio();
    usuarios.validate.mockResolvedValue(usuarioBD({ rol: 'ADMIN' }));
    usuarios.perfilesDe.mockResolvedValue(['ADMIN', 'SOLO_LECTURA']);

    const r = await servicio.login({ username: 'jperez', password: 'x' });

    expect(r.requierePerfil).toBe(true);
    expect(r.usuario.rol).toBe('ADMIN');
    expect(r.usuario.roles).toEqual(['ADMIN', 'SOLO_LECTURA']);
  });

  it('si no hay filas de perfiles usa el rol del usuario', async () => {
    const { servicio, usuarios } = crearServicio();
    usuarios.validate.mockResolvedValue(
      usuarioBD({ rol: 'AUXILIAR_ARCHIVOS' }),
    );
    usuarios.perfilesDe.mockResolvedValue([]);

    const r = await servicio.login({ username: 'jperez', password: 'x' });
    expect(r.usuario.rol).toBe('AUXILIAR_ARCHIVOS');
    expect(r.requierePerfil).toBe(false);
  });

  it('credenciales inválidas: propaga el error y NO emite token', async () => {
    const { servicio, usuarios, jwt } = crearServicio();
    usuarios.validate.mockRejectedValue(
      new UnauthorizedException('Credenciales inválidas'),
    );

    await expect(
      servicio.login({ username: 'jperez', password: 'mala' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('un usuario sin id se rechaza como inválido', async () => {
    const { servicio, usuarios, jwt } = crearServicio();
    usuarios.validate.mockResolvedValue(usuarioBD({ id: undefined }));

    await expect(
      servicio.login({ username: 'jperez', password: 'x' }),
    ).rejects.toThrow('Usuario inválido');
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});

describe('AuthService.cambiarPerfil', () => {
  it('emite un token nuevo con el perfil elegido', async () => {
    const { servicio, usuarios, jwt } = crearServicio();
    usuarios.perfilesDe.mockResolvedValue(['ADMIN', 'SOLO_LECTURA']);

    const r = await servicio.cambiarPerfil(
      usuarioBD({ rol: 'ADMIN' }),
      'SOLO_LECTURA',
    );

    expect(r).toEqual({
      accessToken: 'TOKEN',
      rol: 'SOLO_LECTURA',
      roles: ['ADMIN', 'SOLO_LECTURA'],
    });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 7, rol: 'SOLO_LECTURA' }),
      expect.anything(),
    );
  });

  it('un perfil que NO tiene asignado → 403 y no se firma nada (escalada de privilegios)', async () => {
    const { servicio, usuarios, jwt } = crearServicio();
    usuarios.perfilesDe.mockResolvedValue(['SOLO_LECTURA']);

    await expect(
      servicio.cambiarPerfil(usuarioBD({ rol: 'SOLO_LECTURA' }), 'ADMIN'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});

describe('AuthService.verifyPayload (validación del token en cada petición)', () => {
  it('usuario inexistente → 401', async () => {
    const { servicio, usuarios } = crearServicio();
    usuarios.findOne.mockRejectedValue(new Error('no existe'));

    await expect(servicio.verifyPayload({ sub: 99 })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('usuario desactivado → 401 aunque su token siga vigente', async () => {
    const { servicio, usuarios } = crearServicio();
    usuarios.findOne.mockResolvedValue(usuarioBD({ activo: false }));

    await expect(
      servicio.verifyPayload({ sub: 7, rol: 'OPERADOR_ARCHIVOS' }),
    ).rejects.toThrow('inactivo');
  });

  it('respeta el perfil indicado en el token si sigue asignado', async () => {
    const { servicio, usuarios } = crearServicio();
    usuarios.findOne.mockResolvedValue(usuarioBD({ rol: 'ADMIN' }));
    usuarios.perfilesDe.mockResolvedValue(['ADMIN', 'SOLO_LECTURA']);

    const u = await servicio.verifyPayload({ sub: 7, rol: 'SOLO_LECTURA' });

    expect(u.rolActivo).toBe('SOLO_LECTURA');
    expect(u.rolesDisponibles).toEqual(['ADMIN', 'SOLO_LECTURA']);
  });

  it('si al usuario le quitaron el perfil del token, vuelve al principal', async () => {
    const { servicio, usuarios } = crearServicio();
    usuarios.findOne.mockResolvedValue(usuarioBD({ rol: 'SOLO_LECTURA' }));
    usuarios.perfilesDe.mockResolvedValue(['SOLO_LECTURA']);

    const u = await servicio.verifyPayload({ sub: 7, rol: 'ADMIN' });
    expect(u.rolActivo).toBe('SOLO_LECTURA');
  });

  it('un token sin rol usa el perfil principal', async () => {
    const { servicio, usuarios } = crearServicio();
    usuarios.findOne.mockResolvedValue(usuarioBD({ rol: 'ADMIN' }));
    usuarios.perfilesDe.mockResolvedValue(['ADMIN', 'SOLO_LECTURA']);

    const u = await servicio.verifyPayload({ sub: 7 });
    expect(u.rolActivo).toBe('ADMIN');
  });

  it('reutiliza los perfiles ya cargados sin consultarlos de nuevo', async () => {
    const { servicio, usuarios } = crearServicio();
    usuarios.findOne.mockResolvedValue(
      usuarioBD({ rolesDisponibles: ['ADMIN'], rol: 'ADMIN' }),
    );

    await servicio.verifyPayload({ sub: 7, rol: 'ADMIN' });
    expect(usuarios.perfilesDe).not.toHaveBeenCalled();
  });
});

describe('AuthService · verificación del correo', () => {
  it('si el correo ya está verificado no envía otro código (400)', async () => {
    const { servicio, verificacion } = crearServicio();

    await expect(
      servicio.enviarCodigoVerificacion(usuarioBD({ emailVerificado: true })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verificacion.emitir).not.toHaveBeenCalled();
  });

  it('envía el código con el propósito EMAIL_VERIFICACION', async () => {
    const { servicio, verificacion } = crearServicio();

    const r = await servicio.enviarCodigoVerificacion(
      usuarioBD({ emailVerificado: false }),
    );

    expect(verificacion.emitir).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, email: 'jperez@gamsl.gob.bo' }),
      'EMAIL_VERIFICACION',
    );
    expect(r.mensaje).toContain('jperez@gamsl.gob.bo');
  });

  it('un código correcto marca el correo como verificado', async () => {
    const { servicio, usuarios, verificacion } = crearServicio();
    const verificado = usuarioBD({ emailVerificado: true });
    usuarios.marcarEmailVerificado.mockResolvedValue(verificado);

    const r = await servicio.verificarEmail(
      usuarioBD({ emailVerificado: false }),
      '123456',
    );

    expect(verificacion.validar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'EMAIL_VERIFICACION',
      '123456',
    );
    expect(usuarios.marcarEmailVerificado).toHaveBeenCalledWith(7);
    expect(r.usuario).toBe(verificado);
  });

  it('un código incorrecto NO marca el correo', async () => {
    const { servicio, usuarios, verificacion } = crearServicio();
    verificacion.validar.mockRejectedValue(new BadRequestException('mal'));

    await expect(
      servicio.verificarEmail(usuarioBD({ emailVerificado: false }), '000000'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(usuarios.marcarEmailVerificado).not.toHaveBeenCalled();
  });

  it('si ya estaba verificado devuelve el usuario sin validar nada', async () => {
    const { servicio, verificacion } = crearServicio();
    const u = usuarioBD({ emailVerificado: true });

    const r = await servicio.verificarEmail(u, '123456');

    expect(r.usuario).toBe(u);
    expect(verificacion.validar).not.toHaveBeenCalled();
  });
});

describe('AuthService.forgotPassword', () => {
  let logError: jest.SpyInstance;
  beforeEach(() => {
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });
  afterEach(() => logError.mockRestore());

  it('responde lo MISMO exista o no el correo (no revela qué correos están registrados)', async () => {
    const a = crearServicio();
    a.usuarios.findByEmailActivo.mockResolvedValue(usuarioBD());
    const b = crearServicio();
    b.usuarios.findByEmailActivo.mockResolvedValue(null);

    const existente = await a.servicio.forgotPassword('jperez@gamsl.gob.bo');
    const inexistente = await b.servicio.forgotPassword('nadie@gamsl.gob.bo');

    expect(existente).toEqual(inexistente);
  });

  it('un correo que no existe NO dispara ningún envío', async () => {
    const { servicio, usuarios, verificacion } = crearServicio();
    usuarios.findByEmailActivo.mockResolvedValue(null);

    await servicio.forgotPassword('nadie@gamsl.gob.bo');
    expect(verificacion.emitir).not.toHaveBeenCalled();
  });

  it('un usuario inactivo NO recibe código', async () => {
    const { servicio, usuarios, verificacion } = crearServicio();
    usuarios.findByEmailActivo.mockResolvedValue(usuarioBD({ activo: false }));

    await servicio.forgotPassword('jperez@gamsl.gob.bo');
    expect(verificacion.emitir).not.toHaveBeenCalled();
  });

  it('emite el código de recuperación en modo silencioso', async () => {
    const { servicio, usuarios, verificacion } = crearServicio();
    usuarios.findByEmailActivo.mockResolvedValue(usuarioBD());

    await servicio.forgotPassword('jperez@gamsl.gob.bo');

    expect(verificacion.emitir).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'RECUPERACION_PASSWORD',
      true,
    );
  });

  it('un fallo del servidor de correo no se filtra al cliente', async () => {
    const { servicio, usuarios, verificacion } = crearServicio();
    usuarios.findByEmailActivo.mockResolvedValue(usuarioBD());
    verificacion.emitir.mockRejectedValue(new Error('SMTP caído'));

    await expect(
      servicio.forgotPassword('jperez@gamsl.gob.bo'),
    ).resolves.toHaveProperty('mensaje');
    expect(logError).toHaveBeenCalled();
  });
});

describe('AuthService.resetPassword', () => {
  const MENSAJE_INVALIDO = 'El código no es válido o ya expiró';

  it.each([
    ['el correo no existe', null],
    ['el usuario está inactivo', usuarioBD({ activo: false })],
  ])('%s → 400 con el mismo mensaje genérico', async (_caso, usuario) => {
    const { servicio, usuarios, verificacion } = crearServicio();
    usuarios.findByEmailActivo.mockResolvedValue(usuario);

    await expect(
      servicio.resetPassword('a@b.com', '123456', 'NuevaClave1*'),
    ).rejects.toThrow(MENSAJE_INVALIDO);
    expect(verificacion.validar).not.toHaveBeenCalled();
    expect(usuarios.actualizarPasswordYLimpiarToken).not.toHaveBeenCalled();
  });

  it('con un código inválido NO cambia la contraseña', async () => {
    const { servicio, usuarios, verificacion } = crearServicio();
    usuarios.findByEmailActivo.mockResolvedValue(usuarioBD());
    verificacion.validar.mockRejectedValue(new BadRequestException('mal'));

    await expect(
      servicio.resetPassword('a@b.com', '000000', 'NuevaClave1*'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(usuarios.actualizarPasswordYLimpiarToken).not.toHaveBeenCalled();
  });

  it('con un código válido cambia la contraseña', async () => {
    const { servicio, usuarios, verificacion } = crearServicio();
    usuarios.findByEmailActivo.mockResolvedValue(usuarioBD());

    const r = await servicio.resetPassword('a@b.com', '123456', 'NuevaClave1*');

    expect(verificacion.validar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'RECUPERACION_PASSWORD',
      '123456',
    );
    expect(usuarios.actualizarPasswordYLimpiarToken).toHaveBeenCalledWith(
      7,
      'NuevaClave1*',
    );
    expect(r.mensaje).toContain('actualizada');
  });

  it('recibir el código prueba que el correo es suyo: lo marca verificado', async () => {
    const { servicio, usuarios } = crearServicio();
    usuarios.findByEmailActivo.mockResolvedValue(
      usuarioBD({ emailVerificado: false }),
    );

    await servicio.resetPassword('a@b.com', '123456', 'NuevaClave1*');
    expect(usuarios.marcarEmailVerificado).toHaveBeenCalledWith(7);
  });

  it('si ya estaba verificado no vuelve a marcarlo', async () => {
    const { servicio, usuarios } = crearServicio();
    usuarios.findByEmailActivo.mockResolvedValue(
      usuarioBD({ emailVerificado: true }),
    );

    await servicio.resetPassword('a@b.com', '123456', 'NuevaClave1*');
    expect(usuarios.marcarEmailVerificado).not.toHaveBeenCalled();
  });
});
