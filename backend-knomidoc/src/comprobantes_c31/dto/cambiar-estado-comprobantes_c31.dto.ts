import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Estados que se pueden pedir a mano; los demás los fija el sistema (acta, préstamos). */
export const ESTADOS_SOLICITABLES = [
  'EN_TRAMITE',
  'EN_REVISION',
  'ARCHIVADO',
  'OBSERVADO',
  'NO_ENCONTRADO',
  'ANULADO',
] as const;

export class CambiarEstadoC31Dto {
  @ApiProperty({ enum: ESTADOS_SOLICITABLES })
  @IsIn([...ESTADOS_SOLICITABLES], {
    message: `El estado debe ser uno de: ${ESTADOS_SOLICITABLES.join(', ')}`,
  })
  readonly estado: string | undefined;

  @ApiPropertyOptional({
    example: 'Falta la firma del Director Financiero',
    description: 'Obligatorio al observar o anular',
  })
  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(500)
  readonly motivo?: string;
}
