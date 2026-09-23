import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'usuario@knomidoc.com' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @IsEmail({}, { message: 'El correo no es válido' })
  @Transform(({ value }): string =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;
}
