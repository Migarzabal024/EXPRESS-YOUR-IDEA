import { describe, expect, it } from 'vitest';
import {
  buildFtsQuery,
  isExactTextMatch,
  matchesText,
  parseQuery,
  splitSnippet,
} from './search';

describe('parseQuery', () => {
  it('separa palabras y frases entre comillas, sin tildes ni mayúsculas', () => {
    expect(parseQuery('Diseño  "Paleta Cálida" logo')).toEqual({
      terms: ['diseno', 'logo'],
      phrases: ['paleta calida'],
    });
  });

  it('tolera comillas sin cerrar y signos sueltos', () => {
    expect(parseQuery('"mapa de')).toEqual({ terms: [], phrases: ['mapa de'] });
    expect(parseQuery('¿qué? ¡hola!')).toEqual({ terms: ['que', 'hola'], phrases: [] });
  });
});

describe('matchesText', () => {
  const text = 'Rediseño del logo con paleta cálida';

  it('por defecto acepta partes de palabra', () => {
    expect(matchesText(text, parseQuery('diseno'), false)).toBe(true);
    expect(matchesText(text, parseQuery('pal LOGO'), false)).toBe(true);
  });

  it('en modo exacto solo acepta palabras completas', () => {
    expect(matchesText(text, parseQuery('diseno'), true)).toBe(false);
    expect(matchesText(text, parseQuery('rediseno'), true)).toBe(true);
    expect(matchesText(text, parseQuery('pal'), true)).toBe(false);
  });

  it('las frases exigen palabras juntas y en orden', () => {
    expect(matchesText(text, parseQuery('"paleta calida"'), false)).toBe(true);
    expect(matchesText(text, parseQuery('"calida paleta"'), false)).toBe(false);
    expect(matchesText(text, parseQuery('"logo paleta"'), false)).toBe(false);
  });
});

describe('isExactTextMatch', () => {
  it('compara el texto completo ignorando tildes, mayúsculas y signos', () => {
    expect(isExactTextMatch('Tesis: ciudades caminables', 'tesis ciudades caminables')).toBe(true);
    expect(isExactTextMatch('Tesis: ciudades caminables', 'tesis')).toBe(false);
    expect(isExactTextMatch('Podcast', '"podcast"')).toBe(true);
  });
});

describe('buildFtsQuery', () => {
  it('usa prefijos salvo en modo exacto', () => {
    expect(buildFtsQuery(parseQuery('dis logo'), false)).toBe('"dis"* AND "logo"*');
    expect(buildFtsQuery(parseQuery('dis logo'), true)).toBe('"dis" AND "logo"');
  });

  it('mantiene las frases y devuelve null si no hay nada', () => {
    expect(buildFtsQuery(parseQuery('"paleta cálida" x'), false)).toBe('"paleta calida" AND "x"*');
    expect(buildFtsQuery(parseQuery('  ¿? '), false)).toBeNull();
  });
});

describe('splitSnippet', () => {
  it('convierte los marcadores en tramos resaltados', () => {
    expect(splitSnippet('la \u0001paleta\u0002 cálida')).toEqual([
      { text: 'la ', match: false },
      { text: 'paleta', match: true },
      { text: ' cálida', match: false },
    ]);
  });
});
