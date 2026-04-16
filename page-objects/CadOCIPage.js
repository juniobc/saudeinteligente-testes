// Page Object — Tela principal de Cadastro/Listagem OCI
// Saúde Inteligente — Suíte E2E do módulo OCI

import { expect } from '@playwright/test';

/**
 * Encapsula a interação com a tela de Cadastro de OCI (CadOCI).
 * Seletores extraídos diretamente de CadOCI.jsx, ListTable.jsx,
 * FilterSection.jsx, FiltrosAvancadosButton.jsx e SimpleModal.jsx.
 */
export default class CadOCIPage {
  /**
   * @param {import('playwright').Page} page — instância da página do Playwright
   */
  constructor(page) {
    this.page = page;

    // --- Filtros ---
    this.filtroEspecialidade = page.locator('[name="co_grupo"]');
    this.filtroLinhaCuidado = page.locator('[name="id_linha_cuidado"]');
    this.filtroMunicipio = page.locator('[name="mun_origem"]');
    this.filtroUnidadeSolicitante = page.locator('[name="co_cnes_solicitante"]');
    this.filtroEquipeReferencia = page.locator('[name="ine"]');
    this.switchMinhasSolicitacoes = page.locator('[name="st_somente_usuario_logado"]');

    // Botão "Filtros Avançados" (FiltrosAvancadosButton.jsx)
    this.btnFiltrosAvancados = page.getByText('Filtros Avançados');

    // Botão de busca do FormBusca (geralmente um botão com ícone de busca ou texto "Buscar")
    this.btnBuscar = page.locator('button[type="submit"]');

    // --- Tabela (ListTable) ---
    this.tableRows = page.locator('table tbody tr:not(.expanded-row)');
    this.expandedRowContent = page.locator('.expanded-row, [class*="expandido"], [class*="PacienteExpandido"]');

    // --- Paginação (ListTable com aria-labels) ---
    this.btnPrimeiraPagina = page.locator('[aria-label="Primeira página"]');
    this.btnPaginaAnterior = page.locator('[aria-label="Página anterior"]');
    this.btnProximaPagina = page.locator('[aria-label="Próxima página"]');
    this.btnUltimaPagina = page.locator('[aria-label="Última página"]');

    // --- Botão "Solicitar OCI" (CrudLayout newButtonLabel) ---
    this.btnNovaSolicitacao = page.getByText('Solicitar OCI');

    // --- Modal de Especialidades (SimpleModal) ---
    this.modalEspecialidades = page.locator('.modal').filter({ hasText: 'Selecione a Especialidade' });
    this.especialidadeCards = this.modalEspecialidades.locator('.especialidade-option');

    // --- Modal de Cancelamento (SimpleModal) ---
    this.modalCancelamento = page.locator('.modal').filter({ hasText: 'Justificativa do Cancelamento' });
    this.textareaJustificativa = page.locator('#justificativa');
    this.btnConfirmarCancelamento = this.modalCancelamento.locator('button', { hasText: 'Confirmar' });

    // --- Sidebar OCI ---
    this.sidebarOCI = page.locator('[class*="sidebar"], nav').filter({ hasText: 'OCI' });
  }

  // ==================== Navegação ====================

  /** Navega para a tela de Cadastro OCI. */
  async goto() {
    await this.page.goto('/oci/dashboard/consulta_cadastro');
    await this.page.waitForLoadState('networkidle');
  }

  // ==================== Filtros ====================

  /**
   * Retorna os labels dos filtros visíveis na seção de filtros.
   * @returns {Promise<string[]>} array com os textos dos labels visíveis
   */
  async getVisibleFilters() {
    const labels = this.page.locator('form label:visible');
    return labels.allTextContents();
  }

  /**
   * Seleciona uma especialidade no filtro dropdown (react-select).
   * @param {string} nome — texto da opção a selecionar
   */
  async selectEspecialidade(nome) {
    // React-select: clicar no container, digitar e selecionar a opção
    await this.filtroEspecialidade.click();
    await this.page.keyboard.type(nome);
    await this.page.locator('[class*="option"]', { hasText: nome }).first().click();
  }

  /** Submete a busca clicando no botão de buscar do formulário. */
  async submitSearch() {
    await this.btnBuscar.first().click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Alterna o switch "Ver somente minhas Solicitações". */
  async toggleMinhasSolicitacoes() {
    await this.switchMinhasSolicitacoes.click();
  }

  /** Expande a seção de filtros avançados clicando no botão. */
  async expandAdvancedFilters() {
    await this.btnFiltrosAvancados.click();
  }

  /**
   * Retorna os labels dos campos de filtros avançados visíveis.
   * Os filtros avançados incluem: Período de Registro, Nr. Solicitação,
   * Profissional Solicitante, Nome/CNS/CPF do Cidadão, Fase, Status da Fase.
   * @returns {Promise<string[]>} array com os textos dos labels
   */
  async getAdvancedFilterFields() {
    // Após expandir, os campos avançados ficam visíveis no formulário
    const labels = this.page.locator('form label:visible');
    return labels.allTextContents();
  }

  // ==================== Tabela ====================

  /**
   * Retorna os elementos das linhas da tabela (excluindo linhas expandidas).
   * @returns {Promise<import('playwright').Locator[]>} array de locators das linhas
   */
  async getTableRows() {
    await this.tableRows.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    return this.tableRows;
  }

  /**
   * Retorna a quantidade de linhas visíveis na tabela.
   * @returns {Promise<number>} número de linhas
   */
  async getTableRowCount() {
    await this.tableRows.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    return this.tableRows.count();
  }

  // ==================== Paginação ====================

  /** Navega para a próxima página da tabela. */
  async goToNextPage() {
    await this.btnProximaPagina.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Navega para a página anterior da tabela. */
  async goToPreviousPage() {
    await this.btnPaginaAnterior.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Navega para a primeira página da tabela. */
  async goToFirstPage() {
    await this.btnPrimeiraPagina.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Navega para a última página da tabela. */
  async goToLastPage() {
    await this.btnUltimaPagina.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ==================== Nova Solicitação ====================

  /** Clica no botão "Solicitar OCI" para abrir o modal de especialidades. */
  async clickNovaSolicitacao() {
    await this.btnNovaSolicitacao.click();
  }

  /**
   * Retorna as opções de especialidade exibidas no modal de seleção.
   * @returns {Promise<string[]>} array com os nomes das especialidades
   */
  async getEspecialidadesModal() {
    await this.modalEspecialidades.waitFor({ state: 'visible', timeout: 10000 });
    const cards = this.modalEspecialidades.locator('.especialidade-option h6');
    return cards.allTextContents();
  }

  /**
   * Seleciona uma especialidade no modal clicando no card correspondente.
   * @param {string} nome — texto (label) da especialidade a selecionar
   */
  async selectEspecialidadeModal(nome) {
    await this.modalEspecialidades.waitFor({ state: 'visible', timeout: 10000 });
    const card = this.modalEspecialidades.locator('.especialidade-option', { hasText: nome });
    await card.click();
  }

  // ==================== Expansão de Linhas ====================

  /**
   * Expande uma linha da tabela pelo índice (0-based).
   * Clica no botão/ícone de expansão da linha.
   * @param {number} index — índice da linha a expandir
   */
  async expandRow(index) {
    const row = this.tableRows.nth(index);
    // O botão de expandir geralmente é o primeiro td com ícone de seta
    const expandButton = row.locator('td:first-child button, td:first-child i, td:first-child [role="button"]').first();
    await expandButton.click();
  }

  /**
   * Retorna o conteúdo dos detalhes expandidos (PacienteExpandido).
   * @returns {Promise<string>} texto do conteúdo expandido
   */
  async getExpandedDetails() {
    await this.expandedRowContent.first().waitFor({ state: 'visible', timeout: 10000 });
    return this.expandedRowContent.first().textContent();
  }

  // ==================== Cancelamento ====================

  /**
   * Clica na ação de cancelar de uma solicitação pelo índice da linha.
   * O botão "Cancelar" está no dropdown de ações da ListTable.
   * @param {number} index — índice da linha
   */
  async clickCancelarSolicitacao(index) {
    const row = this.tableRows.nth(index);
    // Procura o botão/ícone de cancelar (ri-close-circle-line) na linha
    const cancelBtn = row.locator('[class*="ri-close-circle-line"]').first();
    await cancelBtn.click();
  }

  /**
   * Preenche o textarea de justificativa no modal de cancelamento.
   * @param {string} text — texto da justificativa
   */
  async fillJustificativaCancelamento(text) {
    await this.textareaJustificativa.waitFor({ state: 'visible', timeout: 10000 });
    await this.textareaJustificativa.fill(text);
  }

  /** Confirma o cancelamento clicando no botão de confirmar do modal. */
  async confirmCancelamento() {
    // O botão de confirmar é o que tem texto "Confirmar" dentro do modal de cancelamento
    const confirmBtn = this.modalCancelamento.locator('button').filter({ hasText: /Confirmar/i });
    await confirmBtn.click();
  }

  // ==================== Status ====================

  /**
   * Retorna o texto do status de uma solicitação pelo índice da linha.
   * A coluna de status é "Status da Fase" (st_fila) na tabela.
   * @param {number} index — índice da linha
   * @returns {Promise<string>} texto do status
   */
  async getStatusSolicitacao(index) {
    const row = this.tableRows.nth(index);
    // A coluna de status é a última coluna de dados antes das ações
    const statusCell = row.locator('td').last();
    return statusCell.textContent();
  }

  // ==================== Impressão ====================

  /**
   * Clica na ação de imprimir comprovante de uma solicitação pelo índice.
   * O botão de imprimir usa o ícone ri-printer-line.
   * @param {number} index — índice da linha
   */
  async clickImprimirComprovante(index) {
    const row = this.tableRows.nth(index);
    const printBtn = row.locator('[class*="ri-printer-line"]').first();
    await printBtn.click();
  }

  // ==================== Sidebar ====================

  /**
   * Verifica se o sidebar do módulo OCI está visível na página.
   * @returns {Promise<boolean>} true se o sidebar OCI está visível
   */
  async isSidebarOCIVisible() {
    return this.sidebarOCI.isVisible();
  }
}
