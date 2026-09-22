import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';

const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class DevolverPrestamosCuadernoDto {
  @ApiPropertyOptional({
    example: '2026-07-20T16:00:00',
    description: 'Si no se indica, se usa la fecha y hora actuales',
  })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsDateString(
    {},
    { message: 'La fecha y hora de devolución deben ser válidas' },
  )
  readonly fechaHoraDevolucion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  readonly observaciones?: string;
}
