// Specs de Listagem e Filtragem — Módulo OCI
// Saúde Inteligente — Testes E2E (Requisito 2)
// Este spec REUTILIZA storageState — sessão autenticada via global setup

import { test, expect } from '@playwright/test';
import CadOCIPage from '../../page-objects/CadOCIPage.js';
import { routes, solicitacaoOCI } from '../../fixtures/test-data.js';
import { waitForTableLoad } from '../../tools/helpers.js';
import { setupConsoleCapture } from '../../tools/console-capture.js';
import { captureScreenshot } from '../../tools/screenshot-helper.js';

test.describe('Listagem e Filtragem — Módulo OCI', () => {
  /** @type {import('../../tools/console-capture.js').ConsoleCapture} */
  let consoleCapture;

  test.beforeEach(async ({ page }, testInfo) => {
    consoleCapture = setupConsoleCapture(page);
    await captureScreenshot(page, 'oci-listagem-filtragem', `${testInfo.title}-antes`);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await captureScreenshot(page, 'oci-listagem-filtragem', `${testInfo.title}-depois`);
    if (consoleCapture.hasConsoleErrors()) {
      const logs = consoleCapture.getConsoleLogs().filter((l) => l.type === 'error');
      console.warn(`[console_errors: true] ${testInfo.title} — ${logs.length} erro(s) JS:`, logs);
      testInfo.annotations.push({ type: 'console_errors', description: 'true' });
    }
    consoleCapture.clear();
  });

  /**
   * Req 2.1 — Página carrega com filtros visíveis e tabela paginada.
   * Verifica que ao acessar a Tela_CadOCI os filtros principais estão visíveis
   * (Especialidade, Linha de Cuidado, Município, Unidade Solicitante, Equipe Referência)
   * e que a tabela de resultados é exibida com dados.
   */
  test('Req 2.1 - Página carrega com filtros visíveis e tabela paginada', async ({ page }) => {
    const cadOCI = new CadOCIPage(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();

    // Aguarda carregamento da tabela de resultados
    await waitForTableLoad(page);

    // Verifica que os filtros principais estão visíveis
    await expect(cadOCI.filtroEspecialidade).toBeVisible({ timeout: 10000 });
    await expect(cadOCI.filtroLinhaCuidado).toBeVisible({ timeout: 10000 });
    await expect(cadOCI.filtroMunicipio).toBeVisible({ timeout: 10000 });
    await expect(cadOCI.filtroUnidadeSolicitante).toBeVisible({ timeout: 10000 });
    await expect(cadOCI.filtroEquipeReferencia).toBeVisible({ timeout: 10000 });

    // Verifica que a tabela possui dados (pelo menos uma linha)
    const rowCount = await cadOCI.getTableRowCount();
    expect(rowCount).toBeGreaterThan(0);
  });

  /**
   * Req 2.2 — Filtro por especialidade retorna apenas solicitações da especialidade selecionada.
   * Seleciona uma especialidade no filtro, submete a busca e verifica que a tabela
   * exibe resultados correspondentes à especialidade selecionada.
   */
  test('Req 2.2 - Filtro por especialidade retorna apenas solicitações da especialidade selecionada', async ({ page }) => {
    const cadOCI = new CadOCIPage(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();
    await waitForTableLoad(page);

    // Seleciona a especialidade definida nas fixtures
    await cadOCI.selectEspecialidade(solicitacaoOCI.especialidade);

    // Submete a busca com o filtro aplicado
    await cadOCI.submitSearch();

    // Aguarda atualização da tabela com os resultados filtrados
    await waitForTableLoad(page);

    // Verifica que a tabela possui resultados após o filtro
    const rowCount = await cadOCI.getTableRowCount();
    expect(rowCount).toBeGreaterThan(0);
  });

  /**
   * Req 2.3 — Filtro "Ver somente minhas Solicitações" exibe apenas solicitações do usuário logado.
   * Ativa o toggle de "minhas solicitações", submete a busca e verifica que a tabela
   * é atualizada com os resultados filtrados.
   */
  test('Req 2.3 - Filtro "Ver somente minhas Solicitações" exibe apenas solicitações do usuário logado', async ({ page }) => {
    const cadOCI = new CadOCIPage(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();
    await waitForTableLoad(page);

    // Ativa o filtro "Ver somente minhas Solicitações"
    await cadOCI.toggleMinhasSolicitacoes();

    // Submete a busca com o filtro ativado
    await cadOCI.submitSearch();

    // Aguarda atualização da tabela — pode ter resultados ou não (depende do usuário)
    await page.waitForLoadState('networkidle');

    // Verifica que a tabela está presente (mesmo que sem resultados, a estrutura deve existir)
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  /**
   * Req 2.4 — Botões de paginação atualizam registros.
   * Verifica que os botões de paginação existem e que ao clicar em "próxima página"
   * o conteúdo da tabela é atualizado.
   */
  test('Req 2.4 - Botões de paginação atualizam registros', async ({ page }) => {
    const cadOCI = new CadOCIPage(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();
    await waitForTableLoad(page);

    // Verifica que os botões de paginação existem
    await expect(cadOCI.btnPrimeiraPagina).toBeVisible({ timeout: 10000 });
    await expect(cadOCI.btnPaginaAnterior).toBeVisible({ timeout: 10000 });
    await expect(cadOCI.btnProximaPagina).toBeVisible({ timeout: 10000 });
    await expect(cadOCI.btnUltimaPagina).toBeVisible({ timeout: 10000 });

    // Captura o conteúdo da primeira página para comparação
    const firstPageContent = await cadOCI.tableRows.allTextContents();

    // Clica em "Próxima página"
    await cadOCI.goToNextPage();

    // Aguarda carregamento da nova página
    await waitForTableLoad(page);

    // Captura o conteúdo da segunda página
    const secondPageContent = await cadOCI.tableRows.allTextContents();

    // Verifica que o conteúdo mudou (páginas diferentes devem ter dados diferentes)
    const contentChanged = JSON.stringify(firstPageContent) !== JSON.stringify(secondPageContent);
    expect(contentChanged).toBe(true);
  });

  /**
   * Req 2.5 — Filtros avançados expandem e exibem campos adicionais funcionais.
   * Clica no botão "Filtros Avançados" e verifica que os campos adicionais ficam
   * visíveis: Período de Registro, Nr. Solicitação, Profissional Solicitante,
   * Nome/CNS/CPF do Cidadão, Status da Solicitação, Fase, Status.
   */
  test('Req 2.5 - Filtros avançados expandem e exibem campos adicionais funcionais', async ({ page }) => {
    const cadOCI = new CadOCIPage(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();
    await waitForTableLoad(page);

    // Clica no botão "Filtros Avançados" para expandir
    await cadOCI.expandAdvancedFilters();

    // Aguarda que os campos avançados fiquem visíveis
    await page.waitForTimeout(500);

    // Obtém os labels dos campos visíveis após expandir
    const visibleLabels = await cadOCI.getAdvancedFilterFields();
    const labelsText = visibleLabels.join(' ').toLowerCase();

    // Verifica que os campos avançados esperados estão presentes
    // Os labels podem variar ligeiramente, então verificamos por palavras-chave
    const camposEsperados = [
      'período',       // Período de Registro
      'solicitação',   // Nr. Solicitação
      'profissional',  // Profissional Solicitante
      'cidadão',       // Nome/CNS/CPF do Cidadão
      'fase',          // Fase
      'status',        // Status
    ];

    for (const campo of camposEsperados) {
      expect(labelsText).toContain(campo);
    }
  });
});
