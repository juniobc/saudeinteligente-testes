// Spec — Demonstração de Login no Saúde Inteligente
// Teste simples para verificar que o sistema está acessível e o login funciona

import { test, expect } from '@playwright/test';

// Desabilita storageState para testar login do zero
test.use({ storageState: undefined });

test.describe('Demo Login — Saúde Inteligente', () => {

  test('Login completo com navegação até módulo OCI', async ({ page }) => {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
    const username = process.env.E2E_USERNAME || 'usuario_teste';
    const password = process.env.E2E_PASSWORD || 'senha_teste';
    const municipio = process.env.E2E_MUNICIPIO || 'go_luziania';

    // 1. Navegar para a página de login
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('networkidle');
    console.log('✅ Página de login carregada');

    // 2. Selecionar município (se combo visível)
    const municipioSelect = page.locator('#municipio-select');
    if (await municipioSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      try {
        await municipioSelect.selectOption(municipio);
      } catch {
        // fallback: seleciona segunda opção
        const options = await municipioSelect.locator('option').evaluateAll(
          opts => opts.map(o => o.value)
        );
        if (options.length > 1) await municipioSelect.selectOption(options[1]);
      }
      console.log(`✅ Município selecionado: ${municipio}`);
    }

    // 3. Preencher credenciais
    await page.locator('#signin-username').fill(username);
    await page.locator('#signin-password').fill(password);
    console.log(`✅ Credenciais preenchidas (usuário: ${username})`);

    // 4. Clicar no botão de login
    await page.locator('button[type="submit"].btn-login').click();
    console.log('✅ Botão de login clicado');

    // 5. Aguardar redirecionamento (sair da página de login)
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 20000,
    });
    console.log(`✅ Login realizado! URL: ${page.url()}`);

    // 6. Verificar que saiu da tela de login
    expect(page.url()).not.toContain('/login');

    // 7. Selecionar grupo PATE
    const cardPATE = page.locator('h4', { hasText: /PATE|Especializada/i });
    await cardPATE.waitFor({ state: 'visible', timeout: 10000 });
    await cardPATE.click();
    console.log('✅ Grupo PATE selecionado');

    // 8. Selecionar sistema OCI
    await page.waitForURL(/\/sistemas/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const cardOCI = page.locator('.card-link', { hasText: /Ofertas de Cuidados|OCI/i }).first();
    await cardOCI.waitFor({ state: 'visible', timeout: 10000 });
    await cardOCI.click();
    console.log('✅ Sistema OCI selecionado');

    // 9. Aguardar módulo OCI carregar
    await page.waitForURL(/\/oci\//, { timeout: 15000 });
    console.log(`✅ Módulo OCI carregado! URL final: ${page.url()}`);

    // 10. Verificação final
    expect(page.url()).toContain('/oci/');
    console.log('🎉 Teste de login completo com sucesso!');
  });

});
