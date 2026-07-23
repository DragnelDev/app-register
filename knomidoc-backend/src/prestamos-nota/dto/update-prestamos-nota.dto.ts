import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreatePrestamosNotaDto } from './create-prestamos-nota.dto';

export class UpdatePrestamosNotaDto extends PartialType(
  CreatePrestamosNotaDto,
) {
  @ApiPropertyOptional({ example: 'Lic. Pedro Gómez' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  readonly aQuienSePresta?: string;
}
