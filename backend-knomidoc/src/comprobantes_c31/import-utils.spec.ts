/**
 * Utilidades puras de lectura del Excel de importación. Son la base de la
 * validación por fila: si estas funciones interpretan mal un monto o una fecha,
 * la fila se importa mal (o se rechaza sin motivo).
 */
import {
  campoDeEncabezado,
  codigoDeCarpeta,
  normalizarEncabezado,
  numerosDeCelda,
  parseFechaCelda,
  parseMonto,
} from './import-utils';

describe('import-utils', () => {
  describe('normalizarEncabezado', () => {
    it('quita tildes, símbolos y pasa a mayúsculas', () => {
      expect(normalizarEncabezado('Nº DEV.')).toBe('NDEV');
      expect(normalizarEncabezado('  Descripción ')).toBe('DESCRIPCION');
      expect(normalizarEncabezado(null)).toBe('');
    });
  });

  describe('campoDeEncabezado', () => {
    it.each([
      ['Nº PREV', 'prev'],
      ['Nº DEV.', 'dev'],
      ['BENEFICIARIO', 'beneficiario'],
      ['Descripción', 'descripcion'],
      ['Glosa', 'descripcion'],
      ['Monto Bs', 'monto'],
      ['Fecha', 'fecha'],
      ['N° Folio', 'folio'],
      ['Nº CARPETA', 'carpeta'],
      ['Ubicación física', 'ubicacion'],
      ['Estado', 'estado'],
      ['Observaciones', 'observaciones'],
      ['N° Cheque', 'cheque'],
    ])('"%s" → %s', (texto, esperado) => {
      expect(campoDeEncabezado(texto)).toBe(esperado);
    });

    it('un encabezado desconocido o vacío no se mapea', () => {
      expect(campoDeEncabezado('Columna rara')).toBeNull();
      expect(campoDeEncabezado('')).toBeNull();
    });
  });

  describe('parseMonto', () => {
    it.each([
      [1500, 1500],
      ['1500', 1500],
      ['1.500,50', 1500.5], // formato boliviano
      ['1,500.50', 1500.5], // formato americano
      ['2,600.00', 2600],
      ['Bs 12.345,67', 12345.67],
      ['0,5', 0.5],
      ['1.234.567', 1234567],
    ])('%p → %p', (entrada, esperado) => {
      expect(parseMonto(entrada)).toBe(esperado);
    });

    it.each([['abc'], [''], [null], [undefined], ['12,3x'], ['12-50']])(
      '%p no es un monto válido → null',
      (entrada) => {
        expect(parseMonto(entrada)).toBeNull();
      },
    );

    it('rechaza números no finitos', () => {
      expect(parseMonto(Number.NaN)).toBeNull();
      expect(parseMonto(Infinity)).toBeNull();
    });
  });

  describe('parseFechaCelda', () => {
    it.each([
      ['15/03/2026', '2026-03-15'],
      ['5-3-2026', '2026-03-05'],
      ['15.03.26', '2026-03-15'],
      ['2026-03-15', '2026-03-15'],
      ['15/03/2026 10:30', '2026-03-15'],
    ])('texto %p → %p', (entrada, esperado) => {
      expect(parseFechaCelda(entrada)).toBe(esperado);
    });

    it('acepta objetos Date y números de serie de Excel', () => {
      expect(parseFechaCelda(new Date('2026-03-15T12:00:00Z'))).toBe(
        '2026-03-15',
      );
      expect(parseFechaCelda(46096)).toBe('2026-03-15'); // serie de Excel
    });

    it.each([
      ['31/02/2026'],
      ['32/01/2026'],
      ['00/00/0000'],
      ['hola'],
      [''],
      [0],
    ])('%p no es una fecha válida → null', (entrada) => {
      expect(parseFechaCelda(entrada)).toBeNull();
    });

    it('una fecha inválida de tipo Date devuelve null', () => {
      expect(parseFechaCelda(new Date('no-es-fecha'))).toBeNull();
    });
  });

  describe('numerosDeCelda', () => {
    it.each([
      ['DEV.5/6', ['5', '6']],
      ['4-5', ['4', '5']],
      ['6 7', ['6', '7']],
      ['1 y 2', ['1', '2']],
      ['PREV 3, 4', ['3', '4']],
      ['394', ['394']],
      ['7/7', ['7']], // sin repetidos
    ])('%p → %p', (entrada, esperado) => {
      expect(numerosDeCelda(entrada).numeros).toEqual(esperado);
    });

    it('advierte cuando un guion parece un rango ("4-8")', () => {
      const r = numerosDeCelda('4-8');
      expect(r.numeros).toEqual(['4', '8']);
      expect(r.advertencias[0]).toMatch(/se tomó como dos números/);
    });

    it('no advierte con números consecutivos ("4-5")', () => {
      expect(numerosDeCelda('4-5').advertencias).toEqual([]);
    });

    it('celda vacía → sin números', () => {
      expect(numerosDeCelda('').numeros).toEqual([]);
    });
  });

  describe('codigoDeCarpeta', () => {
    it('rellena a 3 cifras con la gestión', () => {
      expect(codigoDeCarpeta(2017, '4')).toBe('2017-004');
      expect(codigoDeCarpeta(2026, '123')).toBe('2026-123');
    });
    it('un código alfanumérico se conserva en mayúsculas', () => {
      expect(codigoDeCarpeta(2026, 'a1')).toBe('2026-A1');
    });
  });
});
