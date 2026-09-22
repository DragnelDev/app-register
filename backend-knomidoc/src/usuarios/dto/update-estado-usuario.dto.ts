import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateEstadoUsuarioDto {
  @ApiProperty({ type: Boolean, example: true })
  @IsNotEmpty({ message: 'El campo activo es obligatorio' })
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  readonly activo: boolean | undefined;
}
