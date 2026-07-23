import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateUsuarioDto {
  @ApiProperty({ type: String, example: 'Juan Perez' })
  @IsNotEmpty({ message: 'El campo nombre completo es obligatorio' })
  @IsString({ message: 'El campo nombre completo debe ser de tipo cadena' })
  @MaxLength(150, {
    message: 'El campo nombre completo no debe ser mayor a 150 caracteres',
  })
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly nombreCompleto: string | undefined;

  @ApiProperty({ type: String, example: 'jperez@gmail.com' })
  @IsNotEmpty({ message: 'El campo email es obligatorio' })
  @IsString({ message: 'El campo email debe ser de tipo cadena' })
  @MaxLength(100, {
    message: 'El campo email no debe ser mayor a 100 caracteres',
  })
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly email: string | undefined;

  @ApiProperty({ type: String, example: 'ADMIN' })
  @IsNotEmpty({ message: 'El campo rol es obligatorio' })
  @IsString({ message: 'El campo rol debe ser de tipo cadena' })
  @MaxLength(30, {
    message: 'El campo rol no debe ser mayor a 30 caracteres',
  })
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly rol: string | undefined;
}
