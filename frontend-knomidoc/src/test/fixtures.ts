import type { Usuario } from '@/types/auth.types'
import type { RolUsuario } from '@/types/common.types'
import type { ComprobanteC31 } from '@/types/c31.types'

/** Usuario de sesión con el perfil indicado (y, opcionalmente, otros perfiles disponibles). */
export function usuarioCon(rol: RolUsuario, roles: RolUsuario[] = [rol]): Usuario {
  return {
    id: '1',
    username: 'jperez',
    nombreCompleto: 'Juan Pérez',
    email: 'jperez@gamsl.gob.bo',
    rol,
    roles,
    activo: true,
    emailVerificado: true,
  }
}

/** Comprobante C31 mínimo para tablas de selección. */
export function comprobanteC31(
  id: number,
  montoTotal: number,
  preventivo = String(id),
  beneficiario = 'PROVEEDORA SRL',
): ComprobanteC31 {
  return {
    id: String(id),
    tipoC31: 'CON_IMPUTACION',
    montoTotal,
    fechaElaboracion: '2026-03-01',
    descripcion: `Pago ${id}`,
    gestion: 2026,
    estadoFisico: 'EN_REVISION',
    preventivos: [{ numeroPreventivo: preventivo }],
    devengados: [],
    beneficiarios: [{ nombreBeneficiario: beneficiario }],
  } as unknown as ComprobanteC31
}
