import { Usuario } from './entities/usuario.entity';

describe('Usuario', () => {
  it('debe validar una contraseña en texto plano cuando coincide con el valor almacenado', () => {
    const usuario = new Usuario();
    usuario.passwordHash = 'miPassword123';

    expect(usuario.validatePassword('miPassword123')).toBe(true);
  });

  it('debe rechazar una contraseña distinta', () => {
    const usuario = new Usuario();
    usuario.passwordHash = 'miPassword123';

    expect(usuario.validatePassword('otraClave')).toBe(false);
  });
});
