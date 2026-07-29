/**
 * Exportación de tablas a hoja de cálculo (RF-02.3 / template "Exportar a Excel").
 * Genera un CSV con BOM y separador `;`, que Microsoft Excel abre de forma
 * nativa con acentos y formato de columnas correcto, sin depender de una
 * librería adicional en el bundle del cliente.
 */
export interface ExportColumn<T> {
  key: keyof T & string
  label: string
  format?: (value: T[keyof T & string], row: T) => string
}

export function exportToCsv<T extends Record<string, any>>(
  filename: string,
  columns: ExportColumn<T>[],
  rows: T[],
) {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(';')

  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = row[c.key]
        const value = c.format ? c.format(raw, row) : String(raw ?? '')
        return escapeCsvValue(value)
      })
      .join(';'),
  )

  const csvContent = [header, ...lines].join('\r\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeCsvValue(value: string): string {
  if (/[";\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
