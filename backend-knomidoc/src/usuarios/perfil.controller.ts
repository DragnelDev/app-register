import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UsuariosService } from './usuarios.service';
import { CambiarPasswordDto, UpdatePerfilDto } from './dto/perfil.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from './entities/usuario.entity';
import { AbiertoATodosLosPerfiles } from '../auth/decorators/abierto-a-todos.decorator';
import { SinVerificacionEmail } from '../auth/decorators/sin-verificacion-email.decorator';
import { ComprobantesC31 } from '../comprobantes_c31/entities/comprobantes_c31.entity';
import { C31Historial } from '../c31-historial/entities/c31-historial.entity';

/** Perfil del usuario autenticado (cualquier rol). */
@ApiTags('perfil')
@ApiBearerAuth()
@SinVerificacionEmail()
@AbiertoATodosLosPerfiles()
@Controller('perfil')
export class PerfilController {
  constructor(
    private readonly usuarios: UsuariosService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get()
  async obtener(@CurrentUser() usuario: Usuario) {
    const datos = await this.usuarios.findOne(usuario.id as number);
    const [comprobantesRegistrados, movimientos, recientes] = await Promise.all(
      [
        this.dataSource
          .getRepository(ComprobantesC31)
          .countBy({ creadoPorId: usuario.id }),
        this.dataSource
          .getRepository(C31Historial)
          .countBy({ usuarioId: usuario.id }),
        this.dataSource.getRepository(C31Historial).find({
          where: { usuarioId: usuario.id },
          order: { fecha: 'DESC', id: 'DESC' },
          take: 8,
        }),
      ],
    );
    return {
      ...datos,
      actividad: {
        comprobantesRegistrados,
        cambiosDeEstado: movimientos,
        recientes: recientes.map((h) => ({
          comprobanteId: h.comprobanteId,
          fecha: h.fecha,
          estadoNuevo: h.estadoNuevo,
          origen: h.origen,
          referencia: h.referencia ?? null,
        })),
      },
    };
  }

  @Patch()
  actualizar(@CurrentUser() usuario: Usuario, @Body() dto: UpdatePerfilDto) {
    return this.usuarios.actualizarPerfil(usuario.id as number, dto);
  }

  @Patch('password')
  @HttpCode(200)
  async cambiarPassword(
    @CurrentUser() usuario: Usuario,
    @Body() dto: CambiarPasswordDto,
  ) {
    await this.usuarios.cambiarPassword(usuario.id as number, dto);
    return { mensaje: 'Contraseña actualizada' };
  }
}
