// Page Object — Página de Login
// Saúde Inteligente — Suíte E2E do módulo OCI

import { expect } from '@playwright/test';

/**
 * Encapsula a interação com a página de login do sistema.
 * Seletores extraídos diretamente de Login.jsx.
 */
export default class LoginPage {
  /**
   * @param {import('playwright').Page} page — instância da página do Playwright
   */
  constructor(page) {
    this.page = page;

    // Localizadores baseados nos IDs reais do Login.jsx
    this.usernameInput = page.locator('#signin-username');
    this.passwordInput = page.locator('#signin-password');
    this.submitButton = page.locator('button.btn-login');
    this.errorToast = page.locator('.Toastify__toast--error');
    this.municipioSelect = page.locator('#municipio-select');
  }

  /** Navega para a página de login e aguarda carregamento. */
  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Seleciona o município no combo, se visível.
   * @param {string} [municipio] — tenant_schema do município (padrão: E2E_MUNICIPIO ou go_luziania)
   */
  async selectMunicipio(municipio) {
    const valor = municipio || process.env.E2E_MUNICIPIO || 'go_luziania';
    if (await this.municipioSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.municipioSelect.selectOption(valor);
    }
  }

  /**
   * Preenche os campos de usuário e senha.
   * @param {string} username — nome de usuário
   * @param {string} password — senha
   */
  async fillCredentials(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
  }

  /** Clica no botão de login para submeter o formulário. */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Atalho: preenche credenciais e submete o formulário.
   * @param {string} username — nome de usuário
   * @param {string} password — senha
   */
  async login(username, password) {
    await this.selectMunicipio();
    await this.fillCredentials(username, password);
    await this.submit();
  }

  /**
   * Retorna o texto da mensagem de erro exibida via toast (react-toastify).
   * Aguarda o toast ficar visível antes de extrair o texto.
   * @returns {Promise<string>} texto do toast de erro
   */
  async getErrorMessage() {
    await this.errorToast.waitFor({ state: 'visible', timeout: 10000 });
    return this.errorToast.textContent();
  }

  /**
   * Verifica se o navegador está na página de login.
   * @returns {Promise<boolean>} true se a URL contém '/login'
   */
  async isOnLoginPage() {
    return this.page.url().includes('/login');
  }
}
