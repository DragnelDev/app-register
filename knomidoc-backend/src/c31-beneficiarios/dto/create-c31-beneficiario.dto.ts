import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateC31BeneficiarioDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  readonly comprobanteId: number | undefined;

  @ApiProperty({ example: 'Juan Pérez Gonzáles' })
  @IsNotEmpty({ message: 'El nombre del beneficiario es obligatorio' })
  @IsString()
  @MaxLength(200)
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly nombreBeneficiario: string | undefined;
}
