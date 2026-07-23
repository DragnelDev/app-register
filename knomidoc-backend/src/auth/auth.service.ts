import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Usuario } from 'src/usuarios/entities/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    private usuarioService: UsuariosService,
    private jwtService: JwtService,
  ) {}

  // src/auth/auth.service.ts
  async login(authLoginDto: AuthLoginDto): Promise<any> {
    const { email, password } = authLoginDto;
    const usuarioOk = await this.usuarioService.validate(email, password);

    if (!usuarioOk.id) {
      throw new UnauthorizedException('Usuario inválido');
    }

    const payload: JwtPayload = {
      sub: usuarioOk.id,
      rol: usuarioOk.rol,
      email: usuarioOk.email,
    };
    const accessToken = await this.getAccessToken(payload);

    const usuarioSafe = {
      id: usuarioOk.id,
      nombreCompleto: usuarioOk.nombreCompleto,
      email: usuarioOk.email,
      rol: usuarioOk.rol,
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

    return usuario;
  }
}
