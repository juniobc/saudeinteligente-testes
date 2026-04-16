// Page Object — Menu de Seleção de Sistemas
// Saúde Inteligente — Suíte E2E do módulo OCI

import { expect } from '@playwright/test';

/**
 * Encapsula a interação com a página de seleção de sistemas.
 * Seletores extraídos diretamente de MenuSistemas.jsx.
 *
 * A rota pode ser /sistemas (com state fromSelection) ou /select-sistemas.
 * Cada sistema é renderizado como um div.card-link contendo um h5.card-title com o nome.
 */
export default class MenuSistemasPage {
  /**
   * @param {import('playwright').Page} page — instância da página do Playwright
   */
  constructor(page) {
    this.page = page;

    // Localizadores baseados nos seletores reais de MenuSistemas.jsx
    // O nome do sistema OCI no card é "Ofertas de Cuidados Integrados"
    this.cardOCI = page.locator('.card-link', { hasText: /Ofertas de Cuidados|OCI/i });
    this.cardTitles = page.locator('.card-title');
  }

  /**
   * Clica no card do sistema OCI e aguarda a navegação para /oci/.
   * Após o clique, o componente navega para /${sistema.slug}/dashboard → /oci/dashboard.
   */
  async selectSistemaOCI() {
    await this.cardOCI.click();
    await this.page.waitForURL(/\/oci\//, { timeout: 15000 });
  }

  /**
   * Verifica se o navegador está na página de menu de sistemas.
   * Aceita tanto /sistemas quanto /select-sistemas como rotas válidas.
   * @returns {Promise<boolean>} true se a URL contém '/sistemas' ou '/select-sistemas'
   */
  async isOnMenuSistemas() {
    const url = this.page.url();
    return url.includes('/sistemas') || url.includes('/select-sistemas');
  }

  /**
   * Retorna a lista de nomes dos sistemas disponíveis na tela.
   * Extrai o texto de todos os elementos h5.card-title visíveis.
   * @returns {Promise<string[]>} array com os nomes dos sistemas exibidos
   */
  async getAvailableSistemas() {
    await this.cardTitles.first().waitFor({ state: 'visible', timeout: 10000 });
    return this.cardTitles.allTextContents();
  }
}
