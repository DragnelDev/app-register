import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ESTADOS_REMISION } from '../entities/remision.entity';

export class CreateRemisionDto {
  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Agregue al menos un comprobante a la remisión' })
  @IsInt({ each: true })
  comprobanteIds: number[] | undefined;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  unidadRemitente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacion?: string;

  /** true = enviar de inmediato; false = dejar como borrador. */
  @IsOptional()
  @IsBoolean()
  enviar?: boolean;
}

export class UpdateRemisionDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  comprobanteIds?: number[];

  @IsOptional()
  @IsString()
  @MaxLength(150)
  unidadRemitente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacion?: string;
}

export class RevisionItemDto {
  @IsInt()
  comprobanteId: number | undefined;

  @IsBoolean()
  recibido: boolean | undefined;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  observacion?: string;
}

export class RecibirRemisionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RevisionItemDto)
  items: RevisionItemDto[] | undefined;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacion?: string;
}

export class FilterRemisionesDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn([...ESTADOS_REMISION, ''])
  estado?: string;
}
