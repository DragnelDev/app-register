import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { ILike, Like, Not, Repository } from 'typeorm';
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
  rol: true,
  activo: true,
  fechaCreacion: true,
} as const;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

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

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    const username = createUsuarioDto.username?.trim().toLowerCase() ?? '';
    const email = createUsuarioDto.email?.trim().toLowerCase() ?? '';

    await this.validarUnicidad(username, email);

    const passwordPlano =
      createUsuarioDto.password ?? process.env.DEFAULT_PASSWORD ?? 'Knomi2026*';

    const { password: _omitido, ...resto } = createUsuarioDto;
    void _omitido;

    const usuario = new Usuario();
    Object.assign(usuario, resto);
    usuario.username = username;
    usuario.email = email;
    usuario.activo = true;
    usuario.password = bcrypt.hashSync(passwordPlano, SALT_ROUNDS);

    const guardado = await this.usuariosRepository.save(usuario);
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
    return usuario;
  }

  async update(
    id: number,
    updateUsuarioDto: UpdateUsuarioDto,
  ): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOneBy({ id });
    if (!usuario) throw new NotFoundException('El usuario no existe');

    const { password, ...resto } = updateUsuarioDto;

    await this.validarUnicidad(
      resto.username && resto.username !== usuario.username
        ? resto.username
        : undefined,
      resto.email && resto.email !== usuario.email ? resto.email : undefined,
      id,
    );

    Object.assign(usuario, resto);
    if (password) usuario.password = bcrypt.hashSync(password, SALT_ROUNDS);

    await this.usuariosRepository.save(usuario);
    return this.findOne(id);
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
      select: { id: true, email: true, nombreCompleto: true, activo: true },
    });
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
