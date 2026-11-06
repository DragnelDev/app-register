import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class UnirComprobantesC31Dto {
  @ApiProperty({
    type: [Number],
    example: [12, 15],
    description:
      'Comprobantes que vienen como uno solo (PREV + PREV, PREV + DEV). Cada uno conserva su registro.',
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'Seleccione al menos 2 comprobantes' })
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  readonly comprobanteIds!: number[];
}
