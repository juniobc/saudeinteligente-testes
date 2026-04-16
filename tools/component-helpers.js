// Helpers reutilizáveis para interação com componentes React padronizados — Saúde Inteligente
// Funções específicas para React Select (Select2__), modais react-bootstrap (FormModal, SimpleModal),
// inputs com máscara e validação de formulários (react-hook-form).
// Complementa helpers.js (waitForToast, waitForTableLoad, interceptNetworkErrors, getStorageToken).

import { expect } from '@playwright/test';

/**
 * Seleciona uma opção em um componente React Select (Select2).
 * Segue o padrão de interação: click no controle → digitar texto → clicar na opção.
 * Constrói o locator internamente a partir do atributo `data-field-name`.
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @param {string} fieldName - Valor do atributo `data-field-name` do container do select
 * @param {string} optionText - Texto da opção a selecionar
 * @returns {Promise<void>}
 */
export async function selectReactSelectOption(page, fieldName, optionText) {
  const fieldLocator = page.locator(`[data-field-name="${fieldName}"]`);
  await fieldLocator.locator('.Select2__control').click();
  await page.keyboard.type(optionText);
  await page.locator('.Select2__option', { hasText: optionText }).first().click();
}

/**
 * Retorna o texto do valor atualmente selecionado em um React Select (Select2).
 * Busca o elemento `.Select2__single-value` dentro do locator fornecido.
 *
 * @param {import('@playwright/test').Locator} locator - Locator do container do campo (ex: `page.locator('[data-field-name="especialidade"]')`)
 * @returns {Promise<string>} Texto do valor selecionado ou string vazia se nenhum valor selecionado
 */
export async function getReactSelectValue(locator) {
  const singleValue = locator.locator('.Select2__single-value');
  const isVisible = await singleValue.isVisible().catch(() => false);
  if (isVisible) {
    return singleValue.textContent();
  }
  return '';
}

/**
 * Aguarda um modal react-bootstrap (FormModal ou SimpleModal) ficar visível na página.
 * Filtra o modal pelo texto do título contido nele.
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @param {string} titleText - Texto do título para filtrar o modal (ex: 'Nova Solicitação', 'Novo Usuário Cidadão')
 * @param {number} [timeout=10000] - Tempo máximo de espera em ms
 * @returns {Promise<import('@playwright/test').Locator>} Locator do modal encontrado
 */
export async function waitForModalOpen(page, titleText, timeout = 10000) {
  const modal = page.locator('.modal').filter({ hasText: titleText });
  await expect(modal).toBeVisible({ timeout });
  return modal;
}

/**
 * Aguarda um modal react-bootstrap (FormModal ou SimpleModal) ficar oculto (fechado) na página.
 * Filtra o modal pelo texto do título contido nele.
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @param {string} titleText - Texto do título para filtrar o modal (ex: 'Nova Solicitação', 'Novo Usuário Cidadão')
 * @param {number} [timeout=10000] - Tempo máximo de espera em ms
 * @returns {Promise<void>}
 */
export async function waitForModalClose(page, titleText, timeout = 10000) {
  const modal = page.locator('.modal').filter({ hasText: titleText });
  await expect(modal).toBeHidden({ timeout });
}

/**
 * Preenche um input com máscara (CPF, CEP, CNS) usando `fill()`.
 * Aguarda o elemento ficar visível antes de preencher.
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @param {string} selector - Seletor CSS do input com máscara (ex: '[name="nu_cpf"]', '#cep')
 * @param {string} value - Valor a preencher no input (com ou sem máscara)
 * @returns {Promise<void>}
 */
export async function fillMaskedInput(page, selector, value) {
  const input = page.locator(selector);
  await input.waitFor({ state: 'visible', timeout: 5000 });
  await input.fill(value);
}

/**
 * Coleta as mensagens de erro de validação (`.invalid-feedback`) dentro de um container.
 * Útil para verificar erros de formulários que usam react-hook-form.
 * O locator já possui referência à page, então não é necessário passá-la separadamente.
 *
 * @param {import('@playwright/test').Locator} modalLocator - Locator do container (ex: modal, formulário)
 * @returns {Promise<string[]>} Array com os textos das mensagens de erro de validação
 */
export async function getFormValidationErrors(modalLocator) {
  await modalLocator.page().waitForTimeout(300);
  const errors = modalLocator.locator('.invalid-feedback');
  const count = await errors.count();
  if (count === 0) return [];
  return errors.allTextContents();
}
