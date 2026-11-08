import { svgCode128, textoCode128 } from './code128'

export interface EtiquetaArchivo {
  /** Valor codificado en el código de barras (el código del depósito/estante/carpeta). */
  codigo: string
  titulo: string
  subtitulo?: string
}

const esc = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  )

/** Abre una hoja de etiquetas (3 por fila) lista para imprimir. */
export function imprimirEtiquetas(etiquetas: EtiquetaArchivo[], titulo = 'Etiquetas de archivo') {
  const ventana = window.open('', '_blank')
  if (!ventana) return false
  const celdas = etiquetas
    .map(
      (e) => `<div class="et">
  <div class="tt">${esc(e.titulo)}</div>
  ${e.subtitulo ? `<div class="st">${esc(e.subtitulo)}</div>` : ''}
  <div class="bc">${svgCode128(e.codigo, { alto: 44 })}</div>
  <div class="cd">${esc(textoCode128(e.codigo))}</div>
</div>`,
    )
    .join('')
  ventana.document
    .write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>
  @page { size: letter; margin: 10mm; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #000; }
  .hoja { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
  .et { border: 1px dashed #666; padding: 3mm; text-align: center; break-inside: avoid; }
  .tt { font-weight: 700; font-size: 11pt; }
  .st { font-size: 8pt; color: #333; }
  .bc svg { width: 100%; height: auto; max-height: 18mm; }
  .cd { font-family: monospace; font-size: 10pt; letter-spacing: 1px; }
  .aviso { padding: 8px; background: #fef3c7; font-size: 12px; }
  @media print { .aviso { display: none; } }
</style></head><body>
<div class="aviso">Imprima en tamaño real (100 %). Los códigos se leen con cualquier lector de códigos de barras USB (Code 128).</div>
<div class="hoja">${celdas}</div>
<script>window.onload = function () { setTimeout(function () { window.print() }, 250) }<\/script>
</body></html>`)
  ventana.document.close()
  return true
}
