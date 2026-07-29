import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RechazarComprobanteDto {
  @ApiProperty({ example: 'Falta respaldo del cheque N° 000123' })
  @IsNotEmpty({ message: 'Debe indicar el motivo del rechazo' })
  @IsString()
  @MaxLength(500)
  readonly motivo: string | undefined;
}
