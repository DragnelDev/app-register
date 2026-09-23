import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UsuariosService } from '../usuarios/usuarios.service';
import { MailService } from '../mail/mail.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Usuario } from '../usuarios/entities/usuario.entity';

/** Vigencia del enlace de recuperación de contraseña. */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

@Injectable()
export class AuthService {
  constructor(
    private usuarioService: UsuariosService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

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
  // Recuperación de contraseña por correo
  // ---------------------------------------------------------------------

  /**
   * Genera y envía por correo un enlace de un solo uso para restablecer la
   * contraseña. Responde el mismo mensaje exista o no el correo, para no
   * revelar qué correos están registrados en el sistema.
   */
  async forgotPassword(email: string): Promise<{ mensaje: string }> {
    const mensaje =
      'Si el correo está registrado, en unos minutos recibirás un enlace para restablecer tu contraseña.';

    const usuario = await this.usuarioService.findByEmailActivo(email);

    if (usuario && usuario.id && usuario.activo !== false) {
      const tokenPlano = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(tokenPlano)
        .digest('hex');
      const expira = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await this.usuarioService.guardarTokenRecuperacion(
        usuario.id,
        tokenHash,
        expira,
      );

      const baseUrl = (
        process.env.FRONTEND_URL ?? 'http://localhost:5173'
      ).replace(/\/$/, '');
      const enlace = `${baseUrl}/reset-password?token=${tokenPlano}`;

      await this.mailService.sendPasswordReset(
        usuario.email as string,
        usuario.nombreCompleto ?? '',
        enlace,
      );
    }

    return { mensaje };
  }

  /** Valida el token recibido por correo y fija la nueva contraseña. */
  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ mensaje: string }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const usuario = await this.usuarioService.findByResetTokenHash(tokenHash);

    const expirado =
      !usuario?.resetPasswordExpires ||
      new Date(usuario.resetPasswordExpires).getTime() < Date.now();

    if (!usuario || !usuario.id || usuario.activo === false || expirado) {
      throw new UnauthorizedException(
        'El enlace de recuperación no es válido o ha expirado',
      );
    }

    await this.usuarioService.actualizarPasswordYLimpiarToken(
      usuario.id,
      password,
    );
    return { mensaje: 'Contraseña actualizada correctamente' };
  }
}
