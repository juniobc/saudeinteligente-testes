// Specs de Detalhes e Impressão — Módulo OCI
// Saúde Inteligente — Testes E2E (Requisito 6)
// Este spec REUTILIZA storageState — sessão autenticada via global setup

import { test, expect } from '@playwright/test';
import CadOCIPage from '../../page-objects/CadOCIPage.js';
import { waitForTableLoad } from '../../tools/helpers.js';
import { setupConsoleCapture } from '../../tools/console-capture.js';
import { captureScreenshot } from '../../tools/screenshot-helper.js';

test.describe('Detalhes e Impressão — Módulo OCI', () => {
  let cadOCI;
  /** @type {import('../../tools/console-capture.js').ConsoleCapture} */
  let consoleCapture;

  /**
   * Fluxo comum: navega para CadOCI e aguarda carregamento da tabela.
   */
  test.beforeEach(async ({ page }, testInfo) => {
    consoleCapture = setupConsoleCapture(page);
    await captureScreenshot(page, 'oci-detalhes-impressao', `${testInfo.title}-antes`);

    cadOCI = new CadOCIPage(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();
    await waitForTableLoad(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await captureScreenshot(page, 'oci-detalhes-impressao', `${testInfo.title}-depois`);
    if (consoleCapture.hasConsoleErrors()) {
      const logs = consoleCapture.getConsoleLogs().filter((l) => l.type === 'error');
      console.warn(`[console_errors: true] ${testInfo.title} — ${logs.length} erro(s) JS:`, logs);
      testInfo.annotations.push({ type: 'console_errors', description: 'true' });
    }
    consoleCapture.clear();
  });

  /**
   * Req 6.1 — Expandir solicitação exibe detalhes completos.
   * Verifica que ao expandir uma linha da tabela, os detalhes exibem informações
   * do paciente, fases da OCI com seus respectivos status e ações disponíveis.
   * O conteúdo expandido utiliza o componente PacienteExpandido.
   */
  test('Req 6.1 - Expandir solicitação exibe detalhes completos', async ({ page }) => {
    // Expande a primeira linha da tabela
    await cadOCI.expandRow(0);

    // Obtém o conteúdo dos detalhes expandidos (PacienteExpandido)
    const detalhes = await cadOCI.getExpandedDetails();

    // Verifica que o conteúdo expandido não está vazio
    expect(detalhes).toBeTruthy();
    expect(detalhes.length).toBeGreaterThan(0);

    // Verifica que os detalhes contêm informações do paciente
    // O componente PacienteExpandido exibe dados como nome, CNS, etc.
    const expandedContent = cadOCI.expandedRowContent.first();
    await expect(expandedContent).toBeVisible({ timeout: 10000 });

    // Verifica que as fases da OCI estão presentes nos detalhes expandidos
    // As fases possíveis: Aguardando Autorização, Consulta Especializada,
    // Exames Diagnósticos, Consulta de Retorno, Finalizada
    const fasesLocator = expandedContent.locator('[class*="fase"], [class*="phase"], [class*="etapa"], [class*="timeline"], tr, li');
    const fasesCount = await fasesLocator.count();
    expect(fasesCount).toBeGreaterThan(0);

    // Verifica que ações estão disponíveis no conteúdo expandido
    // (botões de ação como imprimir, editar, etc.)
    const acoesLocator = expandedContent.locator('button, [role="button"], a[class*="action"], i[class*="ri-"]');
    const acoesCount = await acoesLocator.count();
    expect(acoesCount).toBeGreaterThan(0);
  });

  /**
   * Req 6.2 — Ação de imprimir gera comprovante.
   * Verifica que ao clicar na ação de imprimir comprovante, um download de PDF
   * é disparado (jsPDF gera o arquivo via doc.save()) ou uma janela de impressão
   * é aberta. O comprovante contém dados da solicitação, paciente e unidade.
   */
  test('Req 6.2 - Ação de imprimir gera comprovante', async ({ page }) => {
    // Registra listener para capturar evento de download (jsPDF doc.save())
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    // Clica na ação de imprimir comprovante da primeira solicitação
    await cadOCI.clickImprimirComprovante(0);

    // Aguarda o download ser disparado pelo jsPDF
    const download = await downloadPromise;

    // Verifica que o download foi iniciado com sucesso
    expect(download).toBeTruthy();

    // Verifica que o arquivo gerado é um PDF (extensão .pdf no nome sugerido)
    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename.toLowerCase()).toContain('.pdf');
  });
});
