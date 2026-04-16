// Teste de propriedade — Extração de seletores respeita hierarquia de prioridade
// Valida que extractSelectorsFromElement() retorna o seletor primário correto
// conforme a hierarquia definida e alternativas em ordem decrescente de prioridade.
//
// **Valida: Requisitos 2.2, 5.1**

import { test, expect } from '@playwright/test';
import fc from 'fast-check';
import { extractSelectorsFromElement } from '../../tools/dom-inspector.js';

// --- Arbitrários auxiliares ---

/** Gera string não-vazia (valor de atributo presente) */
const strPresente = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

/** Gera valor de atributo opcional: string não-vazia ou ausente (undefined) */
const strOpcional = fc.option(strPresente, { nil: undefined });

/** Gera classList com possíveis classes Select2__ */
const classListArb = fc.array(fc.string(), { maxLength: 5 });

/** Gera classList que contém pelo menos uma classe Select2__ */
const classListComSelect2 = fc
  .tuple(
    fc.string({ minLength: 1 }).map((s) => `Select2__${s.replace(/\s/g, '')}`),
    fc.array(fc.string(), { maxLength: 4 })
  )
  .map(([sel2, rest]) => [sel2, ...rest]);

/**
 * Gera um objeto de atributos completo com todas as combinações possíveis.
 */
const atributosArb = fc.record({
  'data-field-name': strOpcional,
  'data-testid': strOpcional,
  name: strOpcional,
  id: strOpcional,
  role: strOpcional,
  'aria-label': strOpcional,
  classList: fc.option(classListArb, { nil: undefined }),
});


test.describe('Propriedade 2: Extração de seletores respeita hierarquia de prioridade', () => {

  test('quando data-field-name está presente, é sempre o seletor primário', () => {
    // Gera atributos onde data-field-name está sempre presente
    const arbComFieldName = fc.record({
      'data-field-name': strPresente,
      'data-testid': strOpcional,
      name: strOpcional,
      id: strOpcional,
      role: strOpcional,
      'aria-label': strOpcional,
      classList: fc.option(classListArb, { nil: undefined }),
    });

    fc.assert(
      fc.property(arbComFieldName, (attrs) => {
        const resultado = extractSelectorsFromElement(attrs);
        expect(resultado.primary).toBe(`[data-field-name="${attrs['data-field-name']}"]`);
      }),
      { numRuns: 150 }
    );
  });

  test('quando data-field-name ausente mas data-testid presente, data-testid é primário', () => {
    const arbSemFieldNameComTestId = fc.record({
      'data-testid': strPresente,
      name: strOpcional,
      id: strOpcional,
      role: strOpcional,
      'aria-label': strOpcional,
      classList: fc.option(classListArb, { nil: undefined }),
    });

    fc.assert(
      fc.property(arbSemFieldNameComTestId, (attrs) => {
        // Garante que data-field-name está ausente
        const entrada = { ...attrs, 'data-field-name': undefined };
        const resultado = extractSelectorsFromElement(entrada);
        expect(resultado.primary).toBe(`[data-testid="${attrs['data-testid']}"]`);
      }),
      { numRuns: 150 }
    );
  });

  test('quando data-field-name e data-testid ausentes mas name presente, name é primário', () => {
    const arbSoName = fc.record({
      name: strPresente,
      id: strOpcional,
      role: strOpcional,
      'aria-label': strOpcional,
      classList: fc.option(classListArb, { nil: undefined }),
    });

    fc.assert(
      fc.property(arbSoName, (attrs) => {
        const entrada = {
          ...attrs,
          'data-field-name': undefined,
          'data-testid': undefined,
        };
        const resultado = extractSelectorsFromElement(entrada);
        expect(resultado.primary).toBe(`[name="${attrs.name}"]`);
      }),
      { numRuns: 150 }
    );
  });

  test('alternativas contêm seletores restantes em ordem decrescente de prioridade', () => {
    // Gera atributos onde todos os campos estão presentes para verificar a ordem
    const arbTodosPresentes = fc.record({
      'data-field-name': strPresente,
      'data-testid': strPresente,
      name: strPresente,
      id: strPresente,
      role: strPresente,
      'aria-label': strPresente,
      classList: classListComSelect2,
    });

    fc.assert(
      fc.property(arbTodosPresentes, (attrs) => {
        const resultado = extractSelectorsFromElement(attrs);

        // Primário deve ser data-field-name (maior prioridade)
        expect(resultado.primary).toBe(`[data-field-name="${attrs['data-field-name']}"]`);

        // Alternativas devem seguir a ordem: data-testid > name > id > role+aria-label > Select2__
        const alternativasEsperadas = [
          `[data-testid="${attrs['data-testid']}"]`,
          `[name="${attrs.name}"]`,
          `#${attrs.id}`,
          `[role="${attrs.role}"][aria-label="${attrs['aria-label']}"]`,
        ];

        // Encontra a primeira classe Select2__ no classList
        const select2Class = attrs.classList.find((c) => c.startsWith('Select2__'));
        if (select2Class) {
          alternativasEsperadas.push(`.${select2Class}`);
        }

        expect(resultado.alternatives).toEqual(alternativasEsperadas);
      }),
      { numRuns: 150 }
    );
  });

  test('atributos vazios/null/undefined produzem primary null e alternatives vazio', () => {
    // Gera entradas que devem resultar em nenhum seletor
    const entradasVazias = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant({}),
      fc.constant({ 'data-field-name': '', 'data-testid': '', name: '', id: '' }),
      fc.constant({ 'data-field-name': '   ', 'data-testid': '   ' }),
      fc.constant({ classList: [] }),
      fc.constant({ classList: ['classe-normal', 'outra-classe'] }),
    );

    fc.assert(
      fc.property(entradasVazias, (entrada) => {
        const resultado = extractSelectorsFromElement(entrada);
        expect(resultado.primary).toBeNull();
        expect(resultado.alternatives).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  test('total de seletores é igual ao número de atributos não-vazios fornecidos', () => {
    fc.assert(
      fc.property(atributosArb, (attrs) => {
        const resultado = extractSelectorsFromElement(attrs);
        const totalSeletores = (resultado.primary ? 1 : 0) + resultado.alternatives.length;

        // Conta quantos atributos produziriam seletores
        let esperado = 0;
        if (attrs['data-field-name'] && attrs['data-field-name'].trim()) esperado++;
        if (attrs['data-testid'] && attrs['data-testid'].trim()) esperado++;
        if (attrs.name && attrs.name.trim()) esperado++;
        if (attrs.id && attrs.id.trim()) esperado++;
        if (attrs.role && attrs.role.trim()) esperado++; // role gera 1 seletor (com ou sem aria-label)
        if (
          Array.isArray(attrs.classList) &&
          attrs.classList.some((c) => typeof c === 'string' && c.startsWith('Select2__'))
        ) {
          esperado++;
        }

        expect(totalSeletores).toBe(esperado);
      }),
      { numRuns: 200 }
    );
  });

});
