// Teste de Login — Verificação de Acesso
// Guardian — Agente de Testes E2E do Saúde Inteligente
//
// Objetivo: Validar que a tela de login está acessível e que as credenciais
// configuradas no .env autenticam corretamente no sistema.
//
// IMPORTANTE: Usa storageState: undefined para NÃO reaproveitar sessão anterior.

import { test, expect } from '@playwright/test';
import LoginPage from '../../page-objects/LoginPage.js';

// Sobrescreve storageState para testar login do zero
test.use({ storageState: undefined });

test.describe('Login — Verificação de Acesso', () => {

  test('Req 1.1 - Tela de login está acessível e renderiza corretamente', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Verifica que estamos na rota /login
    expect(page.url()).toContain('/login');

    // Verifica que os campos essenciais estão visíveis
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();

    // Verifica que o combo de município está visível
    await expect(loginPage.municipioSelect).toBeVisible();

    console.log('✅ Tela de login renderizada com todos os campos visíveis.');
  });

  test('Req 1.2 - Login com credenciais válidas redireciona para seleção de sistema', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Seleciona município configurado no .env
    const municipio = process.env.E2E_MUNICIPIO || 'br_distrito_federal';
    await loginPage.selectMunicipio(municipio);
    console.log(`📍 Município selecionado: ${municipio}`);

    // Preenche credenciais do .env
    const username = process.env.E2E_USERNAME || '47818111085';
    const password = process.env.E2E_PASSWORD || '#12admin34$';
    await loginPage.fillCredentials(username, password);
    console.log(`👤 Usuário preenchido: ${username}`);

    // Submete o formulário
    await loginPage.submit();
    console.log('🔑 Formulário submetido, aguardando redirecionamento...');

    // Aguarda sair da tela de login (redirecionamento pós-autenticação)
    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), {
        timeout: 20000,
      });
      const urlFinal = page.url();
      console.log(`✅ Login bem-sucedido! Redirecionado para: ${urlFinal}`);

      // Verifica que não estamos mais no /login
      expect(urlFinal).not.toContain('/login');
    } catch (error) {
      // Se não redirecionou, verifica se há toast de erro
      const hasError = await loginPage.errorToast.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasError) {
        const errorMsg = await loginPage.errorToast.textContent();
        console.log(`❌ Toast de erro exibido: ${errorMsg}`);
        throw new Error(`Login falhou com erro: ${errorMsg}`);
      }
      // Captura screenshot para diagnóstico
      await page.screenshot({ path: 'reports/screenshots/login-falha-redirecionamento.png' });
      throw new Error(`Login não redirecionou em 20s. URL atual: ${page.url()}`);
    }
  });

  test('Req 1.3 - Login com credenciais inválidas exibe mensagem de erro', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Seleciona município
    const municipio = process.env.E2E_MUNICIPIO || 'br_distrito_federal';
    await loginPage.selectMunicipio(municipio);

    // Preenche credenciais inválidas
    await loginPage.fillCredentials('usuario_invalido_xyz', 'senha_errada_123');
    await loginPage.submit();
    console.log('🔑 Submetido com credenciais inválidas...');

    // Aguarda toast de erro OU permanência na tela de login
    const hasError = await loginPage.errorToast.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasError) {
      const errorMsg = await loginPage.errorToast.textContent();
      console.log(`✅ Erro exibido corretamente: ${errorMsg}`);
      expect(errorMsg).toBeTruthy();
    } else {
      // Se não exibiu toast, verifica que ainda está no login (não autenticou)
      await page.waitForTimeout(3000);
      const stillOnLogin = page.url().includes('/login');
      console.log(`✅ Sem toast, mas permaneceu no login: ${stillOnLogin}`);
      expect(stillOnLogin).toBe(true);
    }
  });

});
