// Specs de Autenticação e Acesso — Módulo Core
// Saúde Inteligente — Testes E2E (Requisito 1)
// Este spec NÃO reutiliza storageState — testa o fluxo de login diretamente

import { test, expect } from '@playwright/test';
import LoginPage from '../../page-objects/LoginPage.js';
import MenuSistemasPage from '../../page-objects/MenuSistemasPage.js';
import { credentials, routes } from '../../fixtures/test-data.js';
import { getStorageToken } from '../../tools/helpers.js';
import { setupConsoleCapture } from '../../tools/console-capture.js';
import { captureScreenshot } from '../../tools/screenshot-helper.js';

// Desabilita storageState para testar autenticação do zero
test.use({ storageState: undefined });

test.describe('Autenticação e Acesso — Módulo Core', () => {
  /** @type {import('../../tools/console-capture.js').ConsoleCapture} */
  let consoleCapture;

  test.beforeEach(async ({ page }, testInfo) => {
    consoleCapture = setupConsoleCapture(page);
    await captureScreenshot(page, 'core-autenticacao', `${testInfo.title}-antes`);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await captureScreenshot(page, 'core-autenticacao', `${testInfo.title}-depois`);
    if (consoleCapture.hasConsoleErrors()) {
      const logs = consoleCapture.getConsoleLogs().filter((l) => l.type === 'error');
      console.warn(`[console_errors: true] ${testInfo.title} — ${logs.length} erro(s) JS:`, logs);
      testInfo.annotations.push({ type: 'console_errors', description: 'true' });
    }
    consoleCapture.clear();
  });

  /**
   * Req 1.1 — Login com credenciais válidas redireciona e armazena token no storage.
   * Verifica que após submeter credenciais válidas o usuário sai da página de login
   * e o token de autenticação é persistido no storage do navegador.
   */
  test('Req 1.1 - Login com credenciais válidas redireciona e armazena token', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navega para a página de login
    await loginPage.goto();

    // Preenche credenciais válidas e submete
    await loginPage.login(credentials.valid.username, credentials.valid.password);

    // Aguarda redirecionamento — não deve permanecer em /login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    // Verifica que o token foi armazenado no storage
    const token = await getStorageToken(page);
    expect(token).toBeTruthy();
  });

  /**
   * Req 1.2 — Seleção do sistema OCI navega para rota /oci/... e exibe sidebar OCI.
   * Após login, o usuário seleciona o sistema OCI no menu de sistemas e verifica
   * que a URL contém /oci/ e o sidebar do módulo OCI está visível.
   */
  test('Req 1.2 - Seleção do sistema OCI navega para /oci/ e exibe sidebar', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const menuSistemas = new MenuSistemasPage(page);

    // Realiza login para chegar ao menu de sistemas
    await loginPage.goto();
    await loginPage.login(credentials.valid.username, credentials.valid.password);

    // Aguarda chegar ao menu de sistemas
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    // Seleciona o sistema OCI
    await menuSistemas.selectSistemaOCI();

    // Verifica que a URL contém /oci/
    await expect(page).toHaveURL(/\/oci\//, { timeout: 15000 });

    // Verifica que o sidebar OCI está visível
    const sidebarVisible = page.locator('[class*="sidebar"], nav').filter({ hasText: 'OCI' });
    await expect(sidebarVisible).toBeVisible({ timeout: 10000 });
  });

  /**
   * Req 1.3 — Login com credenciais inválidas exibe mensagem de erro e permanece na página de login.
   * Verifica que credenciais inválidas geram um toast de erro, o usuário permanece
   * em /login e nenhum token é armazenado.
   */
  test('Req 1.3 - Login com credenciais inválidas exibe erro e permanece em /login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navega para a página de login
    await loginPage.goto();

    // Preenche credenciais inválidas e submete
    await loginPage.login(credentials.invalid.username, credentials.invalid.password);

    // Verifica que o toast de erro é exibido
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();

    // Verifica que permanece na página de login
    const stillOnLogin = await loginPage.isOnLoginPage();
    expect(stillOnLogin).toBe(true);

    // Verifica que nenhum token foi armazenado
    const token = await getStorageToken(page);
    expect(token).toBeFalsy();
  });

  /**
   * Req 1.4 — Acesso a rota OCI sem autenticação redireciona para login.
   * Verifica que acessar diretamente /oci/dashboard/cad_oci sem estar autenticado
   * resulta em redirecionamento para a página de login.
   */
  test('Req 1.4 - Acesso a rota OCI sem autenticação redireciona para /login', async ({ page }) => {
    // Tenta acessar rota protegida diretamente sem autenticação
    await page.goto(routes.cadOCI);

    // Verifica que foi redirecionado para a página de login
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });
});
