import { Request } from 'express';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export interface AuthenticatedRequest extends Request {
  user: Usuario;
}
