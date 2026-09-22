import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AuthLoginDto {
  @ApiProperty({
    example: 'admin',
    description: 'Nombre de usuario (también se acepta el correo electrónico)',
  })
  @IsNotEmpty({ message: 'El campo usuario no debe ser vacío' })
  @IsString({ message: 'El campo usuario debe ser de tipo cadena' })
  @MaxLength(100, { message: 'El campo usuario excede los 100 caracteres' })
  @MinLength(3, { message: 'El campo usuario es menor a 3 caracteres' })
  username: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'El campo Clave/Contraseña no debe ser vacío' })
  @IsString({ message: 'El campo Clave/Contraseña debe ser de tipo cadena' })
  password: string;
}
