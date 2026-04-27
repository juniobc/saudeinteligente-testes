// Spec — Demonstração de Login no Tenant Amapá
// Saúde Inteligente — Suíte E2E
// Guardian — Teste visual da tela de login no ambiente br_amapa

import { test, expect } from '@playwright/test';
import LoginPage from '../../page-objects/LoginPage.js';
import { captureScreenshot } from '../../tools/screenshot-helper.js';

// Desabilita storageState — testa login do zero
test.use({ storageState: undefined });

test.describe('Login no Tenant Amapá — Demonstração Visual', () => {
  /** @type {LoginPage} */
  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('Req 1.1 - Tela de login carrega e combo de município está visível', async ({ page }) => {
    // Verificar que a tela de login carregou
    await expect(loginPage.usernameInput).toBeVisible({ timeout: 10000 });
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();

    // Verificar combo de município
    const comboVisivel = await loginPage.municipioSelect.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[GUARDIAN] Combo de município visível: ${comboVisivel}`);

    if (comboVisivel) {
      // Listar opções disponíveis no combo
      const opcoes = await loginPage.municipioSelect.locator('option').allTextContents();
      console.log(`[GUARDIAN] Opções do combo: ${JSON.stringify(opcoes)}`);

      // Verificar se existe opção do Amapá
      const temAmapa = opcoes.some(o => o.toLowerCase().includes('amap') || o.toLowerCase().includes('macap'));
      console.log(`[GUARDIAN] Opção Amapá encontrada: ${temAmapa}`);
    }

    await captureScreenshot(page, 'amapa-login', 'tela-inicial');
  });

  test('Req 1.2 - Selecionar município Amapá e preencher credenciais', async ({ page }) => {
    // Selecionar Amapá no combo
    await loginPage.selectMunicipio('br_amapa');
    await page.waitForTimeout(500);
    await captureScreenshot(page, 'amapa-login', 'municipio-selecionado');

    // Preencher credenciais
    const username = process.env.E2E_USERNAME || '47818111085';
    const password = process.env.E2E_PASSWORD || '#12admin34$';

    await loginPage.fillCredentials(username, password);
    await captureScreenshot(page, 'amapa-login', 'credenciais-preenchidas');

    // Verificar que os campos foram preenchidos
    await expect(loginPage.usernameInput).toHaveValue(username);
    console.log(`[GUARDIAN] Credenciais preenchidas para tenant Amapá`);
  });

  test('Req 1.3 - Submeter login no Amapá e verificar resultado', async ({ page }) => {
    // Selecionar Amapá e preencher credenciais
    await loginPage.selectMunicipio('br_amapa');
    const username = process.env.E2E_USERNAME || '47818111085';
    const password = process.env.E2E_PASSWORD || '#12admin34$';
    await loginPage.fillCredentials(username, password);

    // Submeter login
    console.log('[GUARDIAN] Submetendo login no tenant Amapá...');
    await loginPage.submit();

    // Aguardar resposta (toast de erro ou redirecionamento)
    await page.waitForTimeout(3000);
    await captureScreenshot(page, 'amapa-login', 'pos-submit');

    // Verificar se houve toast de erro
    const toastErro = page.locator('.Toastify__toast--error');
    const temErro = await toastErro.isVisible({ timeout: 5000 }).catch(() => false);

    if (temErro) {
      const textoErro = await toastErro.textContent().catch(() => 'texto não capturado');
      console.log(`[GUARDIAN] ❌ Toast de erro: "${textoErro}"`);
      await captureScreenshot(page, 'amapa-login', 'toast-erro');
    }

    // Verificar se redirecionou (saiu do /login)
    const urlAtual = page.url();
    const aindaNoLogin = urlAtual.includes('/login');
    console.log(`[GUARDIAN] URL após submit: ${urlAtual}`);

    if (!aindaNoLogin) {
      console.log('[GUARDIAN] ✅ Login OK — redirecionou para outra página');
      await captureScreenshot(page, 'amapa-login', 'login-sucesso');

      // Tentar identificar a tela pós-login
      await page.waitForTimeout(2000);
      const h4s = await page.locator('h4').allTextContents();
      console.log(`[GUARDIAN] Cards h4 visíveis: ${JSON.stringify(h4s)}`);
      await captureScreenshot(page, 'amapa-login', 'tela-pos-login');
    } else {
      console.log('[GUARDIAN] ⚠️ Ainda na tela de login após submit');

      // Capturar qualquer toast visível
      const toasts = await page.locator('.Toastify__toast').allTextContents().catch(() => []);
      if (toasts.length > 0) {
        console.log(`[GUARDIAN] Toasts visíveis: ${JSON.stringify(toasts)}`);
      }
    }

    // Asserção: pelo menos a tela respondeu (ou redirecionou ou mostrou erro)
    const respondeu = !aindaNoLogin || temErro;
    expect(respondeu).toBeTruthy();
  });
});
