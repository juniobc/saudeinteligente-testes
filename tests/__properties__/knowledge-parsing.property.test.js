// Teste de propriedade — Round-trip de parsing de arquivos de knowledge
// Valida que formatSelectorsTable/parseSelectorsTable e formatFlowBlock/parseFlowBlock
// preservam todos os campos após round-trip (formatar → parsear → comparar).
//
// **Valida: Requisitos 6.4, 6.5**

import { test, expect } from '@playwright/test';
import fc from 'fast-check';
import {
  parseSelectorsTable,
  formatSelectorsTable,
  parseFlowBlock,
  formatFlowBlock,
} from '../../tools/helpers.js';

// --- Geradores (arbitraries) ---

// Gera string não-vazia sem pipe nem backtick (quebrariam parsing de tabela markdown)
const textoSemPipe = fc.string({ minLength: 1 })
  .filter((s) => !s.includes('|') && !s.includes('`') && s.trim().length > 0)
  .map((s) => s.trim());

// Gera string que pode ser vazia, sem pipe nem backtick
const textoOpcionalSemPipe = fc.string()
  .filter((s) => !s.includes('|') && !s.includes('`'))
  .map((s) => s.trim());

// Status válidos conforme modelo de dados do design
const statusSeletor = fc.constantFrom('✅ ativo', '⚠️ instável', '❌ quebrado');

// Gera uma entrada válida de seletor
const seletorEntryArb = fc.record({
  tela: textoSemPipe,
  campo: textoSemPipe,
  tipo: textoSemPipe,
  seletorPrimario: textoSemPipe,
  seletorAlternativo: textoOpcionalSemPipe,
  status: statusSeletor,
});

// Gera string não-vazia sem newlines (quebraria parsing de bloco de fluxo)
const textoSemNewline = fc.string({ minLength: 1 })
  .filter((s) => !s.includes('\n') && !s.includes('\r') && s.trim().length > 0)
  .map((s) => s.trim());

// Gera string de passo: não-vazia, sem newlines, não começa com dígito+ponto
const passoArb = textoSemNewline
  .filter((s) => !/^\d+\./.test(s));

// Gera uma entrada válida de fluxo
const flowEntryArb = fc.record({
  nome: textoSemNewline,
  preCondicoes: textoSemNewline,
  rota: textoSemNewline,
  passos: fc.array(passoArb, { minLength: 1, maxLength: 10 }),
  resultadoEsperado: textoSemNewline,
  pageObject: textoSemNewline,
  spec: textoSemNewline,
  status: textoSemNewline,
});


test.describe('Propriedade 3: Round-trip de parsing de arquivos de knowledge', () => {

  // --- Seletores: round-trip ---

  test('round-trip de seletores: formatSelectorsTable → parseSelectorsTable preserva todos os campos', () => {
    fc.assert(
      fc.property(
        fc.array(seletorEntryArb, { minLength: 1, maxLength: 10 }),
        (entries) => {
          const markdown = formatSelectorsTable(entries);
          const parsed = parseSelectorsTable(markdown);

          expect(parsed.length).toBe(entries.length);

          for (let i = 0; i < entries.length; i++) {
            expect(parsed[i].tela).toBe(entries[i].tela);
            expect(parsed[i].campo).toBe(entries[i].campo);
            expect(parsed[i].tipo).toBe(entries[i].tipo);
            expect(parsed[i].seletorPrimario).toBe(entries[i].seletorPrimario);
            expect(parsed[i].seletorAlternativo).toBe(entries[i].seletorAlternativo);
            expect(parsed[i].status).toBe(entries[i].status);
          }
        }
      ),
      { numRuns: 150 }
    );
  });

  // --- Fluxos: round-trip ---

  test('round-trip de fluxos: formatFlowBlock → parseFlowBlock preserva todos os campos', () => {
    fc.assert(
      fc.property(flowEntryArb, (flow) => {
        const markdown = formatFlowBlock(flow);
        const parsed = parseFlowBlock(markdown);

        expect(parsed).not.toBeNull();
        expect(parsed.nome).toBe(flow.nome);
        expect(parsed.preCondicoes).toBe(flow.preCondicoes);
        expect(parsed.rota).toBe(flow.rota);
        expect(parsed.passos).toEqual(flow.passos);
        expect(parsed.resultadoEsperado).toBe(flow.resultadoEsperado);
        expect(parsed.pageObject).toBe(flow.pageObject);
        expect(parsed.spec).toBe(flow.spec);
        expect(parsed.status).toBe(flow.status);
      }),
      { numRuns: 150 }
    );
  });

  // --- parseSelectorsTable: entrada inválida ---

  test('parseSelectorsTable retorna array vazio para entrada inválida', () => {
    const entradaInvalida = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant(42),
      fc.constant(true),
      fc.constant({}),
      fc.constant([]),
      // Strings que não contêm tabela markdown válida
      fc.string().filter((s) => !s.includes('|'))
    );

    fc.assert(
      fc.property(entradaInvalida, (entrada) => {
        const resultado = parseSelectorsTable(entrada);
        expect(Array.isArray(resultado)).toBe(true);
        expect(resultado.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  // --- parseFlowBlock: entrada inválida ---

  test('parseFlowBlock retorna null para entrada inválida', () => {
    const entradaInvalida = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant(42),
      fc.constant(true),
      fc.constant({}),
      fc.constant([]),
      // Strings sem cabeçalho ### (não contêm nome de fluxo)
      fc.string().filter((s) => !s.includes('###'))
    );

    fc.assert(
      fc.property(entradaInvalida, (entrada) => {
        const resultado = parseFlowBlock(entrada);
        expect(resultado).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  // --- formatSelectorsTable: array vazio ---

  test('formatSelectorsTable retorna string vazia para array vazio', () => {
    const resultado = formatSelectorsTable([]);
    expect(resultado).toBe('');
  });

  // --- formatFlowBlock: entrada inválida ---

  test('formatFlowBlock retorna string vazia para entrada inválida', () => {
    const entradaInvalida = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant(42),
      fc.constant('string'),
      fc.constant({}),
      fc.constant([]),
      // Objeto sem campo 'nome' como string
      fc.constant({ nome: 123 }),
      fc.constant({ nome: null })
    );

    fc.assert(
      fc.property(entradaInvalida, (entrada) => {
        const resultado = formatFlowBlock(entrada);
        expect(resultado).toBe('');
      }),
      { numRuns: 100 }
    );
  });

});
