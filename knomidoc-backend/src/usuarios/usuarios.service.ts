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
import { Repository } from 'typeorm';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    const email = createUsuarioDto.email?.trim() ?? '';

    let usuario = await this.usuariosRepository.findOneBy({
      email,
    });
    if (usuario) throw new ConflictException('El usuario ya existe');

    usuario = new Usuario();
    usuario.passwordHash = process.env.DEFAULT_PASSWORD ?? '';
    Object.assign(usuario, createUsuarioDto);
    return this.usuariosRepository.save(usuario);
  }

  async findAll(): Promise<Usuario[]> {
    return this.usuariosRepository.find({
      select: {
        id: true,
        nombreCompleto: true,
        email: true,
        rol: true,
        estado: true,
      },
    });
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
    const usuario = await this.findOne(id);
    Object.assign(usuario, updateUsuarioDto);
    return this.usuariosRepository.save(usuario);
  }

  async remove(id: number): Promise<Usuario> {
    const usuario = await this.findOne(id);
    return this.usuariosRepository.softRemove(usuario);
  }

  async validate(email: string, passwordPlano: string): Promise<Usuario> {
    // 1. Buscas el usuario incluyendo la contraseña oculta para comparar
    const usuarioOk = await this.usuariosRepository.findOne({
      where: { email },
      select: {
        id: true,
        nombreCompleto: true,
        email: true,
        passwordHash: true,
        rol: true,
      },
    });

    // 2. Si no existe el usuario, lanzas UnauthorizedException
    if (!usuarioOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Verificas la contraseña en plano contra el hash guardado
    // (Sin '?' porque ya garantizamos que usuarioOk no es nulo)
    const esPasswordValido = Boolean(
      await usuarioOk.validatePassword(passwordPlano),
    );

    if (!esPasswordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 4. Limpias el hash antes de retornar el objeto al controlador/JWT
    delete (usuarioOk as any).passwordHash;

    return usuarioOk;
  }
}
