// Teste de propriedade — Categorização de logs de console e rede
// Valida que categorizeLogEntry() e isNetworkError() classificam corretamente
// qualquer combinação de entradas de log e respostas de rede.
//
// **Valida: Requisitos 11.3, 11.5**

import { test, expect } from '@playwright/test';
import fc from 'fast-check';
import { categorizeLogEntry, isNetworkError } from '../../tools/console-capture.js';

// Categorias válidas retornadas por categorizeLogEntry
const CATEGORIAS_VALIDAS = ['error', 'warning', 'log'];

test.describe('Propriedade 4: Filtragem e categorização de logs de console e rede', () => {

  // --- categorizeLogEntry ---

  test('categorizeLogEntry sempre retorna uma das categorias válidas para qualquer entrada', () => {
    // Gera entradas de log com tipo e texto arbitrários
    const entradaArb = fc.record({
      type: fc.string(),
      text: fc.string(),
    });

    fc.assert(
      fc.property(entradaArb, (entry) => {
        const resultado = categorizeLogEntry(entry);
        expect(CATEGORIAS_VALIDAS).toContain(resultado);
      }),
      { numRuns: 200 }
    );
  });

  test('tipos "error" e "pageerror" sempre são categorizados como "error"', () => {
    const tipoErro = fc.constantFrom('error', 'pageerror', 'Error', 'PAGEERROR', 'ERROR', 'PageError');

    fc.assert(
      fc.property(tipoErro, fc.string(), (tipo, texto) => {
        const resultado = categorizeLogEntry({ type: tipo, text: texto });
        expect(resultado).toBe('error');
      }),
      { numRuns: 200 }
    );
  });

  test('tipo "warning" sempre é categorizado como "warning"', () => {
    const tipoWarning = fc.constantFrom('warning', 'Warning', 'WARNING');

    fc.assert(
      fc.property(tipoWarning, fc.string(), (tipo, texto) => {
        const resultado = categorizeLogEntry({ type: tipo, text: texto });
        expect(resultado).toBe('warning');
      }),
      { numRuns: 100 }
    );
  });

  test('qualquer tipo diferente de "error", "pageerror" e "warning" é categorizado como "log"', () => {
    // Gera tipos que não são error, pageerror nem warning
    const tiposNaoEspeciais = fc.string().filter((s) => {
      const lower = s.toLowerCase();
      return lower !== 'error' && lower !== 'pageerror' && lower !== 'warning';
    });

    fc.assert(
      fc.property(tiposNaoEspeciais, fc.string(), (tipo, texto) => {
        const resultado = categorizeLogEntry({ type: tipo, text: texto });
        expect(resultado).toBe('log');
      }),
      { numRuns: 200 }
    );
  });

  test('categorizeLogEntry lida com entradas com tipo não-string ou ausente', () => {
    // Gera entradas com tipo inválido (null, undefined, número, objeto)
    const tipoInvalido = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.integer(),
      fc.boolean(),
      fc.constant({}),
      fc.constant([])
    );

    fc.assert(
      fc.property(tipoInvalido, (tipo) => {
        const resultado = categorizeLogEntry({ type: tipo, text: 'qualquer texto' });
        // Tipo inválido deve cair no fallback 'log'
        expect(resultado).toBe('log');
      }),
      { numRuns: 100 }
    );
  });

  // --- isNetworkError ---

  test('isNetworkError retorna true para qualquer status >= 400', () => {
    // Gera status codes de erro HTTP (400-599)
    const statusErro = fc.integer({ min: 400, max: 599 });

    fc.assert(
      fc.property(statusErro, (status) => {
        const resultado = isNetworkError({ status });
        expect(resultado).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  test('isNetworkError retorna false para qualquer status < 400', () => {
    // Gera status codes de sucesso/redirecionamento HTTP (100-399)
    const statusOk = fc.integer({ min: 100, max: 399 });

    fc.assert(
      fc.property(statusOk, (status) => {
        const resultado = isNetworkError({ status });
        expect(resultado).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  test('isNetworkError retorna false para respostas inválidas (null, undefined, sem status)', () => {
    // Gera respostas inválidas que não possuem status numérico
    const respostaInvalida = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant({}),
      fc.constant({ status: 'abc' }),
      fc.constant({ status: null }),
      fc.constant({ status: undefined }),
      fc.constant({ status: NaN })
    );

    fc.assert(
      fc.property(respostaInvalida, (response) => {
        const resultado = isNetworkError(response);
        expect(resultado).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('isNetworkError: fronteira exata no status 400', () => {
    // Verifica que 399 → false e 400 → true (fronteira)
    fc.assert(
      fc.property(fc.integer({ min: 395, max: 405 }), (status) => {
        const resultado = isNetworkError({ status });
        if (status >= 400) {
          expect(resultado).toBe(true);
        } else {
          expect(resultado).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

});
