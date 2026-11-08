import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthLoginDto } from './dto/auth-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto, VerificarEmailDto } from './dto/codigo.dto';
import { SinVerificacionEmail } from './decorators/sin-verificacion-email.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/auth-public.decorator';
import { AbiertoATodosLosPerfiles } from './decorators/abierto-a-todos.decorator';
import { AbiertoASoloLectura } from './decorators/abierto-a-solo-lectura.decorator';
import { CambiarPerfilDto } from './dto/cambiar-perfil.dto';

@ApiTags('auth')
@ApiBearerAuth()
@AbiertoATodosLosPerfiles()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() authLoginDto: AuthLoginDto): Promise<any> {
    return this.authService.login(authLoginDto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.email as string,
      dto.codigo as string,
      dto.password as string,
    );
  }

  @SinVerificacionEmail()
  @Post('verificar-email/enviar')
  @HttpCode(HttpStatus.OK)
  enviarCodigo(@CurrentUser() usuario: Usuario) {
    return this.authService.enviarCodigoVerificacion(usuario);
  }

  @SinVerificacionEmail()
  @Post('verificar-email')
  @HttpCode(HttpStatus.OK)
  verificarEmail(
    @CurrentUser() usuario: Usuario,
    @Body() dto: VerificarEmailDto,
  ) {
    return this.authService.verificarEmail(usuario, dto.codigo as string);
  }

  @SinVerificacionEmail()
  @AbiertoATodosLosPerfiles()
  @AbiertoASoloLectura()
  @Get('me')
  me(@CurrentUser() usuario: Usuario) {
    // El rol que se muestra es el perfil activo de esta sesión
    return {
      ...usuario,
      rol: usuario.rolActivo ?? usuario.rol,
      roles: usuario.rolesDisponibles ?? [usuario.rol],
    };
  }

  /** Cambia el perfil activo sin cerrar sesión. */
  @SinVerificacionEmail()
  @AbiertoATodosLosPerfiles()
  @AbiertoASoloLectura()
  @Post('perfil')
  @HttpCode(HttpStatus.OK)
  cambiarPerfil(
    @CurrentUser() usuario: Usuario,
    @Body() dto: CambiarPerfilDto,
  ) {
    return this.authService.cambiarPerfil(usuario, dto.rol);
  }
}
