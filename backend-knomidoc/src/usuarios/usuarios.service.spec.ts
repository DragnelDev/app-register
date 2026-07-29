import * as bcrypt from 'bcrypt';
import { Usuario } from './entities/usuario.entity';

describe('Usuario', () => {
  it('debe validar una contraseña en texto plano cuando coincide con el hash almacenado', () => {
    const usuario = new Usuario();
    usuario.passwordHash = bcrypt.hashSync('miPassword123', 10);

    expect(usuario.validatePassword('miPassword123')).toBe(true);
  });

  it('debe rechazar una contraseña distinta', () => {
    const usuario = new Usuario();
    usuario.passwordHash = bcrypt.hashSync('miPassword123', 10);

    expect(usuario.validatePassword('otraClave')).toBe(false);
  });
});
