import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateC31ChequeDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  readonly comprobanteId: number | undefined;

  @ApiProperty({ example: 'CHQ-000123' })
  @IsNotEmpty({ message: 'El número de cheque es obligatorio' })
  @IsString()
  @MaxLength(50)
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly numeroCheque: string | undefined;
}
