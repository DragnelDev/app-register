import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { UsuariosModule } from 'src/usuarios/usuarios.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MailModule } from '../mail/mail.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CodigoVerificacion } from './entities/codigo-verificacion.entity';
import { VerificacionService } from './verificacion.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    UsuariosModule,
    MailModule,
    TypeOrmModule.forFeature([CodigoVerificacion]),
    PassportModule.register({}),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, VerificacionService],
})
export class AuthModule {}
