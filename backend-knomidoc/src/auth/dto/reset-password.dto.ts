import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido por correo electrónico' })
  @IsNotEmpty({ message: 'El token es obligatorio' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NuevaClave2026*' })
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}
