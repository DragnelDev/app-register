import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosModule } from './usuarios/usuarios.module';
import { NotasEntregaModule } from './notas-entrega/notas-entrega.module';
import { ComprobantesC31Module } from './comprobantes_c31/comprobantes_c31.module';
import { CarpetasModule } from './carpetas/carpetas.module';
import { C31PreventivosModule } from './c31-preventivos/c31-preventivos.module';
import { C31DevengadosModule } from './c31-devengados/c31-devengados.module';
import { C31BeneficiariosModule } from './c31-beneficiarios/c31-beneficiarios.module';
import { C31ChequesModule } from './c31-cheques/c31-cheques.module';
import { C31CarpetasUbicacionModule } from './c31-carpetas-ubicacion/c31-carpetas-ubicacion.module';
import { PrestamosCuadernoModule } from './prestamos-cuaderno/prestamos-cuaderno.module';
import { PrestamosNotaModule } from './prestamos-nota/prestamos-nota.module';
import { PrestamosNotaDetalleModule } from './prestamos-nota-detalle/prestamos-nota-detalle.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuthModule } from './auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/entities/*{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: true,
    }),
    UsuariosModule,
    NotasEntregaModule,
    ComprobantesC31Module,
    CarpetasModule,
    C31PreventivosModule,
    C31DevengadosModule,
    C31BeneficiariosModule,
    C31ChequesModule,
    C31CarpetasUbicacionModule,
    PrestamosCuadernoModule,
    PrestamosNotaModule,
    PrestamosNotaDetalleModule,
    UploadsModule,
    AuthModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
