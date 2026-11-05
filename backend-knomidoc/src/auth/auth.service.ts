import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { VerificacionService } from './verificacion.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    private usuarioService: UsuariosService,
    private jwtService: JwtService,
    private verificacion: VerificacionService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  // src/auth/auth.service.ts
  async login(authLoginDto: AuthLoginDto): Promise<any> {
    const { username, password } = authLoginDto;
    const usuarioOk = await this.usuarioService.validate(username, password);

    if (!usuarioOk.id) {
      throw new UnauthorizedException('Usuario inválido');
    }

    const payload: JwtPayload = {
      sub: usuarioOk.id,
      rol: usuarioOk.rol,
      username: usuarioOk.username,
      email: usuarioOk.email,
    };
    const accessToken = await this.getAccessToken(payload);

    const usuarioSafe = {
      id: usuarioOk.id,
      username: usuarioOk.username,
      nombreCompleto: usuarioOk.nombreCompleto,
      email: usuarioOk.email,
      cargo: usuarioOk.cargo,
      unidadOArea: usuarioOk.unidadOArea,
      telefono: usuarioOk.telefono,
      emailVerificado: usuarioOk.emailVerificado,
      rol: usuarioOk.rol,
      activo: usuarioOk.activo,
    };

    return {
      accessToken,
      usuario: usuarioSafe,
    };
  }

  async getAccessToken(payload: JwtPayload) {
    type StringValue = `${number}s`;
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_TOKEN,
      expiresIn: process.env.JWT_TOKEN_EXPIRATION as StringValue,
    });
    return accessToken;
  }

  async verifyPayload(payload: JwtPayload): Promise<Usuario> {
    let usuario: Usuario;

    try {
      usuario = await this.usuarioService.findOne(payload.sub);
    } catch {
      throw new UnauthorizedException(`Usuario inválido: ${payload.sub}`);
    }

    if (usuario.activo === false) {
      throw new UnauthorizedException('El usuario se encuentra inactivo');
    }

    return usuario;
  }

  // ---------------------------------------------------------------------
  // Verificación de correo y recuperación de contraseña (código de 6 dígitos)
  // ---------------------------------------------------------------------

  /** Envía al correo del usuario el código para confirmar que le pertenece. */
  async enviarCodigoVerificacion(
    usuario: Usuario,
  ): Promise<{ mensaje: string }> {
    if (usuario.emailVerificado) {
      throw new BadRequestException('Su correo ya está verificado');
    }
    await this.verificacion.emitir(
      {
        id: usuario.id as number,
        email: usuario.email as string,
        nombreCompleto: usuario.nombreCompleto,
      },
      'EMAIL_VERIFICACION',
    );
    return { mensaje: `Enviamos un código de 6 dígitos a ${usuario.email}` };
  }

  /** Comprueba el código recibido y marca el correo como verificado. */
  async verificarEmail(usuario: Usuario, codigo: string) {
    if (usuario.emailVerificado) return { usuario };
    await this.verificacion.validar(
      { id: usuario.id as number, email: usuario.email as string },
      'EMAIL_VERIFICACION',
      codigo,
    );
    const actualizado = await this.usuarioService.marcarEmailVerificado(
      usuario.id as number,
    );
    return { usuario: actualizado };
  }

  /**
   * Envía un código para restablecer la contraseña. Responde lo mismo exista o
   * no el correo, para no revelar qué correos están registrados.
   */
  async forgotPassword(email: string): Promise<{ mensaje: string }> {
    const mensaje =
      'Si el correo está registrado, en unos minutos recibirás un código de 6 dígitos.';
    const usuario = await this.usuarioService.findByEmailActivo(email);
    if (usuario && usuario.id && usuario.activo !== false) {
      try {
        await this.verificacion.emitir(
          {
            id: usuario.id,
            email: usuario.email as string,
            nombreCompleto: usuario.nombreCompleto,
          },
          'RECUPERACION_PASSWORD',
          true,
        );
      } catch (e) {
        // Un fallo de SMTP no debe delatar si el correo existe
        this.logger.error('No se pudo enviar el código de recuperación', e);
      }
    }
    return { mensaje };
  }

  /** Valida correo + código y fija la nueva contraseña. */
  async resetPassword(
    email: string,
    codigo: string,
    password: string,
  ): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioService.findByEmailActivo(email);
    if (!usuario || !usuario.id || usuario.activo === false) {
      throw new BadRequestException(
        'El código no es válido o ya expiró. Solicite uno nuevo.',
      );
    }
    await this.verificacion.validar(
      { id: usuario.id, email: usuario.email as string },
      'RECUPERACION_PASSWORD',
      codigo,
    );
    await this.usuarioService.actualizarPasswordYLimpiarToken(
      usuario.id,
      password,
    );
    // Recibir el código en ese correo también prueba que es suyo
    if (!usuario.emailVerificado) {
      await this.usuarioService.marcarEmailVerificado(usuario.id);
    }
    return { mensaje: 'Contraseña actualizada correctamente' };
  }
}
