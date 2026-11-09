import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ComprobantesC31Module } from './comprobantes_c31/comprobantes_c31.module';
import { CarpetasModule } from './carpetas/carpetas.module';
import { C31PreventivosModule } from './c31-preventivos/c31-preventivos.module';
import { C31DevengadosModule } from './c31-devengados/c31-devengados.module';
import { C31BeneficiariosModule } from './c31-beneficiarios/c31-beneficiarios.module';
import { C31PagosModule } from './c31-pagos/c31-pagos.module';
import { C31CarpetasUbicacionModule } from './c31-carpetas-ubicacion/c31-carpetas-ubicacion.module';
import { PrestamosCuadernoModule } from './prestamos-cuaderno/prestamos-cuaderno.module';
import { PrestamosNotaModule } from './prestamos-nota/prestamos-nota.module';
import { PrestamosNotaDetalleModule } from './prestamos-nota-detalle/prestamos-nota-detalle.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuthModule } from './auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { NotasAuditoriaModule } from './notas-auditoria/notas-auditoria.module';
import { CitesModule } from './cites/cites.module';
import { ActasEntregaModule } from './actas-entrega/actas-entrega.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RotuloGrupoInterceptor } from './common/interceptors/rotulo-grupo.interceptor';
import { EmailVerificadoGuard } from './auth/guards/email-verificado.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { DepositosModule } from './depositos/depositos.module';
import { EstantesModule } from './estantes/estantes.module';
import { ParametrosGestionModule } from './parametros-gestion/parametros-gestion.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { ReportesModule } from './reportes/reportes.module';
import { ResumenModule } from './resumen/resumen.module';
import { BeneficiariosModule } from './beneficiarios/beneficiarios.module';
import { FuncionariosModule } from './funcionarios/funcionarios.module';

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
      // Sin migraciones formales: el esquema se sincroniza. En producción estable use DB_SYNCHRONIZE=false
      synchronize: process.env.DB_SYNCHRONIZE !== 'false',
    }),
    UsuariosModule,
    FuncionariosModule,
    BeneficiariosModule,
    ActasEntregaModule,
    NotasAuditoriaModule,
    CitesModule,
    ComprobantesC31Module,
    CarpetasModule,
    C31PreventivosModule,
    C31DevengadosModule,
    C31BeneficiariosModule,
    C31PagosModule,
    C31CarpetasUbicacionModule,
    PrestamosCuadernoModule,
    PrestamosNotaModule,
    PrestamosNotaDetalleModule,
    DepositosModule,
    EstantesModule,
    ParametrosGestionModule,
    AuditoriaModule,
    ReportesModule,
    ResumenModule,
    UploadsModule,
    AuthModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Autenticación JWT en todos los endpoints (salvo los marcados con @Public())
    // y control de acceso por rol (@Roles(...)). El orden importa: primero JWT.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: EmailVerificadoGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: RotuloGrupoInterceptor },
  ],
})
export class AppModule {}
