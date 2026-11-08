import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { CambiarPasswordDto, UpdatePerfilDto } from './dto/perfil.dto';
import { dominioDeCorreoExiste } from '../auth/email-domain.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { UsuarioPerfil } from './entities/usuario-perfil.entity';
import { ILike, In, Like, Not, Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { paginationSkip } from '../common/utils/pagination.util';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/** Columnas visibles de un usuario (nunca incluye la contraseña). */
const SELECT_SAFE = {
  id: true,
  username: true,
  nombreCompleto: true,
  email: true,
  cargo: true,
  unidadOArea: true,
  telefono: true,
  foto: true,
  rol: true,
  activo: true,
  emailVerificado: true,
  fechaCreacion: true,
} as const;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(UsuarioPerfil)
    private readonly perfilesRepository: Repository<UsuarioPerfil>,
  ) {}

  /**
   * Perfiles del usuario; el perfil por defecto (`rol`) va primero. Un usuario
   * anterior a los perfiles múltiples solo tiene su `rol`.
   */
  async perfilesDe(
    usuarioId: number,
    rolPorDefecto?: string,
  ): Promise<string[]> {
    const filas = await this.perfilesRepository.find({
      where: { usuarioId },
      order: { id: 'ASC' },
    });
    const roles = filas.map((f) => f.rol as string);
    if (rolPorDefecto) {
      const resto = roles.filter((r) => r !== rolPorDefecto);
      return [rolPorDefecto, ...resto];
    }
    return roles;
  }

  /** Reemplaza el conjunto de perfiles del usuario y deja `rol` = el primero. */
  private async guardarPerfiles(usuarioId: number, roles: string[]) {
    const unicos = [...new Set(roles)];
    await this.perfilesRepository.delete({ usuarioId });
    if (unicos.length > 0) {
      await this.perfilesRepository.save(
        unicos.map((rol) => this.perfilesRepository.create({ usuarioId, rol })),
      );
    }
    await this.usuariosRepository.update(usuarioId, { rol: unicos[0] });
  }

  private async conPerfiles(usuario: Usuario): Promise<Usuario> {
    usuario.rolesDisponibles = await this.perfilesDe(
      usuario.id as number,
      usuario.rol,
    );
    return usuario;
  }

  /**
   * Siembra un usuario ADMIN por defecto si la tabla está vacía.
   * Necesario porque la gestión de usuarios es exclusiva de ADMIN (RF-01.2)
   * y de lo contrario nadie podría crear el primer usuario del sistema.
   */
  async onModuleInit(): Promise<void> {
    const total = await this.usuariosRepository.count();
    if (total > 0) return;

    const username = (process.env.ADMIN_USERNAME ?? 'admin').toLowerCase();
    const email = process.env.ADMIN_EMAIL ?? 'admin@knomidoc.com';
    const passwordPlano =
      process.env.ADMIN_PASSWORD ??
      process.env.DEFAULT_PASSWORD ??
      'Knomi2026*';

    const admin = new Usuario();
    admin.username = username;
    admin.nombreCompleto = 'Administrador del Sistema';
    admin.email = email;
    admin.rol = 'ADMIN';
    admin.activo = true;
    admin.emailVerificado = true; // cuenta semilla: no depende del SMTP
    admin.emailVerificadoEn = new Date();
    admin.password = bcrypt.hashSync(passwordPlano, SALT_ROUNDS);

    await this.usuariosRepository.save(admin);
    console.log(
      `[Seed] Usuario ADMIN creado por defecto -> username: ${username} / password: ${passwordPlano} (cámbiela luego de iniciar sesión)`,
    );
  }

  /** username y email son únicos (UK en el DER). */
  private async validarUnicidad(
    username?: string,
    email?: string,
    excluirId?: number,
  ): Promise<void> {
    const excluir = excluirId ? { id: Not(excluirId) } : {};
    if (username) {
      const existente = await this.usuariosRepository.findOne({
        where: { username, ...excluir },
        withDeleted: true,
      });
      if (existente)
        throw new ConflictException('El nombre de usuario ya existe');
    }
    if (email) {
      const existente = await this.usuariosRepository.findOne({
        where: { email, ...excluir },
        withDeleted: true,
      });
      if (existente) throw new ConflictException('El correo ya está en uso');
    }
  }

  /** El dominio del correo debe existir (la propiedad se confirma luego con el código). */
  private async validarDominioCorreo(email: string) {
    if (!(await dominioDeCorreoExiste(email))) {
      throw new BadRequestException(
        'El dominio del correo no existe o no recibe mensajes. Revise que esté bien escrito.',
      );
    }
  }

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    const username = createUsuarioDto.username?.trim().toLowerCase() ?? '';
    const email = createUsuarioDto.email?.trim().toLowerCase() ?? '';

    await this.validarUnicidad(username, email);
    await this.validarDominioCorreo(email);

    const passwordPlano =
      createUsuarioDto.password ?? process.env.DEFAULT_PASSWORD ?? 'Knomi2026*';

    const { password: _omitido, roles: _roles, ...resto } = createUsuarioDto;
    void _omitido;
    const perfiles = createUsuarioDto.roles?.length
      ? createUsuarioDto.roles
      : createUsuarioDto.rol
        ? [createUsuarioDto.rol]
        : [];
    if (perfiles.length === 0) {
      throw new BadRequestException(
        'Asigne al menos un perfil (rol) al usuario',
      );
    }
    (resto as { rol?: string }).rol = perfiles[0];

    const usuario = new Usuario();
    Object.assign(usuario, resto);
    usuario.username = username;
    usuario.email = email;
    usuario.activo = true;
    usuario.emailVerificado = false; // debe confirmar su correo con un código
    usuario.password = bcrypt.hashSync(passwordPlano, SALT_ROUNDS);

    const guardado = await this.usuariosRepository.save(usuario);
    await this.guardarPerfiles(guardado.id as number, perfiles);
    return this.findOne(guardado.id as number);
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<Usuario>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const [data, total] = await this.usuariosRepository.findAndCount({
      select: SELECT_SAFE,
      where: query.search
        ? [
            { nombreCompleto: Like(`%${query.search}%`) },
            { username: Like(`%${query.search}%`) },
            { email: Like(`%${query.search}%`) },
          ]
        : {},
      order: { fechaCreacion: query.order ?? 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });
    if (data.length > 0) {
      const filas = await this.perfilesRepository.find({
        where: { usuarioId: In(data.map((u) => u.id as number)) },
        order: { id: 'ASC' },
      });
      for (const u of data) {
        const propios = filas
          .filter((f) => f.usuarioId === u.id)
          .map((f) => f.rol as string);
        u.rolesDisponibles = [
          u.rol as string,
          ...propios.filter((r) => r !== u.rol),
        ];
      }
    }
    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  /**
   * Listado liviano de usuarios activos para elegir al "solicitante" de un
   * préstamo (relación "solicita"). Accesible también para ENCARGADO_PRESTAMOS.
   */
  async findSolicitantes(search?: string): Promise<Usuario[]> {
    const filtro = search?.trim();
    return this.usuariosRepository.find({
      select: {
        id: true,
        nombreCompleto: true,
        cargo: true,
        unidadOArea: true,
      },
      where: filtro
        ? [
            { activo: true, nombreCompleto: ILike(`%${filtro}%`) },
            { activo: true, unidadOArea: ILike(`%${filtro}%`) },
          ]
        : { activo: true },
      order: { nombreCompleto: 'ASC' },
      take: 20,
    });
  }

  async findOne(id: number): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id },
      select: SELECT_SAFE,
    });
    if (!usuario) throw new NotFoundException('El usuario no existe');
    return this.conPerfiles(usuario);
  }

  async update(
    id: number,
    updateUsuarioDto: UpdateUsuarioDto,
  ): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOneBy({ id });
    if (!usuario) throw new NotFoundException('El usuario no existe');

    const { password, roles, ...resto } = updateUsuarioDto;
    if (roles && roles.length === 0) {
      throw new BadRequestException('El usuario debe tener al menos un perfil');
    }
    if (roles?.length) (resto as { rol?: string }).rol = roles[0];
    else if (resto.rol) {
      // Cambio de `rol` sin lista: se conserva la lista y el rol pasa a ser el principal
      const actuales = await this.perfilesDe(id, usuario.rol);
      await this.guardarPerfiles(id, [resto.rol, ...actuales]);
    }

    await this.validarUnicidad(
      resto.username && resto.username !== usuario.username
        ? resto.username
        : undefined,
      resto.email && resto.email !== usuario.email ? resto.email : undefined,
      id,
    );

    const cambiaCorreo = Boolean(resto.email && resto.email !== usuario.email);
    if (cambiaCorreo) await this.validarDominioCorreo(resto.email as string);

    Object.assign(usuario, resto);
    // Un correo nuevo vuelve a requerir verificación
    if (cambiaCorreo) {
      usuario.emailVerificado = false;
      usuario.emailVerificadoEn = null;
    }
    if (password) usuario.password = bcrypt.hashSync(password, SALT_ROUNDS);

    await this.usuariosRepository.save(usuario);
    if (roles?.length) await this.guardarPerfiles(id, roles);
    return this.findOne(id);
  }

  /** Perfil propio: datos editables por el mismo usuario (no incluye rol ni estado). */
  async actualizarPerfil(id: number, dto: UpdatePerfilDto): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOneBy({ id });
    if (!usuario) throw new NotFoundException('El usuario no existe');
    const cambiaCorreo = Boolean(dto.email && dto.email !== usuario.email);
    if (cambiaCorreo) {
      await this.validarUnicidad(undefined, dto.email, id);
      await this.validarDominioCorreo(dto.email as string);
    }
    const cambios: Record<string, unknown> = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    if (cambios.foto === '') cambios.foto = null;
    if (cambiaCorreo) {
      cambios.emailVerificado = false;
      cambios.emailVerificadoEn = null;
    }
    await this.usuariosRepository.update(id, cambios);
    return this.findOne(id);
  }

  async cambiarPassword(id: number, dto: CambiarPasswordDto): Promise<void> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id },
      select: { id: true, password: true },
    });
    if (!usuario) throw new NotFoundException('El usuario no existe');
    if (!usuario.validatePassword(dto.passwordActual as string)) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }
    if (dto.passwordActual === dto.passwordNueva) {
      throw new ConflictException(
        'La nueva contraseña debe ser distinta de la actual',
      );
    }
    await this.actualizarPasswordYLimpiarToken(id, dto.passwordNueva as string);
  }

  async updateEstado(id: number, activo: boolean): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOneBy({ id });
    if (!usuario) throw new NotFoundException('El usuario no existe');
    usuario.activo = activo;
    await this.usuariosRepository.save(usuario);
    return this.findOne(id);
  }

  async remove(id: number): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOneBy({ id });
    if (!usuario) throw new NotFoundException('El usuario no existe');
    return this.usuariosRepository.softRemove(usuario);
  }

  /**
   * Usado internamente por Auth (incluye el hash para validar credenciales).
   * Acepta el username o el correo como identificador.
   */
  async validate(
    identificador: string,
    passwordPlano: string,
  ): Promise<Usuario> {
    const login = identificador.trim().toLowerCase();
    const seleccion = {
      id: true,
      username: true,
      nombreCompleto: true,
      email: true,
      cargo: true,
      unidadOArea: true,
      password: true,
      rol: true,
      activo: true,
      telefono: true,
      foto: true,
      emailVerificado: true,
    } as const;

    const usuarioOk = await this.usuariosRepository.findOne({
      where: [{ username: login }, { email: login }],
      select: seleccion,
    });

    if (!usuarioOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (usuarioOk.activo === false) {
      throw new UnauthorizedException('El usuario se encuentra inactivo');
    }

    const esPasswordValido = usuarioOk.validatePassword(passwordPlano);
    if (!esPasswordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    delete (usuarioOk as Partial<Usuario>).password;
    return usuarioOk;
  }

  // ---------------------------------------------------------------------
  // Recuperación de contraseña por correo
  // ---------------------------------------------------------------------

  /** Busca un usuario activo por correo (sin exponerlo en las respuestas normales). */
  async findByEmailActivo(email: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        nombreCompleto: true,
        activo: true,
        emailVerificado: true,
      },
    });
  }

  async marcarEmailVerificado(id: number): Promise<Usuario> {
    await this.usuariosRepository.update(id, {
      emailVerificado: true,
      emailVerificadoEn: new Date(),
    });
    return this.findOne(id);
  }

  /** Guarda el hash del token de recuperación y su vencimiento. */
  async guardarTokenRecuperacion(
    id: number,
    tokenHash: string,
    expira: Date,
  ): Promise<void> {
    await this.usuariosRepository.update(id, {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: expira,
    });
  }

  /** Busca un usuario por el hash del token de recuperación (no expone la contraseña). */
  async findByResetTokenHash(tokenHash: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({
      where: { resetPasswordToken: tokenHash },
      select: {
        id: true,
        activo: true,
        resetPasswordToken: true,
        resetPasswordExpires: true,
      },
    });
  }

  /** Fija la nueva contraseña y limpia el token de recuperación (uso único). */
  async actualizarPasswordYLimpiarToken(
    id: number,
    passwordPlano: string,
  ): Promise<void> {
    await this.usuariosRepository.update(id, {
      password: bcrypt.hashSync(passwordPlano, SALT_ROUNDS),
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }
}
