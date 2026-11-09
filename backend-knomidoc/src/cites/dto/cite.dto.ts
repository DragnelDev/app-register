import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DIRECCIONES_CITE, TIPOS_CITE } from '../entities/cite.entity';

export class CreateCiteDto {
  @IsIn(DIRECCIONES_CITE as unknown as string[]) direccion!:
    'EMITIDO' | 'RECIBIDO';
  @IsOptional() @IsIn(TIPOS_CITE as unknown as string[]) tipo?: string;
  /** Emitidos: vacío = correlativo automático. Recibidos: obligatorio. */
  @IsOptional() @IsString() @MaxLength(120) cite?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha?: string;
  @IsString() @MaxLength(200) contraparte!: string;
  @IsOptional() @IsString() @MaxLength(200) cargoContraparte?: string;
  @IsString() @MaxLength(3000) asunto!: string;
  @IsOptional() @IsString() @MaxLength(120) referencia?: string;
  @IsOptional() @IsString() @MaxLength(3000) observaciones?: string;
}

export class UpdateCiteDto {
  @IsOptional() @IsIn(TIPOS_CITE as unknown as string[]) tipo?: string;
  @IsOptional() @IsString() @MaxLength(120) cite?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha?: string;
  @IsOptional() @IsString() @MaxLength(200) contraparte?: string;
  @IsOptional() @IsString() @MaxLength(200) cargoContraparte?: string;
  @IsOptional() @IsString() @MaxLength(3000) asunto?: string;
  @IsOptional() @IsString() @MaxLength(120) referencia?: string;
  @IsOptional() @IsString() @MaxLength(3000) observaciones?: string;
}

export class AnularCiteDto {
  @IsString() @MinLength(5) @MaxLength(500) motivo!: string;
}

export class FiltroCiteDto {
  @IsOptional() @Type(() => Number) @IsInt() gestion?: number;
  @IsOptional()
  @IsIn(DIRECCIONES_CITE as unknown as string[])
  direccion?: string;
  @IsOptional() @IsIn(TIPOS_CITE as unknown as string[]) tipo?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() page?: number;
  @IsOptional() @Type(() => Number) @IsInt() pageSize?: number;
}
