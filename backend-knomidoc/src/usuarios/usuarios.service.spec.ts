import * as bcrypt from 'bcrypt';
import { Usuario } from './entities/usuario.entity';

/**
 * Usuario.validatePassword compara contra la columna `password` (hash bcrypt).
 * La versión anterior de este spec asignaba `passwordHash`, un campo que no
 * existe, por eso fallaba: era un spec desactualizado, no un defecto del login.
 */
describe('Usuario.validatePassword', () => {
  const conPassword = (hash: string | undefined) => {
    const u = new Usuario();
    u.password = hash;
    return u;
  };
  const hash = bcrypt.hashSync('miPassword123', 4); // costo bajo: tests rápidos

  it('acepta la contraseña que coincide con el hash almacenado', () => {
    expect(conPassword(hash).validatePassword('miPassword123')).toBe(true);
  });

  it('rechaza una contraseña distinta', () => {
    expect(conPassword(hash).validatePassword('otraClave')).toBe(false);
  });

  it('distingue mayúsculas y minúsculas', () => {
    expect(conPassword(hash).validatePassword('MIPASSWORD123')).toBe(false);
  });

  it('rechaza una contraseña vacía', () => {
    expect(conPassword(hash).validatePassword('')).toBe(false);
  });

  it('sin hash (usuario sin contraseña cargada) nunca valida', () => {
    expect(conPassword(undefined).validatePassword('miPassword123')).toBe(
      false,
    );
    expect(conPassword('').validatePassword('')).toBe(false);
  });
});
