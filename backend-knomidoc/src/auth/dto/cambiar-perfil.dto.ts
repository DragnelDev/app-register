import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty } from 'class-validator';
import { ROLES_USUARIO } from '../../common/constants/roles.constant';

export class CambiarPerfilDto {
  @ApiProperty({ enum: ROLES_USUARIO, example: 'OPERADOR_ARCHIVOS' })
  @IsNotEmpty({ message: 'Indique el perfil' })
  @IsIn([...ROLES_USUARIO], { message: 'Perfil no válido' })
  readonly rol!: string;
}
