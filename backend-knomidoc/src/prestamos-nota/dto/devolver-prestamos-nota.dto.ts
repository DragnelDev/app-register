import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';

const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class DevolverPrestamosNotaDto {
  @ApiPropertyOptional({
    example: '2026-08-15',
    description: 'Si no se indica, se usa la fecha de hoy',
  })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsDateString({}, { message: 'La fecha de devolución debe ser válida' })
  readonly fechaDevolucionReal?: string;

  @ApiPropertyOptional({ example: 'Se devuelve con una hoja faltante' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  readonly observaciones?: string;
}
