import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PersonaNotaDto {
  @IsString() @MaxLength(150) nombre!: string;
  @IsString() @MaxLength(200) cargo!: string;
}

export class SeccionNotaDto {
  @IsString() @MaxLength(200) titulo!: string;
  @IsString() @MaxLength(3000) texto!: string;
  @IsArray() @IsString({ each: true }) @MaxLength(60, { each: true }) items!: string[];
}

export class CreateNotaAuditoriaDto {
  /** Si se omite, el sistema lo genera: GAMSL/ARCH/AUD/OF-N° 004/2026 */
  @IsOptional() @IsString() @MaxLength(80) cite?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha?: string;
  @ValidateNested() @Type(() => PersonaNotaDto) destinatario!: PersonaNotaDto;
  @IsOptional() @ValidateNested() @Type(() => PersonaNotaDto) via?: PersonaNotaDto | null;
  @ValidateNested() @Type(() => PersonaNotaDto) remitente!: PersonaNotaDto;
  @IsString() @MaxLength(1000) referencia!: string;
  @IsOptional() @IsString() @MaxLength(5000) introduccion?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SeccionNotaDto)
  secciones?: SeccionNotaDto[];
  @IsOptional() @IsString() @MaxLength(5000) cierre?: string;
  @IsOptional() @IsInt() gestion?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) notasPrestamo?: string[];
}

export class UpdateNotaAuditoriaDto {
  @IsOptional() @IsString() @MaxLength(80) cite?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha?: string;
  @IsOptional() @ValidateNested() @Type(() => PersonaNotaDto) destinatario?: PersonaNotaDto;
  @IsOptional() @ValidateNested() @Type(() => PersonaNotaDto) via?: PersonaNotaDto | null;
  @IsOptional() @ValidateNested() @Type(() => PersonaNotaDto) remitente?: PersonaNotaDto;
  @IsOptional() @IsString() @MaxLength(1000) referencia?: string;
  @IsOptional() @IsString() @MaxLength(5000) introduccion?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SeccionNotaDto)
  secciones?: SeccionNotaDto[];
  @IsOptional() @IsString() @MaxLength(5000) cierre?: string;
  @IsOptional() @IsInt() gestion?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) notasPrestamo?: string[];
}
