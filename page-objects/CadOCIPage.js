// Page Object — Tela principal de Consulta/Cadastro OCI
// Guardian — Suíte E2E do módulo OCI
// Seletores extraídos de CadOCI.jsx, ListTable.jsx, FilterSection.jsx, SimpleModal.jsx

import { expect } from '@playwright/test';

/**
 * Encapsula a interação com a tela de Consulta/Cadastro de OCI (CadOCI).
 * Acesso via menu lateral: Gestão de OCIs > Consultar ou Cadastrar OCI.
 * Rota: /oci/dashboard/consulta_cadastro
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
    this.btnFiltrosAvancados = page.getByText('Filtros Avançados');
    this.btnBuscar = page.locator('button[type="submit"]');

    // --- Tabela (ListTable) ---
    this.tableRows = page.locator('table tbody tr:not(.expanded-row)');
    this.expandedRowContent = page.locator('.expanded-row, [class*="expandido"], [class*="PacienteExpandido"]');

    // --- Paginação ---
    this.btnPrimeiraPagina = page.locator('[aria-label="Primeira página"]');
    this.btnPaginaAnterior = page.locator('[aria-label="Página anterior"]');
    this.btnProximaPagina = page.locator('[aria-label="Próxima página"]');
    this.btnUltimaPagina = page.locator('[aria-label="Última página"]');

    // --- Botão "Solicitar OCI" ---
    this.btnNovaSolicitacao = page.getByText('Solicitar OCI');

    // --- Modal de Especialidades ---
    this.modalEspecialidades = page.locator('.modal').filter({ hasText: 'Selecione a Especialidade' });
    this.especialidadeCards = this.modalEspecialidades.locator('.especialidade-option');

    // --- Modal de Cancelamento ---
    this.modalCancelamento = page.locator('.modal').filter({ hasText: 'Justificativa do Cancelamento' });
    this.textareaJustificativa = page.locator('#justificativa');
    this.btnConfirmarCancelamento = this.modalCancelamento.locator('button', { hasText: 'Confirmar' });
  }

  // ==================== Navegação ====================

  /** Navega para a tela de Consulta/Cadastro OCI via URL direta. */
  async goto() {
    await this.page.goto('/oci/dashboard/consulta_cadastro');
    await this.page.waitForLoadState('networkidle');
  }

  // ==================== Filtros ====================

  /**
   * Retorna os labels dos filtros visíveis.
   * @returns {Promise<string[]>}
   */
  async getVisibleFilters() {
    return this.page.locator('form label:visible').allTextContents();
  }

  /** Submete a busca clicando no botão de buscar. */
  async submitSearch() {
    await this.btnBuscar.first().click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Alterna o switch "Ver somente minhas Solicitações". */
  async toggleMinhasSolicitacoes() {
    await this.switchMinhasSolicitacoes.click();
  }

  /** Expande a seção de filtros avançados. */
  async expandAdvancedFilters() {
    await this.btnFiltrosAvancados.click();
  }

  // ==================== Tabela ====================

  /**
   * Retorna a quantidade de linhas visíveis na tabela.
   * @returns {Promise<number>}
   */
  async getTableRowCount() {
    await this.tableRows.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    return this.tableRows.count();
  }

  // ==================== Paginação ====================

  async goToNextPage() {
    await this.btnProximaPagina.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToPreviousPage() {
    await this.btnPaginaAnterior.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToFirstPage() {
    await this.btnPrimeiraPagina.click();
    await this.page.waitForLoadState('networkidle');
  }

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
   * Retorna os nomes das especialidades no modal.
   * @returns {Promise<string[]>}
   */
  async getEspecialidadesModal() {
    await this.modalEspecialidades.waitFor({ state: 'visible', timeout: 10000 });
    return this.modalEspecialidades.locator('.especialidade-option h6').allTextContents();
  }

  /**
   * Seleciona uma especialidade no modal.
   * @param {string} nome — texto da especialidade
   */
  async selectEspecialidadeModal(nome) {
    await this.modalEspecialidades.waitFor({ state: 'visible', timeout: 10000 });
    await this.modalEspecialidades.locator('.especialidade-option', { hasText: nome }).click();
  }

  // ==================== Expansão de Linhas ====================

  /**
   * Expande uma linha da tabela pelo índice (0-based).
   * @param {number} index
   */
  async expandRow(index) {
    const row = this.tableRows.nth(index);
    await row.locator('td:first-child button, td:first-child i, td:first-child [role="button"]').first().click();
  }

  /**
   * Retorna o conteúdo dos detalhes expandidos.
   * @returns {Promise<string>}
   */
  async getExpandedDetails() {
    await this.expandedRowContent.first().waitFor({ state: 'visible', timeout: 10000 });
    return this.expandedRowContent.first().textContent();
  }

  // ==================== Cancelamento ====================

  /**
   * Clica no ícone de cancelar de uma solicitação pelo índice.
   * @param {number} index
   */
  async clickCancelarSolicitacao(index) {
    const row = this.tableRows.nth(index);
    await row.locator('[class*="ri-close-circle-line"]').first().click();
  }

  /**
   * Preenche a justificativa no modal de cancelamento.
   * @param {string} text
   */
  async fillJustificativaCancelamento(text) {
    await this.textareaJustificativa.waitFor({ state: 'visible', timeout: 10000 });
    await this.textareaJustificativa.fill(text);
  }

  /** Confirma o cancelamento. */
  async confirmCancelamento() {
    await this.modalCancelamento.locator('button').filter({ hasText: /Confirmar/i }).click();
  }

  // ==================== Impressão ====================

  /**
   * Clica no ícone de imprimir de uma solicitação pelo índice.
   * @param {number} index
   */
  async clickImprimirComprovante(index) {
    const row = this.tableRows.nth(index);
    await row.locator('[class*="ri-printer-line"]').first().click();
  }
}
