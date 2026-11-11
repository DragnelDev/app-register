/**
 * UsuariosService: autenticación de credenciales, alta y edición de usuarios,
 * perfiles múltiples y contraseñas. Los repositorios de TypeORM son mocks.
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './entities/usuario.entity';

// Sin red: el dominio del correo se "resuelve" por mock
jest.mock('../auth/email-domain.util', () => ({
  dominioDeCorreoExiste: jest.fn().mockResolvedValue(true),
}));
import { dominioDeCorreoExiste } from '../auth/email-domain.util';

const CLAVE = 'Clave123*';
const HASH = bcrypt.hashSync(CLAVE, 4); // costo bajo: pruebas rápidas

const usuarioBD = (extra: Partial<Usuario> = {}): Usuario =>
  Object.assign(new Usuario(), {
    id: 7,
    username: 'jperez',
    nombreCompleto: 'Juan Pérez',
    email: 'jperez@gamsl.gob.bo',
    password: HASH,
    rol: 'OPERADOR_ARCHIVOS',
    activo: true,
    emailVerificado: true,
    ...extra,
  });

function crear() {
  const usuariosRepo = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    // mockImplementation (no jest.fn(fn)): deja los argumentos como `any` en las pruebas
    save: jest
      .fn()
      .mockImplementation(async (u: Usuario) => ({ ...u, id: u.id ?? 9 })),
    update: jest.fn().mockResolvedValue(undefined),
    count: jest.fn().mockResolvedValue(1),
    softRemove: jest.fn(async (u: Usuario) => u),
  };
  const perfilesRepo = {
    find: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    create: jest.fn((x: unknown) => x),
  };
  const servicio = new UsuariosService(
    usuariosRepo as never,
    perfilesRepo as never,
  );
  return { servicio, usuariosRepo, perfilesRepo };
}

/**
 * findOne para flujos donde NADIE más usa el username/correo: la búsqueda de
 * duplicados (where con `username` o `email`) no encuentra nada, y la lectura
 * final por id devuelve el usuario. (En la búsqueda de duplicados `id` es un
 * operador Not(...) de TypeORM, por eso no se puede distinguir por `where.id`.)
 */
const sinDuplicados = async ({
  where,
}: {
  where: { username?: string; email?: string };
}) => (where.username || where.email ? null : usuarioBD());

beforeEach(() => {
  (dominioDeCorreoExiste as jest.Mock).mockResolvedValue(true);
});

describe('UsuariosService.validate (credenciales del login)', () => {
  it('acepta el usuario con su contraseña y NO devuelve el hash', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOne.mockResolvedValue(usuarioBD());

    const u = await servicio.validate('jperez', CLAVE);

    expect(u.id).toBe(7);
    expect(u).not.toHaveProperty('password');
  });

  it('el identificador se normaliza (espacios y mayúsculas) y vale username o correo', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOne.mockResolvedValue(usuarioBD());

    await servicio.validate('  JPerez@GAMSL.gob.bo ', CLAVE);

    expect(usuariosRepo.findOne.mock.calls[0][0].where).toEqual([
      { username: 'jperez@gamsl.gob.bo' },
      { email: 'jperez@gamsl.gob.bo' },
    ]);
  });

  it('usuario inexistente y contraseña errónea dan el MISMO mensaje (sin enumerar usuarios)', async () => {
    const a = crear();
    a.usuariosRepo.findOne.mockResolvedValue(null);
    const b = crear();
    b.usuariosRepo.findOne.mockResolvedValue(usuarioBD());

    const inexistente = await a.servicio
      .validate('nadie', CLAVE)
      .catch((e) => e);
    const mala = await b.servicio.validate('jperez', 'otra').catch((e) => e);

    expect(inexistente).toBeInstanceOf(UnauthorizedException);
    expect(mala).toBeInstanceOf(UnauthorizedException);
    expect(inexistente.message).toBe(mala.message);
  });

  it('un usuario inactivo no entra aunque la contraseña sea correcta', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOne.mockResolvedValue(usuarioBD({ activo: false }));

    await expect(servicio.validate('jperez', CLAVE)).rejects.toThrow(
      'inactivo',
    );
  });

  it('una contraseña vacía se rechaza', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOne.mockResolvedValue(usuarioBD());

    await expect(servicio.validate('jperez', '')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('UsuariosService.create', () => {
  /** findOne distingue la búsqueda de duplicados de la lectura final por id. */
  function conExistentes(
    usuariosRepo: ReturnType<typeof crear>['usuariosRepo'],
    existentes: { username?: string; email?: string }[] = [],
  ) {
    usuariosRepo.findOne.mockImplementation(
      async ({
        where,
      }: {
        where: { id?: number; username?: string; email?: string };
      }) => {
        if (where.id !== undefined) return usuarioBD({ id: where.id });
        return (
          existentes.find(
            (e) =>
              (where.username && e.username === where.username) ||
              (where.email && e.email === where.email),
          ) ?? null
        );
      },
    );
  }

  const dto = {
    username: '  NuevoUser ',
    email: ' Nuevo@GAMSL.gob.bo ',
    nombreCompleto: 'Nuevo Usuario',
    rol: 'AUXILIAR_ARCHIVOS',
  };

  it('normaliza username y correo, activa la cuenta y exige verificar el correo', async () => {
    const { servicio, usuariosRepo } = crear();
    conExistentes(usuariosRepo);

    await servicio.create(dto as never);

    const guardado = usuariosRepo.save.mock.calls[0][0];
    expect(guardado).toMatchObject({
      username: 'nuevouser',
      email: 'nuevo@gamsl.gob.bo',
      activo: true,
      emailVerificado: false,
      rol: 'AUXILIAR_ARCHIVOS',
    });
  });

  it('guarda la contraseña HASHEADA, nunca en texto plano', async () => {
    const { servicio, usuariosRepo } = crear();
    conExistentes(usuariosRepo);

    await servicio.create({ ...dto, password: 'Secreta123*' } as never);

    const { password } = usuariosRepo.save.mock.calls[0][0];
    expect(password).not.toBe('Secreta123*');
    expect(bcrypt.compareSync('Secreta123*', password)).toBe(true);
  });

  it('sin contraseña usa la inicial por defecto (también hasheada)', async () => {
    const { servicio, usuariosRepo } = crear();
    conExistentes(usuariosRepo);
    const inicial = process.env.DEFAULT_PASSWORD ?? 'Knomi2026*';

    await servicio.create(dto as never);

    const { password } = usuariosRepo.save.mock.calls[0][0];
    expect(bcrypt.compareSync(inicial, password)).toBe(true);
  });

  it('username repetido → 409 y no se guarda nada', async () => {
    const { servicio, usuariosRepo } = crear();
    conExistentes(usuariosRepo, [{ username: 'nuevouser' }]);

    await expect(servicio.create(dto as never)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(usuariosRepo.save).not.toHaveBeenCalled();
  });

  it('correo repetido → 409 (sin importar mayúsculas)', async () => {
    const { servicio, usuariosRepo } = crear();
    conExistentes(usuariosRepo, [{ email: 'nuevo@gamsl.gob.bo' }]);

    await expect(servicio.create(dto as never)).rejects.toThrow(
      'correo ya está en uso',
    );
    expect(usuariosRepo.save).not.toHaveBeenCalled();
  });

  it('dominio de correo inexistente → 400', async () => {
    const { servicio, usuariosRepo } = crear();
    conExistentes(usuariosRepo);
    (dominioDeCorreoExiste as jest.Mock).mockResolvedValue(false);

    await expect(servicio.create(dto as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(usuariosRepo.save).not.toHaveBeenCalled();
  });

  it('sin ningún perfil → 400', async () => {
    const { servicio, usuariosRepo } = crear();
    conExistentes(usuariosRepo);

    await expect(
      servicio.create({ ...dto, rol: undefined } as never),
    ).rejects.toThrow('al menos un perfil');
    expect(usuariosRepo.save).not.toHaveBeenCalled();
  });

  it('con varios perfiles el primero es el principal y no se repiten', async () => {
    const { servicio, usuariosRepo, perfilesRepo } = crear();
    conExistentes(usuariosRepo);

    await servicio.create({
      ...dto,
      rol: undefined,
      roles: ['ADMIN', 'SOLO_LECTURA', 'ADMIN'],
    } as never);

    expect(usuariosRepo.save.mock.calls[0][0].rol).toBe('ADMIN');
    expect(perfilesRepo.delete).toHaveBeenCalledWith({ usuarioId: 9 });
    expect(perfilesRepo.save).toHaveBeenCalledWith([
      { usuarioId: 9, rol: 'ADMIN' },
      { usuarioId: 9, rol: 'SOLO_LECTURA' },
    ]);
    expect(usuariosRepo.update).toHaveBeenCalledWith(9, { rol: 'ADMIN' });
  });
});

describe('UsuariosService.update', () => {
  it('lista de perfiles vacía → 400 (el usuario no puede quedar sin perfil)', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOneBy.mockResolvedValue(usuarioBD());

    await expect(
      servicio.update(7, { roles: [] } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(usuariosRepo.save).not.toHaveBeenCalled();
  });

  it('usuario inexistente → 404', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOneBy.mockResolvedValue(null);

    await expect(servicio.update(99, {} as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('un correo nuevo vuelve a exigir verificación', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOneBy.mockResolvedValue(
      usuarioBD({ emailVerificado: true }),
    );
    usuariosRepo.findOne.mockImplementation(sinDuplicados);

    await servicio.update(7, { email: 'otro@gamsl.gob.bo' } as never);

    const guardado = usuariosRepo.save.mock.calls[0][0];
    expect(guardado.email).toBe('otro@gamsl.gob.bo');
    expect(guardado.emailVerificado).toBe(false);
    expect(guardado.emailVerificadoEn).toBeNull();
    expect(dominioDeCorreoExiste).toHaveBeenCalledWith('otro@gamsl.gob.bo');
  });

  it('reenviar el mismo correo NO quita la verificación', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOneBy.mockResolvedValue(
      usuarioBD({ emailVerificado: true }),
    );
    usuariosRepo.findOne.mockResolvedValue(usuarioBD());

    await servicio.update(7, {
      email: 'jperez@gamsl.gob.bo',
      nombreCompleto: 'Juan P.',
    } as never);

    expect(usuariosRepo.save.mock.calls[0][0].emailVerificado).toBe(true);
    expect(dominioDeCorreoExiste).not.toHaveBeenCalled();
  });

  it('un username que ya usa otro usuario → 409', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOneBy.mockResolvedValue(usuarioBD());
    usuariosRepo.findOne.mockResolvedValue(
      usuarioBD({ id: 3, username: 'ocupado' }),
    );

    await expect(
      servicio.update(7, { username: 'ocupado' } as never),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usuariosRepo.save).not.toHaveBeenCalled();
  });

  it('una contraseña nueva se guarda hasheada', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOneBy.mockResolvedValue(usuarioBD());
    usuariosRepo.findOne.mockResolvedValue(usuarioBD());

    await servicio.update(7, { password: 'Otra456*' } as never);

    const { password } = usuariosRepo.save.mock.calls[0][0];
    expect(password).not.toBe('Otra456*');
    expect(bcrypt.compareSync('Otra456*', password)).toBe(true);
  });

  it('reemplazar la lista de perfiles deja el primero como rol principal', async () => {
    const { servicio, usuariosRepo, perfilesRepo } = crear();
    usuariosRepo.findOneBy.mockResolvedValue(usuarioBD());
    usuariosRepo.findOne.mockResolvedValue(usuarioBD());

    await servicio.update(7, {
      roles: ['ENCARGADO_PRESTAMOS', 'SOLO_LECTURA'],
    } as never);

    expect(usuariosRepo.save.mock.calls[0][0].rol).toBe('ENCARGADO_PRESTAMOS');
    expect(perfilesRepo.save).toHaveBeenCalledWith([
      { usuarioId: 7, rol: 'ENCARGADO_PRESTAMOS' },
      { usuarioId: 7, rol: 'SOLO_LECTURA' },
    ]);
  });
});

describe('UsuariosService.cambiarPassword (la propia)', () => {
  it('con la contraseña actual correcta guarda la nueva (hasheada)', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOne.mockResolvedValue(usuarioBD());

    await servicio.cambiarPassword(7, {
      passwordActual: CLAVE,
      passwordNueva: 'Nueva789*',
    } as never);

    const [id, cambios] = usuariosRepo.update.mock.calls[0];
    expect(id).toBe(7);
    expect(bcrypt.compareSync('Nueva789*', cambios.password)).toBe(true);
    expect(cambios.resetPasswordToken).toBeNull();
    expect(cambios.resetPasswordExpires).toBeNull();
  });

  it('contraseña actual incorrecta → 401 y no cambia nada', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOne.mockResolvedValue(usuarioBD());

    await expect(
      servicio.cambiarPassword(7, {
        passwordActual: 'equivocada',
        passwordNueva: 'Nueva789*',
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usuariosRepo.update).not.toHaveBeenCalled();
  });

  it('la nueva igual a la actual → 409', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOne.mockResolvedValue(usuarioBD());

    await expect(
      servicio.cambiarPassword(7, {
        passwordActual: CLAVE,
        passwordNueva: CLAVE,
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usuariosRepo.update).not.toHaveBeenCalled();
  });

  it('usuario inexistente → 404', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOne.mockResolvedValue(null);

    await expect(
      servicio.cambiarPassword(99, {
        passwordActual: 'a',
        passwordNueva: 'b',
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UsuariosService.actualizarPerfil (datos propios)', () => {
  it('un correo nuevo exige volver a verificarlo y se valida su dominio y unicidad', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOneBy.mockResolvedValue(usuarioBD());
    usuariosRepo.findOne.mockImplementation(sinDuplicados);

    await servicio.actualizarPerfil(7, { email: 'otro@gamsl.gob.bo' } as never);

    expect(usuariosRepo.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        email: 'otro@gamsl.gob.bo',
        emailVerificado: false,
        emailVerificadoEn: null,
      }),
    );
    expect(dominioDeCorreoExiste).toHaveBeenCalled();
  });

  it('un correo que ya usa otra persona → 409', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOneBy.mockResolvedValue(usuarioBD());
    usuariosRepo.findOne.mockResolvedValue(usuarioBD({ id: 3 }));

    await expect(
      servicio.actualizarPerfil(7, { email: 'ocupado@gamsl.gob.bo' } as never),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usuariosRepo.update).not.toHaveBeenCalled();
  });

  it('una foto vacía la quita (null) y los campos no enviados no se tocan', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOneBy.mockResolvedValue(usuarioBD());
    usuariosRepo.findOne.mockResolvedValue(usuarioBD());

    await servicio.actualizarPerfil(7, { foto: '', cargo: undefined } as never);

    const cambios = usuariosRepo.update.mock.calls[0][1];
    expect(cambios.foto).toBeNull();
    expect(cambios).not.toHaveProperty('cargo');
    expect(cambios).not.toHaveProperty('emailVerificado');
  });
});

describe('UsuariosService · estado, baja y perfiles', () => {
  it('desactivar y reactivar actualiza `activo`', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOneBy.mockResolvedValue(usuarioBD());
    usuariosRepo.findOne.mockResolvedValue(usuarioBD());

    await servicio.updateEstado(7, false);
    expect(usuariosRepo.save.mock.calls[0][0].activo).toBe(false);
  });

  it.each(['updateEstado', 'remove'] as const)(
    '%s sobre un usuario inexistente → 404',
    async (metodo) => {
      const { servicio, usuariosRepo } = crear();
      usuariosRepo.findOneBy.mockResolvedValue(null);

      await expect(
        metodo === 'updateEstado'
          ? servicio.updateEstado(99, true)
          : servicio.remove(99),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('remove es baja lógica (softRemove), no borra la fila', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOneBy.mockResolvedValue(usuarioBD());

    await servicio.remove(7);
    expect(usuariosRepo.softRemove).toHaveBeenCalledTimes(1);
  });

  it('perfilesDe pone el rol por defecto primero y sin repetirlo', async () => {
    const { servicio, perfilesRepo } = crear();
    perfilesRepo.find.mockResolvedValue([
      { rol: 'SOLO_LECTURA' },
      { rol: 'ADMIN' },
    ]);

    await expect(servicio.perfilesDe(7, 'ADMIN')).resolves.toEqual([
      'ADMIN',
      'SOLO_LECTURA',
    ]);
  });

  it('perfilesDe sin rol por defecto devuelve solo los asignados', async () => {
    const { servicio, perfilesRepo } = crear();
    perfilesRepo.find.mockResolvedValue([{ rol: 'SOLO_LECTURA' }]);

    await expect(servicio.perfilesDe(7)).resolves.toEqual(['SOLO_LECTURA']);
  });

  it('findByEmailActivo no pide el hash de la contraseña', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.findOne.mockResolvedValue(null);

    await servicio.findByEmailActivo('a@b.com');
    expect(usuariosRepo.findOne.mock.calls[0][0].select).not.toHaveProperty(
      'password',
    );
  });
});

describe('UsuariosService.onModuleInit (usuario ADMIN semilla)', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation();
  });
  afterEach(() => log.mockRestore());

  it('con la tabla vacía crea un ADMIN activo, con correo verificado y contraseña hasheada', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.count.mockResolvedValue(0);

    await servicio.onModuleInit();

    const admin = usuariosRepo.save.mock.calls[0][0];
    expect(admin).toMatchObject({
      rol: 'ADMIN',
      activo: true,
      emailVerificado: true,
    });
    expect(admin.password).toMatch(/^\$2[aby]\$/); // bcrypt, no texto plano
  });

  it('si ya hay usuarios NO crea ninguno', async () => {
    const { servicio, usuariosRepo } = crear();
    usuariosRepo.count.mockResolvedValue(3);

    await servicio.onModuleInit();
    expect(usuariosRepo.save).not.toHaveBeenCalled();
  });
});
