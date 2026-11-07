import { defineStore } from 'pinia'
import { parametrosGestionService } from '@/services/gestion.service'
import type { ParametroGestion } from '@/types/gestion.types'

const KEY = 'knomidoc_gestion_seleccionada'

function leer(): number | '' | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return null
    if (raw === '') return ''
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function guardar(v: number | '') {
  try {
    localStorage.setItem(KEY, String(v))
  } catch {
    /* sin almacenamiento: solo en memoria */
  }
}

interface GestionState {
  gestiones: ParametroGestion[]
  /** Gestión vigente en las consultas ('' = todas) */
  seleccionada: number | ''
  /** Gestión activa (aprobada) según los parámetros */
  activa: number | null
  listo: boolean
}

export const useGestionStore = defineStore('gestion', {
  state: (): GestionState => ({
    gestiones: [],
    seleccionada: leer() ?? '',
    activa: null,
    listo: false,
  }),

  getters: {
    anios: (s) => [...s.gestiones].map((g) => g.gestion).sort((a, b) => b - a),
    esActiva: (s) => s.activa !== null && s.seleccionada === s.activa,
  },

  actions: {
    /** Carga las gestiones y, si el usuario nunca eligió una, usa la activa */
    async iniciar() {
      if (this.listo) return
      try {
        const [lista, activa] = await Promise.all([
          parametrosGestionService.list(),
          parametrosGestionService.activa(),
        ])
        this.gestiones = lista
        this.activa = activa?.gestion ?? null
        if (leer() === null && this.activa !== null) {
          this.seleccionada = this.activa
          guardar(this.seleccionada)
        }
      } catch {
        /* sin gestiones: las consultas quedan sin filtro */
      } finally {
        this.listo = true
      }
    },

    seleccionar(g: number | '') {
      this.seleccionada = g
      guardar(g)
    },

    /** Vuelve a la gestión activa (aprobada) */
    usarActiva() {
      this.seleccionar(this.activa ?? '')
    },

    reset() {
      this.listo = false
      this.gestiones = []
    },
  },
})
