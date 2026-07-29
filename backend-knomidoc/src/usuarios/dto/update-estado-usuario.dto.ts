import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateEstadoUsuarioDto {
  @ApiProperty({ type: Boolean, example: true })
  @IsNotEmpty({ message: 'El campo estado es obligatorio' })
  @IsBoolean({ message: 'El campo estado debe ser booleano' })
  readonly estado: boolean | undefined;
}
