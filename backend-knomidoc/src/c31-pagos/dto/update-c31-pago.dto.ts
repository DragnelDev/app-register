import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateC31PagoDto } from './create-c31-pago.dto';
import { ESTADOS_PAGO } from '../entities/c31-pago.entity';

export class UpdateC31PagoDto extends PartialType(
  OmitType(CreateC31PagoDto, ['comprobanteId', 'estadoPago'] as const),
) {
  @ApiPropertyOptional({ enum: ESTADOS_PAGO })
  @IsOptional()
  @IsIn([...ESTADOS_PAGO])
  readonly estadoPago?: string;
}
