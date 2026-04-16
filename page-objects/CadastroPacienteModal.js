// Page Object — Modal de Cadastro de Paciente (Novo Usuário Cidadão)
// Saúde Inteligente — Suíte E2E do módulo OCI

import { expect } from '@playwright/test';

/**
 * Encapsula a interação com o modal de Cadastro de Paciente.
 * O formulário é renderizado dentro de um FormModal (react-bootstrap Modal)
 * com título "Novo Usuário Cidadão" e utiliza react-hook-form.
 *
 * Campos de dados pessoais (FormDadosPessoais.jsx):
 * - nu_cns: Número CNS (Input, mask 15 dígitos, obrigatório)
 * - no_pac: Nome Completo (Input, obrigatório)
 * - dt_nasc: Data de Nascimento (Input type="date", obrigatório)
 * - no_sexo: Sexo (Select, obrigatório)
 * - nu_cpf: CPF (Input, mask 000.000.000-00, obrigatório)
 * - no_mae: Nome da Mãe (Input, obrigatório)
 *
 * Campos de residência (FormResidencia.jsx):
 * - endereco.nr_cep: CEP (Input, mask 00000-000, obrigatório, auto-fill ao completar)
 * - endereco.cd_logr: Logradouro (Select autocomplete)
 * - endereco.cd_bairro: Bairro (Select autocomplete)
 * - endereco.cd_estado: UF (Select)
 * - endereco.cd_cidade: Município (Select autocomplete)
 */
export default class CadastroPacienteModal {
  /**
   * @param {import('playwright').Page} page — instância da página do Playwright
   */
  constructor(page) {
    this.page = page;

    // --- Modal container (FormModal renderiza um Modal do react-bootstrap) ---
    // O título é "Novo Usuário Cidadão" para criação de paciente
    this.modal = page.locator('.modal').filter({ hasText: 'Novo Usuário Cidadão' });

    // --- Campos de dados pessoais (Input com atributo name) ---
    this.campoNome = page.locator('[name="no_pac"]');
    this.campoDataNascimento = page.locator('[name="dt_nasc"]');
    this.campoCPF = page.locator('[name="nu_cpf"]');
    this.campoCNS = page.locator('[name="nu_cns"]');
    this.campoNomeMae = page.locator('[name="no_mae"]');

    // --- Campos de dados pessoais (Select com data-field-name) ---
    this.campoSexo = page.locator('[data-field-name="no_sexo"]');

    // --- Campos de residência (Input com atributo name) ---
    this.campoCEP = page.locator('[name="endereco.nr_cep"]');

    // --- Campos de residência (Select com data-field-name) — preenchidos via auto-fill do CEP ---
    this.campoLogradouro = page.locator('[data-field-name="endereco.cd_logr"]');
    this.campoBairro = page.locator('[data-field-name="endereco.cd_bairro"]');
    this.campoUF = page.locator('[data-field-name="endereco.cd_estado"]');
    this.campoMunicipio = page.locator('[data-field-name="endereco.cd_cidade"]');

    // --- Botão de salvar do FormModal (button type="submit" com texto "Salvar") ---
    this.btnSalvar = this.modal.locator('button[type="submit"]');

    // --- Mensagens de validação (react-hook-form gera .invalid-feedback) ---
    this.validationErrors = this.modal.locator('.invalid-feedback');
  }

  // ==================== Estado do Modal ====================

  /**
   * Verifica se o modal de cadastro de paciente está visível.
   * @returns {Promise<boolean>} true se o modal está aberto
   */
  async isOpen() {
    return this.modal.isVisible();
  }

  // ==================== Dados Pessoais ====================

  /**
   * Preenche o campo Nome Completo (no_pac).
   * @param {string} nome — nome completo do paciente
   */
  async fillNome(nome) {
    await this.campoNome.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoNome.fill(nome);
  }

  /**
   * Preenche o campo Data de Nascimento (dt_nasc).
   * O campo é do tipo date, então usamos .fill() com o valor no formato esperado.
   * @param {string} data — data de nascimento (formato aceito pelo input date)
   */
  async fillDataNascimento(data) {
    await this.campoDataNascimento.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoDataNascimento.fill(data);
  }

  /**
   * Seleciona o sexo no campo Select (no_sexo).
   * Usa o padrão click + type + selecionar opção do react-select.
   * @param {string} sexo — texto da opção de sexo a selecionar (ex: "Masculino")
   */
  async selectSexo(sexo) {
    await this.campoSexo.locator('.Select2__control').click();
    await this.page.keyboard.type(sexo);
    await this.page.locator('.Select2__option', { hasText: sexo }).first().click();
  }

  /**
   * Preenche o campo CPF (nu_cpf).
   * O campo possui máscara 000.000.000-00.
   * @param {string} cpf — CPF do paciente (com ou sem máscara)
   */
  async fillCPF(cpf) {
    await this.campoCPF.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoCPF.fill(cpf);
  }

  /**
   * Preenche o campo Número CNS (nu_cns).
   * O campo possui máscara de 15 dígitos.
   * @param {string} cns — número do CNS do paciente
   */
  async fillCNS(cns) {
    await this.campoCNS.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoCNS.fill(cns);
  }

  /**
   * Preenche o campo Nome da Mãe (no_mae).
   * @param {string} nome — nome da mãe do paciente
   */
  async fillNomeMae(nome) {
    await this.campoNomeMae.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoNomeMae.fill(nome);
  }

  // ==================== Residência ====================

  /**
   * Preenche o campo CEP (endereco.nr_cep).
   * Quando o CEP atinge 9 caracteres (com máscara 00000-000), a aplicação
   * dispara automaticamente a consulta à API de CEP (getEnderecoCEP) e
   * preenche os campos de logradouro, bairro e UF.
   * Aguardamos a resposta da API para garantir o auto-preenchimento.
   * @param {string} cep — CEP do paciente (ex: "68900-073")
   */
  async fillCEP(cep) {
    await this.campoCEP.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoCEP.fill(cep);
    // Aguardar a resposta da API de CEP que preenche os campos de endereço
    // A consulta é disparada quando o CEP tem 9 caracteres (com máscara)
    await this.page.waitForTimeout(2000);
  }

  /**
   * Retorna os dados de endereço preenchidos automaticamente pela API de CEP.
   * Coleta os valores exibidos nos campos Select de UF, Município, Bairro e Logradouro.
   * @returns {Promise<{uf: string, municipio: string, bairro: string, logradouro: string}>}
   */
  async getEnderecoPreenchido() {
    // Os campos Select do react-select exibem o valor selecionado em .Select2__single-value
    const getSelectValue = async (locator) => {
      const singleValue = locator.locator('.Select2__single-value');
      const isVisible = await singleValue.isVisible().catch(() => false);
      if (isVisible) {
        return singleValue.textContent();
      }
      return '';
    };

    const uf = await getSelectValue(this.campoUF);
    const municipio = await getSelectValue(this.campoMunicipio);
    const bairro = await getSelectValue(this.campoBairro);
    const logradouro = await getSelectValue(this.campoLogradouro);

    return { uf, municipio, bairro, logradouro };
  }

  // ==================== Submissão ====================

  /**
   * Clica no botão "Salvar" do FormModal para submeter o formulário de paciente.
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
    const errors = this.validationErrors;
    const count = await errors.count();
    if (count === 0) return [];
    return errors.allTextContents();
  }

  // ==================== Fechamento ====================

  /**
   * Verifica se o modal de cadastro de paciente foi fechado.
   * @returns {Promise<boolean>} true se o modal não está mais visível
   */
  async isClosed() {
    await this.modal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    const isVisible = await this.modal.isVisible();
    return !isVisible;
  }
}
