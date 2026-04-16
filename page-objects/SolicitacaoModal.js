// Page Object — Modal de Nova Solicitação OCI (FormModal)
// Saúde Inteligente — Suíte E2E do módulo OCI

/**
 * Encapsula a interação com o modal de Nova Solicitação OCI.
 * O formulário é renderizado dentro de um FormModal (react-bootstrap Modal)
 * e utiliza react-hook-form com componentes Select (react-select) e TextArea.
 *
 * Campos do formulário (CadOCI.jsx):
 * - co_cnes_solicitante: Unidade Responsável (Select)
 * - id_linha_cuidado: Linha de Cuidado (Select com useAutocomplete)
 * - co_pac: Cidadão Usuário (Select com fetchOptions — busca assíncrona)
 * - dt_solicitacao: Data da Solicitação (Input date, readOnly)
 * - nu_cns_solicitante: Profissional Solicitante (Select com useAutocomplete)
 * - co_cid: CID 10 (Select com useAutocomplete, depende da linha de cuidado)
 * - ds_justificativa: Justificativa do Procedimento (TextArea, obrigatório, maxLength 1000)
 */
export default class SolicitacaoModal {
  /**
   * @param {import('playwright').Page} page — instância da página do Playwright
   */
  constructor(page) {
    this.page = page;

    // --- Modal container (FormModal renderiza um Modal do react-bootstrap) ---
    // O título contém "Nova Solicitação" quando é criação
    this.modal = page.locator('.modal').filter({ hasText: 'Nova Solicitação' });

    // --- Campos do formulário (react-select com classNamePrefix="Select2") ---
    // Cada Select gera um div com data-field-name="<nome_do_campo>"
    this.campoLinhaCuidado = page.locator('[data-field-name="id_linha_cuidado"]');
    this.campoPaciente = page.locator('[data-field-name="co_pac"]');
    this.campoCID = page.locator('[data-field-name="co_cid"]');
    this.campoProfissional = page.locator('[data-field-name="nu_cns_solicitante"]');
    this.campoUnidade = page.locator('[data-field-name="co_cnes_solicitante"]');

    // Campo de justificativa (TextArea com name="ds_justificativa")
    this.campoJustificativa = page.locator('textarea[name="ds_justificativa"]');

    // Botão "Adicionar Cidadão" (ButtonAction com label)
    this.btnCadastrarNovoPaciente = page.getByRole('button', { name: /Adicionar Cidadão/i });

    // Botão de salvar do FormModal (button type="submit" com texto "Salvar")
    this.btnSalvar = this.modal.locator('button[type="submit"]');

    // Mensagens de validação (react-hook-form gera .invalid-feedback)
    this.validationErrors = page.locator('.invalid-feedback');
  }

  // ==================== Estado do Modal ====================

  /**
   * Verifica se o modal de solicitação está visível.
   * @returns {Promise<boolean>} true se o modal está aberto
   */
  async isOpen() {
    // Aguarda o loading desaparecer antes de verificar
    const loading = this.page.locator('text=Carregando');
    await loading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    return this.modal.isVisible();
  }

  // ==================== Especialidade ====================

  /**
   * Retorna o valor pré-preenchido do campo de especialidade (co_grupo).
   * O campo co_grupo é passado via defaultValues ao FormModal e não é
   * exibido como campo editável no formulário de nova solicitação.
   * Verificamos o título do modal que contém o nome da especialidade.
   * @returns {Promise<string>} texto da especialidade no título do modal
   */
  async getEspecialidadePreenchida() {
    const titulo = this.modal.locator('.modal-title');
    const textoTitulo = await titulo.textContent();
    // O título segue o padrão "Nova Solicitação - <Especialidade>"
    const match = textoTitulo.match(/Nova Solicitação\s*-\s*(.+)/);
    return match ? match[1].trim() : textoTitulo.trim();
  }

  // ==================== Linha de Cuidado ====================

  /**
   * Retorna as opções disponíveis no select de Linha de Cuidado.
   * Abre o menu do react-select e coleta os textos das opções.
   * @returns {Promise<string[]>} array com os labels das opções
   */
  async getLinhasCuidadoDisponiveis() {
    // Clicar no react-select para abrir o menu de opções
    await this.campoLinhaCuidado.locator('.Select2__control').click();
    // Aguardar o menu aparecer
    await this.page.locator('.Select2__menu').first().waitFor({ state: 'visible', timeout: 5000 });
    // Coletar textos das opções
    const options = this.page.locator('.Select2__menu .Select2__option');
    const textos = await options.allTextContents();
    // Fechar o menu pressionando Escape
    await this.page.keyboard.press('Escape');
    return textos;
  }

  /**
   * Seleciona uma linha de cuidado pelo nome.
   * Usa o padrão click + type + selecionar opção do react-select.
   * @param {string} nome — texto da linha de cuidado a selecionar
   */
  async selectLinhaCuidado(nome) {
    await this.campoLinhaCuidado.locator('.Select2__control').click();
    await this.page.keyboard.type(nome);
    await this.page.locator('.Select2__option', { hasText: nome }).first().click();
  }

  // ==================== Paciente (Autocomplete assíncrono) ====================

  /**
   * Digita no campo de busca de paciente (co_pac) para acionar o autocomplete.
   * O campo usa fetchOptions para busca assíncrona com debounce de 300ms.
   * @param {string} query — texto a digitar (nome, CPF ou CNS)
   */
  async searchPaciente(query) {
    await this.campoPaciente.locator('.Select2__control').click();
    await this.page.keyboard.type(query);
    // Aguardar o debounce (300ms) e o carregamento das opções
    await this.page.waitForTimeout(500);
    await this.page.locator('.Select2__menu').first().waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Seleciona uma sugestão do autocomplete de paciente pelo índice (0-based).
   * @param {number} index — índice da sugestão a selecionar
   */
  async selectPacienteSugestao(index) {
    const opcoes = this.page.locator('.Select2__menu .Select2__option');
    await opcoes.nth(index).click();
  }

  /**
   * Retorna o texto do paciente atualmente selecionado no campo co_pac.
   * @returns {Promise<string>} texto do paciente selecionado ou string vazia
   */
  async getPacienteSelecionado() {
    const singleValue = this.campoPaciente.locator('.Select2__single-value');
    const isVisible = await singleValue.isVisible().catch(() => false);
    if (isVisible) {
      return singleValue.textContent();
    }
    return '';
  }

  // ==================== CID 10 ====================

  /**
   * Retorna as opções de CID disponíveis (filtradas pela linha de cuidado).
   * @returns {Promise<string[]>} array com os labels dos CIDs
   */
  async getCIDsDisponiveis() {
    await this.campoCID.locator('.Select2__control').click();
    await this.page.locator('.Select2__menu').first().waitFor({ state: 'visible', timeout: 5000 });
    const options = this.page.locator('.Select2__menu .Select2__option');
    const textos = await options.allTextContents();
    await this.page.keyboard.press('Escape');
    return textos;
  }

  /**
   * Seleciona um CID pelo código ou texto.
   * @param {string} codigo — código ou texto do CID a selecionar
   */
  async selectCID(codigo) {
    await this.campoCID.locator('.Select2__control').click();
    await this.page.keyboard.type(codigo);
    await this.page.locator('.Select2__option', { hasText: codigo }).first().click();
  }

  // ==================== Prioridade ====================

  /**
   * Seleciona uma prioridade no campo co_prioridade.
   * Nota: No formulário atual de CadOCI.jsx, o campo de prioridade não está
   * presente como campo editável. Este método é mantido por compatibilidade
   * com o design e pode ser usado se o campo for adicionado futuramente.
   * @param {string} valor — valor ou texto da prioridade a selecionar
   */
  async selectPrioridade(valor) {
    const campoPrioridade = this.page.locator('[data-field-name="co_prioridade"]');
    const isVisible = await campoPrioridade.isVisible().catch(() => false);
    if (isVisible) {
      await campoPrioridade.locator('.Select2__control').click();
      await this.page.keyboard.type(valor);
      await this.page.locator('.Select2__option', { hasText: valor }).first().click();
    }
  }

  // ==================== Justificativa ====================

  /**
   * Preenche o campo de justificativa do procedimento (ds_justificativa).
   * @param {string} texto — texto da justificativa (máximo 1000 caracteres)
   */
  async fillJustificativa(texto) {
    await this.campoJustificativa.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoJustificativa.fill(texto);
  }

  // ==================== Submissão ====================

  /**
   * Clica no botão "Salvar" do FormModal para submeter o formulário.
   */
  async submit() {
    await this.btnSalvar.click();
  }

  // ==================== Validação ====================

  /**
   * Retorna as mensagens de erro de validação exibidas no formulário.
   * react-hook-form renderiza erros em elementos .invalid-feedback.
   * @returns {Promise<string[]>} array com os textos das mensagens de erro
   */
  async getValidationErrors() {
    // Aguardar um breve momento para os erros serem renderizados
    await this.page.waitForTimeout(300);
    const errors = this.modal.locator('.invalid-feedback');
    const count = await errors.count();
    if (count === 0) return [];
    return errors.allTextContents();
  }

  // ==================== Cadastro de Paciente ====================

  /**
   * Clica no botão "Adicionar Cidadão" para abrir o modal de cadastro de paciente.
   */
  async clickCadastrarNovoPaciente() {
    await this.btnCadastrarNovoPaciente.click();
  }
}
