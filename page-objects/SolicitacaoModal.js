// Page Object — Modal de Nova Solicitação OCI (FormModal)
// Guardian — Suíte E2E do módulo OCI
// Seletores extraídos de CadOCI.jsx (FormModal com react-hook-form e react-select)

/**
 * Encapsula a interação com o modal de Nova Solicitação OCI.
 * Campos: co_cnes_solicitante, id_linha_cuidado, co_pac, nu_cns_solicitante, co_cid, ds_justificativa
 */
export default class SolicitacaoModal {
  /**
   * @param {import('playwright').Page} page — instância da página do Playwright
   */
  constructor(page) {
    this.page = page;

    // Modal container
    this.modal = page.locator('.modal').filter({ hasText: 'Nova Solicitação' });

    // Campos react-select (data-field-name)
    this.campoLinhaCuidado = page.locator('[data-field-name="id_linha_cuidado"]');
    this.campoPaciente = page.locator('[data-field-name="co_pac"]');
    this.campoCID = page.locator('[data-field-name="co_cid"]');
    this.campoProfissional = page.locator('[data-field-name="nu_cns_solicitante"]');
    this.campoUnidade = page.locator('[data-field-name="co_cnes_solicitante"]');

    // Justificativa
    this.campoJustificativa = page.locator('textarea[name="ds_justificativa"]');

    // Botões
    this.btnCadastrarNovoPaciente = page.getByRole('button', { name: /Adicionar Cidadão/i });
    this.btnSalvar = this.modal.locator('button[type="submit"]');

    // Validação
    this.validationErrors = page.locator('.invalid-feedback');
  }

  /**
   * Verifica se o modal de solicitação está visível.
   * @returns {Promise<boolean>}
   */
  async isOpen() {
    const loading = this.page.locator('text=Carregando');
    await loading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    return this.modal.isVisible();
  }

  /**
   * Seleciona uma linha de cuidado pelo nome.
   * @param {string} nome
   */
  async selectLinhaCuidado(nome) {
    await this.campoLinhaCuidado.locator('.Select2__control').click();
    await this.page.keyboard.type(nome);
    await this.page.locator('.Select2__option', { hasText: nome }).first().click();
  }

  /**
   * Digita no campo de busca de paciente para acionar o autocomplete.
   * @param {string} query — texto a digitar (nome, CPF ou CNS)
   */
  async searchPaciente(query) {
    await this.campoPaciente.locator('.Select2__control').click();
    await this.page.keyboard.type(query);
    await this.page.waitForTimeout(500);
    await this.page.locator('.Select2__menu').first().waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Seleciona uma sugestão do autocomplete de paciente pelo índice.
   * @param {number} index
   */
  async selectPacienteSugestao(index) {
    await this.page.locator('.Select2__menu .Select2__option').nth(index).click();
  }

  /**
   * Retorna o texto do paciente selecionado no campo co_pac.
   * @returns {Promise<string>}
   */
  async getPacienteSelecionado() {
    const singleValue = this.campoPaciente.locator('.Select2__single-value');
    const isVisible = await singleValue.isVisible().catch(() => false);
    return isVisible ? singleValue.textContent() : '';
  }

  /**
   * Seleciona um CID pelo código ou texto.
   * @param {string} codigo
   */
  async selectCID(codigo) {
    await this.campoCID.locator('.Select2__control').click();
    await this.page.keyboard.type(codigo);
    await this.page.locator('.Select2__option', { hasText: codigo }).first().click();
  }

  /**
   * Preenche o campo de justificativa.
   * @param {string} texto
   */
  async fillJustificativa(texto) {
    await this.campoJustificativa.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoJustificativa.fill(texto);
  }

  /** Clica no botão "Salvar" para submeter o formulário. */
  async submit() {
    await this.btnSalvar.click();
  }

  /**
   * Retorna as mensagens de erro de validação.
   * @returns {Promise<string[]>}
   */
  async getValidationErrors() {
    await this.page.waitForTimeout(300);
    const errors = this.modal.locator('.invalid-feedback');
    const count = await errors.count();
    return count === 0 ? [] : errors.allTextContents();
  }

  /** Clica no botão "Adicionar Cidadão" para abrir o modal de cadastro de paciente. */
  async clickCadastrarNovoPaciente() {
    await this.btnCadastrarNovoPaciente.click();
  }
}
