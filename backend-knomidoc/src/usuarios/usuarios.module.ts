import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { UsuarioPerfil } from './entities/usuario-perfil.entity';
import { PerfilController } from './perfil.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, UsuarioPerfil])],
  controllers: [UsuariosController, PerfilController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
