// Page Object — Modal de Cadastro de Paciente (Novo Usuário Cidadão)
// Guardian — Suíte E2E do módulo OCI
// Seletores extraídos de CadastroPacienteModal.jsx (FormDadosPessoais + FormResidencia)

import { expect } from '@playwright/test';

/**
 * Encapsula a interação com o modal de Cadastro de Paciente.
 * FormModal com título "Novo Usuário Cidadão" usando react-hook-form.
 *
 * Dados pessoais: nu_cns, no_pac, dt_nasc, no_sexo, nu_cpf, no_mae
 * Residência: endereco.nr_cep (auto-fill), endereco.cd_logr, endereco.cd_bairro, endereco.cd_estado, endereco.cd_cidade
 */
export default class CadastroPacienteModal {
  /**
   * @param {import('playwright').Page} page — instância da página do Playwright
   */
  constructor(page) {
    this.page = page;

    // Modal container
    this.modal = page.locator('.modal').filter({ hasText: 'Novo Usuário Cidadão' });

    // Dados pessoais (inputs com name)
    this.campoNome = page.locator('[name="no_pac"]');
    this.campoDataNascimento = page.locator('[name="dt_nasc"]');
    this.campoCPF = page.locator('[name="nu_cpf"]');
    this.campoCNS = page.locator('[name="nu_cns"]');
    this.campoNomeMae = page.locator('[name="no_mae"]');

    // Dados pessoais (select com data-field-name)
    this.campoSexo = page.locator('[data-field-name="no_sexo"]');

    // Residência (input)
    this.campoCEP = page.locator('[name="endereco.nr_cep"]');

    // Residência (selects preenchidos via auto-fill do CEP)
    this.campoLogradouro = page.locator('[data-field-name="endereco.cd_logr"]');
    this.campoBairro = page.locator('[data-field-name="endereco.cd_bairro"]');
    this.campoUF = page.locator('[data-field-name="endereco.cd_estado"]');
    this.campoMunicipio = page.locator('[data-field-name="endereco.cd_cidade"]');

    // Botão salvar e validação
    this.btnSalvar = this.modal.locator('button[type="submit"]');
    this.validationErrors = this.modal.locator('.invalid-feedback');
  }

  /**
   * Verifica se o modal está visível.
   * @returns {Promise<boolean>}
   */
  async isOpen() {
    return this.modal.isVisible();
  }

  // ==================== Dados Pessoais ====================

  /**
   * Preenche o campo Nome Completo.
   * @param {string} nome
   */
  async fillNome(nome) {
    await this.campoNome.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoNome.fill(nome);
  }

  /**
   * Preenche o campo Data de Nascimento.
   * @param {string} data — formato aceito pelo input date
   */
  async fillDataNascimento(data) {
    await this.campoDataNascimento.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoDataNascimento.fill(data);
  }

  /**
   * Seleciona o sexo no campo Select.
   * @param {string} sexo — ex: "Masculino", "Feminino"
   */
  async selectSexo(sexo) {
    await this.campoSexo.locator('.Select2__control').click();
    await this.page.keyboard.type(sexo);
    await this.page.locator('.Select2__option', { hasText: sexo }).first().click();
  }

  /**
   * Preenche o campo CPF (com máscara 000.000.000-00).
   * @param {string} cpf
   */
  async fillCPF(cpf) {
    await this.campoCPF.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoCPF.fill(cpf);
  }

  /**
   * Preenche o campo CNS (15 dígitos).
   * @param {string} cns
   */
  async fillCNS(cns) {
    await this.campoCNS.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoCNS.fill(cns);
  }

  /**
   * Preenche o campo Nome da Mãe.
   * @param {string} nome
   */
  async fillNomeMae(nome) {
    await this.campoNomeMae.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoNomeMae.fill(nome);
  }

  // ==================== Residência ====================

  /**
   * Preenche o CEP e aguarda o auto-fill dos campos de endereço.
   * @param {string} cep — ex: "68900-073"
   */
  async fillCEP(cep) {
    await this.campoCEP.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoCEP.fill(cep);
    // Aguarda resposta da API de CEP que preenche logradouro, bairro, UF, município
    await this.page.waitForTimeout(3000);
  }

  /**
   * Retorna os dados de endereço preenchidos automaticamente pela API de CEP.
   * @returns {Promise<{uf: string, municipio: string, bairro: string, logradouro: string}>}
   */
  async getEnderecoPreenchido() {
    const getSelectValue = async (locator) => {
      const singleValue = locator.locator('.Select2__single-value');
      const isVisible = await singleValue.isVisible().catch(() => false);
      return isVisible ? singleValue.textContent() : '';
    };

    return {
      uf: await getSelectValue(this.campoUF),
      municipio: await getSelectValue(this.campoMunicipio),
      bairro: await getSelectValue(this.campoBairro),
      logradouro: await getSelectValue(this.campoLogradouro),
    };
  }

  // ==================== Submissão ====================

  /** Clica no botão "Salvar" para submeter o formulário. */
  async submit() {
    await this.btnSalvar.click();
  }

  // ==================== Validação ====================

  /**
   * Retorna as mensagens de erro de validação.
   * @returns {Promise<string[]>}
   */
  async getValidationErrors() {
    await this.page.waitForTimeout(300);
    const count = await this.validationErrors.count();
    return count === 0 ? [] : this.validationErrors.allTextContents();
  }

  /**
   * Verifica se o modal foi fechado.
   * @returns {Promise<boolean>}
   */
  async isClosed() {
    await this.modal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    return !(await this.modal.isVisible());
  }
}
