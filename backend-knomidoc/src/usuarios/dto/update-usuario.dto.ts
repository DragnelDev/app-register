import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUsuarioDto } from './create-usuario.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean({ message: 'El campo estado debe ser booleano' })
  readonly estado?: boolean;
}
