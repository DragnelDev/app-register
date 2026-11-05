import { promises as dns } from 'dns';

/** Un dominio conocido debe resolverse; si no, el servidor no tiene DNS y no se bloquea a nadie. */
async function dnsDisponible(): Promise<boolean> {
  try {
    const r = await Promise.race([
      dns.resolve4('example.com'),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('timeout')), 3000),
      ),
    ]);
    return r.length > 0;
  } catch {
    return false;
  }
}

/**
 * Comprueba que el dominio del correo exista y reciba correo (registros MX o
 * A). Si no se puede consultar el DNS (sin red, timeout) NO bloquea: la
 * verificación real la hace el código enviado al correo.
 */
export async function dominioDeCorreoExiste(email: string): Promise<boolean> {
  const dominio = email.split('@')[1]?.toLowerCase();
  if (!dominio) return false;
  if (!(await dnsDisponible())) return true; // servidor sin DNS: no se puede juzgar
  const conTimeout = <T>(p: Promise<T>) =>
    Promise.race([
      p,
      new Promise<never>((_, rej) =>
        setTimeout(
          () => rej(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })),
          3000,
        ),
      ),
    ]);
  try {
    const mx = await conTimeout(dns.resolveMx(dominio));
    if (mx.length > 0) return true;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== 'ENOTFOUND' && code !== 'ENODATA') return true; // no concluyente
  }
  try {
    const a = await conTimeout(dns.resolve4(dominio));
    return a.length > 0;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    return code !== 'ENOTFOUND' && code !== 'ENODATA';
  }
}
