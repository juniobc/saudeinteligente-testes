// Specs de Cancelamento de Solicitação — Módulo OCI
// Saúde Inteligente — Testes E2E (Requisito 5)
// Este spec REUTILIZA storageState — sessão autenticada via global setup

import { test, expect } from '@playwright/test';
import CadOCIPage from '../../page-objects/CadOCIPage.js';
import { cancelamento } from '../../fixtures/test-data.js';
import { waitForToast, waitForTableLoad } from '../../tools/helpers.js';
import { setupConsoleCapture } from '../../tools/console-capture.js';
import { captureScreenshot } from '../../tools/screenshot-helper.js';

test.describe('Cancelamento de Solicitação — Módulo OCI', () => {
  let cadOCI;
  /** @type {import('../../tools/console-capture.js').ConsoleCapture} */
  let consoleCapture;

  /**
   * Fluxo comum: navega para CadOCI e aguarda carregamento da tabela.
   */
  test.beforeEach(async ({ page }, testInfo) => {
    consoleCapture = setupConsoleCapture(page);
    await captureScreenshot(page, 'oci-cancelamento-solicitacao', `${testInfo.title}-antes`);

    cadOCI = new CadOCIPage(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();
    await waitForTableLoad(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await captureScreenshot(page, 'oci-cancelamento-solicitacao', `${testInfo.title}-depois`);
    if (consoleCapture.hasConsoleErrors()) {
      const logs = consoleCapture.getConsoleLogs().filter((l) => l.type === 'error');
      console.warn(`[console_errors: true] ${testInfo.title} — ${logs.length} erro(s) JS:`, logs);
      testInfo.annotations.push({ type: 'console_errors', description: 'true' });
    }
    consoleCapture.clear();
  });

  /**
   * Req 5.1 — Ação de cancelar exibe modal de confirmação com campo de justificativa.
   * Verifica que ao clicar na ação de cancelar de uma solicitação, o modal de
   * cancelamento é exibido contendo um textarea para justificativa.
   */
  test('Req 5.1 - Ação de cancelar exibe modal de confirmação com campo de justificativa', async ({ page }) => {
    // Clica na ação de cancelar da primeira solicitação da tabela
    await cadOCI.clickCancelarSolicitacao(0);

    // Verifica que o modal de cancelamento está visível
    await expect(cadOCI.modalCancelamento).toBeVisible({ timeout: 10000 });

    // Verifica que o campo de justificativa (textarea) está presente no modal
    await expect(cadOCI.textareaJustificativa).toBeVisible({ timeout: 5000 });
  });

  /**
   * Req 5.2 — Preenchimento da justificativa e confirmação cancela solicitação.
   * Preenche a justificativa, confirma o cancelamento e verifica que o toast de
   * sucesso é exibido, o status é atualizado para "Cancelada" e a justificativa
   * fica acessível via tooltip (Popover) na coluna de status.
   */
  test('Req 5.2 - Preenchimento da justificativa e confirmação cancela solicitação', async ({ page }) => {
    // Clica na ação de cancelar da primeira solicitação
    await cadOCI.clickCancelarSolicitacao(0);

    // Aguarda o modal de cancelamento abrir
    await expect(cadOCI.modalCancelamento).toBeVisible({ timeout: 10000 });

    // Preenche a justificativa de cancelamento
    await cadOCI.fillJustificativaCancelamento(cancelamento.justificativa);

    // Confirma o cancelamento
    await cadOCI.confirmCancelamento();

    // Verifica que o toast de sucesso é exibido
    await waitForToast(page, 'sucesso');

    // Aguarda atualização da tabela após o cancelamento
    await waitForTableLoad(page);

    // Verifica que o status da solicitação foi atualizado para "Cancelada"
    const status = await cadOCI.getStatusSolicitacao(0);
    expect(status.toLowerCase()).toContain('cancelada');

    // Verifica que a justificativa está acessível via tooltip (Popover)
    // Passa o mouse sobre a célula de status para exibir o popover
    const row = cadOCI.tableRows.nth(0);
    const statusCell = row.locator('td').last();
    await statusCell.hover();

    // Aguarda o popover/tooltip aparecer com a justificativa
    const popover = page.locator('[role="tooltip"], .popover, [class*="Popover"]');
    await expect(popover.first()).toBeVisible({ timeout: 5000 });
    const popoverText = await popover.first().textContent();
    expect(popoverText).toContain(cancelamento.justificativa);
  });

  /**
   * Req 5.3 — Confirmação sem justificativa exibe mensagem de validação.
   * Tenta confirmar o cancelamento sem preencher a justificativa e verifica
   * que uma mensagem de validação é exibida e o cancelamento não é efetivado.
   */
  test('Req 5.3 - Confirmação sem justificativa exibe mensagem de validação', async ({ page }) => {
    // Captura o status original da primeira solicitação antes de tentar cancelar
    const statusOriginal = await cadOCI.getStatusSolicitacao(0);

    // Clica na ação de cancelar da primeira solicitação
    await cadOCI.clickCancelarSolicitacao(0);

    // Aguarda o modal de cancelamento abrir
    await expect(cadOCI.modalCancelamento).toBeVisible({ timeout: 10000 });

    // Tenta confirmar sem preencher a justificativa
    await cadOCI.confirmCancelamento();

    // Verifica que uma mensagem de validação é exibida
    const validationMessage = page.locator('.modal .text-danger, .modal .invalid-feedback, .modal [class*="error"], .modal [class*="validacao"]');
    await expect(validationMessage.first()).toBeVisible({ timeout: 5000 });

    // Verifica que o modal ainda está aberto (cancelamento não foi efetivado)
    await expect(cadOCI.modalCancelamento).toBeVisible();

    // Fecha o modal (pressiona Escape) e verifica que o status não mudou
    await page.keyboard.press('Escape');
    await waitForTableLoad(page);

    const statusAtual = await cadOCI.getStatusSolicitacao(0);
    expect(statusAtual).toBe(statusOriginal);
  });
});
