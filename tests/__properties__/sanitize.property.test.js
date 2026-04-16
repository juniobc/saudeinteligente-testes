// Teste de propriedade — Sanitização de nomes de arquivo
// Valida que sanitizeFilename() produz saída segura para qualquer entrada
//
// **Valida: Requisitos 5.2, 9.5, 12.3, 13.4**

import { test, expect } from '@playwright/test';
import fc from 'fast-check';
import { sanitizeFilename } from '../../tools/helpers.js';

// Regex que define o formato válido de saída: apenas [a-z0-9-]
const FORMATO_VALIDO = /^[a-z0-9-]+$/;

// Regex para detectar hífens consecutivos
const HIFENS_CONSECUTIVOS = /--/;

test.describe('Propriedade 1: Sanitização de nomes de arquivo preserva segurança e formato', () => {

  test('saída contém apenas caracteres [a-z0-9-] para qualquer string', () => {
    fc.assert(
      fc.property(fc.string(), (entrada) => {
        const resultado = sanitizeFilename(entrada);
        expect(resultado).toMatch(FORMATO_VALIDO);
      }),
      { numRuns: 200 }
    );
  });

  test('saída contém apenas caracteres [a-z0-9-] para strings Unicode', () => {
    // Gera strings com caracteres Unicode variados (acentos, CJK, emojis, símbolos)
    const unicodeArb = fc.stringMatching(/[\u00C0-\u024F\u4E00-\u9FFF\u0400-\u04FF\u0600-\u06FF\u2600-\u26FF\u0020-\u007E]{0,50}/);

    fc.assert(
      fc.property(unicodeArb, (entrada) => {
        const resultado = sanitizeFilename(entrada);
        expect(resultado).toMatch(FORMATO_VALIDO);
      }),
      { numRuns: 200 }
    );
  });

  test('nunca começa nem termina com hífen', () => {
    fc.assert(
      fc.property(fc.string(), (entrada) => {
        const resultado = sanitizeFilename(entrada);
        expect(resultado.startsWith('-')).toBe(false);
        expect(resultado.endsWith('-')).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  test('nunca contém hífens consecutivos', () => {
    fc.assert(
      fc.property(fc.string(), (entrada) => {
        const resultado = sanitizeFilename(entrada);
        expect(resultado).not.toMatch(HIFENS_CONSECUTIVOS);
      }),
      { numRuns: 200 }
    );
  });

  test('nunca retorna string vazia', () => {
    fc.assert(
      fc.property(fc.string(), (entrada) => {
        const resultado = sanitizeFilename(entrada);
        expect(resultado.length).toBeGreaterThan(0);
      }),
      { numRuns: 200 }
    );
  });

  test('retorna "sem-nome" para entradas não-string', () => {
    // Gera valores arbitrários que não são strings
    const naoString = fc.oneof(
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.constant({}),
      fc.constant([]),
      fc.constant(NaN)
    );

    fc.assert(
      fc.property(naoString, (entrada) => {
        const resultado = sanitizeFilename(entrada);
        expect(resultado).toBe('sem-nome');
      }),
      { numRuns: 100 }
    );
  });

  test('propriedades se mantêm para strings com caracteres especiais comuns', () => {
    // Gera strings com caracteres especiais frequentes em nomes de arquivo
    const caracteresEspeciais = fc.constantFrom(
      '/', '\\', '..', '<', '>', ':', '"', '|', '?', '*',
      'café', 'São Paulo', '  espaços  ', '---hifens---',
      'MAIÚSCULAS', 'ação_função', '日本語', '🎉🚀',
      '', '   ', '---', '...', '@#$%^&*()'
    );

    fc.assert(
      fc.property(caracteresEspeciais, (entrada) => {
        const resultado = sanitizeFilename(entrada);
        // Formato válido
        expect(resultado).toMatch(FORMATO_VALIDO);
        // Sem hífens no início/fim
        expect(resultado.startsWith('-')).toBe(false);
        expect(resultado.endsWith('-')).toBe(false);
        // Sem hífens consecutivos
        expect(resultado).not.toMatch(HIFENS_CONSECUTIVOS);
        // Nunca vazio
        expect(resultado.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

});
