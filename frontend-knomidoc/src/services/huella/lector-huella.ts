/**
 * Adaptador del lector de huellas dactilares.
 *
 * La interfaz `LectorHuella` es lo único que usa la aplicación. Hoy se entrega el
 * lector DEMO (simula la captura). Para un lector real (ZKTeco, DigitalPersona,
 * SecuGen…) basta con implementar `LectorHuella` con el SDK/servicio local del
 * fabricante y devolverlo desde `obtenerLector()`; nada más cambia.
 */
export interface CapturaHuella {
  /** Plantilla que se guarda al enrolar y se compara al verificar. */
  plantilla: string
  /** 0–100: calidad de la captura. */
  calidad: number
  /** Identificador del lector que la capturó. */
  lector: string
}

export interface LectorHuella {
  readonly nombre: string
  readonly esDemo: boolean
  /** ¿Hay un lector conectado y listo? */
  disponible(): Promise<boolean>
  /**
   * Pide al usuario colocar el dedo y devuelve la captura.
   * `referencia` identifica a la persona (en DEMO determina la plantilla).
   */
  capturar(referencia: string, alProgreso?: (pct: number) => void): Promise<CapturaHuella>
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Lector simulado: tarda ~1.5 s y genera una plantilla estable por persona. */
export class LectorHuellaDemo implements LectorHuella {
  readonly nombre = 'Lector de huellas (DEMO)'
  readonly esDemo = true

  async disponible() {
    return true
  }

  async capturar(referencia: string, alProgreso?: (pct: number) => void): Promise<CapturaHuella> {
    for (let i = 1; i <= 10; i++) {
      await esperar(150)
      alProgreso?.(i * 10)
    }
    return {
      plantilla: `DEMO-FP-${referencia}`,
      calidad: 80 + Math.floor(Math.random() * 15),
      lector: 'DEMO',
    }
  }
}

let lector: LectorHuella = new LectorHuellaDemo()

/** Punto único para cambiar de lector (p. ej. al integrar un SDK real). */
export function obtenerLector(): LectorHuella {
  return lector
}
export function registrarLector(nuevo: LectorHuella) {
  lector = nuevo
}
