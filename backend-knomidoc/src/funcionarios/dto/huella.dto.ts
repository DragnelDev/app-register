import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class HuellaDto {
  /** Plantilla entregada por el lector (en DEMO, una cadena simulada). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  plantilla: string | undefined;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  lector?: string;
}
