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
import { Like, Repository } from 'typeorm';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { paginationSkip } from 'src/common/utils/pagination.util';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const SELECT_SAFE = {
  id: true,
  nombreCompleto: true,
  email: true,
  rol: true,
  estado: true,
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

    const email = process.env.ADMIN_EMAIL ?? 'admin@knomidoc.com';
    const passwordPlano =
      process.env.ADMIN_PASSWORD ??
      process.env.DEFAULT_PASSWORD ??
      'Knomi2026*';

    const admin = new Usuario();
    admin.nombreCompleto = 'Administrador del Sistema';
    admin.email = email;
    admin.rol = 'ADMIN';
    admin.estado = true;
    admin.passwordHash = bcrypt.hashSync(passwordPlano, SALT_ROUNDS);

    await this.usuariosRepository.save(admin);
    console.log(
      `[Seed] Usuario ADMIN creado por defecto -> email: ${email} / password: ${passwordPlano} (cámbiela luego de iniciar sesión)`,
    );
  }

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    const email = createUsuarioDto.email?.trim().toLowerCase() ?? '';

    const existente = await this.usuariosRepository.findOneBy({ email });
    if (existente) throw new ConflictException('El usuario ya existe');

    const passwordPlano =
      createUsuarioDto.passwordHash ??
      process.env.DEFAULT_PASSWORD ??
      'Knomi2026*';

    const usuario = new Usuario();
    Object.assign(usuario, createUsuarioDto);
    usuario.email = email;
    usuario.passwordHash = bcrypt.hashSync(passwordPlano, SALT_ROUNDS);

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
            { email: Like(`%${query.search}%`) },
          ]
        : {},
      order: { fechaCreacion: query.order ?? 'DESC' },
      skip: paginationSkip(page, pageSize),
      take: pageSize,
    });
    return new PaginatedResponseDto(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id },
      select: {
        id: true,
        nombreCompleto: true,
        email: true,
        rol: true,
        estado: true,
      },
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

    const { passwordHash, ...resto } = updateUsuarioDto;
    Object.assign(usuario, resto);

    if (resto.email) usuario.email = resto.email.trim().toLowerCase();
    if (passwordHash)
      usuario.passwordHash = bcrypt.hashSync(passwordHash, SALT_ROUNDS);

    await this.usuariosRepository.save(usuario);
    return this.findOne(id);
  }

  async updateEstado(id: number, estado: boolean): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOneBy({ id });
    if (!usuario) throw new NotFoundException('El usuario no existe');
    usuario.estado = estado;
    await this.usuariosRepository.save(usuario);
    return this.findOne(id);
  }

  async remove(id: number): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOneBy({ id });
    if (!usuario) throw new NotFoundException('El usuario no existe');
    return this.usuariosRepository.softRemove(usuario);
  }

  /** Usado internamente por Auth (incluye el hash para validar credenciales) */
  async validate(email: string, passwordPlano: string): Promise<Usuario> {
    const usuarioOk = await this.usuariosRepository.findOne({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        nombreCompleto: true,
        email: true,
        passwordHash: true,
        rol: true,
        estado: true,
      },
    });

    if (!usuarioOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (usuarioOk.estado === false) {
      throw new UnauthorizedException('El usuario se encuentra inactivo');
    }

    const esPasswordValido = usuarioOk.validatePassword(passwordPlano);
    if (!esPasswordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    delete (usuarioOk as Partial<Usuario>).passwordHash;
    return usuarioOk;
  }
}
