/**
 * Variables de entorno mínimas para las pruebas (se carga con `setupFiles`
 * en la configuración de Jest, antes de importar cualquier módulo).
 *
 * Nunca apuntan a una base de datos real: las pruebas usan dobles en memoria.
 */
import { tmpdir } from 'os';
import { join } from 'path';

process.env.JWT_TOKEN = 'secreto-solo-para-pruebas';
// El guard de correo verificado se desactiva: no es lo que se prueba aquí
process.env.EMAIL_VERIFICACION_OBLIGATORIA = 'false';
// Los escaneos jamás se escriben en ./storage durante los tests
process.env.C31_STORAGE_DIR = join(tmpdir(), 'knomidoc-tests-c31');
