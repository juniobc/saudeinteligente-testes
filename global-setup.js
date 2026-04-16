// Setup global — realiza autenticação e salva estado para reutilização nos testes
// Guardian — Projeto independente de testes E2E do Saúde Inteligente
// Fluxo completo: login → seleção de município → seleção de grupo PATE → seleção de sistema OCI
// Referência: knowledge/core/flows.md (fluxo auth-global-setup)

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { chromium } from 'playwright';

// Carrega variáveis de ambiente do .env na raiz do projeto
// Necessário pois global-setup roda antes do playwright.config.js
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

// Caminho do diretório de autenticação (relativo à raiz do projeto)
const AUTH_DIR = resolve(__dirname, '.auth');
const STORAGE_STATE_PATH = resolve(AUTH_DIR, 'storage-state.json');
const LOGIN_DEBUG_SCREENSHOT = resolve(AUTH_DIR, 'login-debug.png');

/**
 * Executa o fluxo completo de autenticação e persiste cookies/storage em arquivo JSON.
 * Todos os specs reutilizam esse estado autenticado, evitando repetir o fluxo de login.
 *
 * Fluxo conforme knowledge/core/flows.md:
 * 1. login-completo: navega para /login, seleciona município, preenche credenciais
 * 2. selecao-grupo-pate: clica no card PATE em /select-sistemas
 * 3. selecao-sistema: clica no card OCI em /sistemas
 * 4. Salva storageState em .auth/storage-state.json
 *
 * @param {import('@playwright/test').FullConfig} _config - Configuração do Playwright (não utilizada diretamente)
 */
async function globalSetup(_config) {
  // Garante que o diretório .auth/ existe antes de salvar arquivos
  mkdirSync(AUTH_DIR, { recursive: true });

  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
  const isHeadless = process.env.E2E_HEADLESS === 'true';
  const slowMo = parseInt(process.env.E2E_SLOW_MO || '300', 10);

  // Lança navegador Chromium com configurações do ambiente
  const browser = await chromium.launch({
    headless: isHeadless,
    slowMo: isHeadless ? 0 : slowMo,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // ========================================
    // ETAPA 1: Login completo (knowledge/core/flows.md → login-completo)
    // ========================================

    // Navega para a página de login
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('networkidle');

    // Seleciona o município se o combo estiver visível (auto_selected = false)
    const municipioSelect = page.locator('#municipio-select');
    if (await municipioSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      const optionValues = await municipioSelect.locator('option').evaluateAll(
        opts => opts.map(o => ({ value: o.value, text: o.textContent }))
      );
      console.log('[global-setup] Opções do município:', JSON.stringify(optionValues));

      const municipio = process.env.E2E_MUNICIPIO || 'go_luziania';

      // Tenta selecionar por value (tenant_schema)
      try {
        await municipioSelect.selectOption(municipio);
      } catch {
        // Se falhar por value, tenta por label parcial
        const match = optionValues.find(o =>
          o.value.includes(municipio) || o.text.toLowerCase().includes(municipio.toLowerCase())
        );
        if (match) {
          await municipioSelect.selectOption(match.value);
        } else {
          // Último recurso: seleciona a segunda opção (primeira é "Selecione...")
          if (optionValues.length > 1) {
            await municipioSelect.selectOption(optionValues[1].value);
          }
        }
      }
      await page.waitForTimeout(500);
    }

    // Preenche credenciais direto do process.env (dotenv já carregou o .env)
    const username = process.env.E2E_USERNAME || 'usuario_teste';
    const password = process.env.E2E_PASSWORD || 'senha_teste';
    console.log(`[global-setup] Logando com usuário: ${username}`);

    await page.locator('#signin-username').fill(username);
    await page.locator('#signin-password').fill(password);

    // Submete o formulário de login
    await page.locator('button[type="submit"].btn-login').click();

    // Aguarda o backend processar a autenticação
    await page.waitForTimeout(2000);

    // Aguarda redirecionamento pós-login (URL não contém /login) — timeout: 20s
    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), {
        timeout: 20000,
      });
    } catch (error) {
      // Captura screenshot de debug em .auth/ para diagnóstico
      await page.screenshot({ path: LOGIN_DEBUG_SCREENSHOT });
      const currentUrl = page.url();
      const toastError = await page.locator('.Toastify__toast--error').textContent().catch(() => 'nenhum toast de erro visível');
      const pageContent = await page.locator('body').textContent().catch(() => '');

      throw new Error(
        `[global-setup] Login falhou — redirecionamento não ocorreu.\n` +
        `URL atual: ${currentUrl}\n` +
        `Toast de erro: ${toastError}\n` +
        `Screenshot de debug: ${LOGIN_DEBUG_SCREENSHOT}\n` +
        `Conteúdo visível (500 chars): ${pageContent.substring(0, 500)}\n` +
        `Erro original: ${error.message}`
      );
    }

    // ========================================
    // ETAPA 2: Seleção do grupo PATE (knowledge/core/flows.md → selecao-grupo-pate)
    // ========================================

    console.log('[global-setup] Login OK. Navegando para seleção de grupo...');

    // Aguarda a animação de ~3s do SelectSistemas e os cards aparecerem
    // O card PATE contém "PATE" ou "Especializada" no título
    const cardPATE = page.locator('h4', { hasText: /PATE|Especializada/i });
    try {
      await cardPATE.waitFor({ state: 'visible', timeout: 10000 });
      await cardPATE.click();
    } catch (error) {
      await page.screenshot({ path: LOGIN_DEBUG_SCREENSHOT });
      const currentUrl = page.url();
      const cardsVisiveis = await page.locator('h4').allTextContents().catch(() => []);

      throw new Error(
        `[global-setup] Seleção do grupo PATE falhou — card não encontrado.\n` +
        `URL atual: ${currentUrl}\n` +
        `Cards visíveis: ${JSON.stringify(cardsVisiveis)}\n` +
        `Screenshot de debug: ${LOGIN_DEBUG_SCREENSHOT}\n` +
        `Erro original: ${error.message}`
      );
    }

    // ========================================
    // ETAPA 3: Seleção do sistema OCI (knowledge/core/flows.md → selecao-sistema)
    // ========================================

    // Aguarda navegar para /sistemas e os cards de sistema carregarem
    await page.waitForURL(/\/sistemas/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    // Aguarda os cards renderizarem (podem ter animação)
    await page.waitForTimeout(2000);

    // Debug: captura os cards visíveis na tela
    const cardTexts = await page.locator('.card-link').allTextContents().catch(() => []);
    console.log('[global-setup] Cards visíveis em /sistemas:', JSON.stringify(cardTexts));

    // Clica no card do sistema OCI ("Ofertas de Cuidados Integrados")
    const cardOCI = page.locator('.card-link', { hasText: /Ofertas de Cuidados|OCI/i }).first();
    try {
      await cardOCI.waitFor({ state: 'visible', timeout: 10000 });
      await cardOCI.click();
    } catch (error) {
      await page.screenshot({ path: LOGIN_DEBUG_SCREENSHOT });
      const currentUrl = page.url();

      throw new Error(
        `[global-setup] Seleção do sistema OCI falhou — card não encontrado.\n` +
        `URL atual: ${currentUrl}\n` +
        `Cards visíveis: ${JSON.stringify(cardTexts)}\n` +
        `Screenshot de debug: ${LOGIN_DEBUG_SCREENSHOT}\n` +
        `Erro original: ${error.message}`
      );
    }

    // Aguarda chegar no módulo OCI
    try {
      await page.waitForURL(/\/oci\//, { timeout: 15000 });
    } catch (error) {
      await page.screenshot({ path: LOGIN_DEBUG_SCREENSHOT });
      const currentUrl = page.url();

      throw new Error(
        `[global-setup] Navegação para módulo OCI falhou — URL esperada contendo /oci/.\n` +
        `URL atual: ${currentUrl}\n` +
        `Screenshot de debug: ${LOGIN_DEBUG_SCREENSHOT}\n` +
        `Erro original: ${error.message}`
      );
    }

    console.log(`[global-setup] URL final: ${page.url()}`);

    // ========================================
    // ETAPA 4: Salva estado de autenticação
    // ========================================

    // Persiste cookies e storage para reutilização em todos os specs
    await context.storageState({ path: STORAGE_STATE_PATH });
    console.log(`[global-setup] Estado de autenticação salvo em: ${STORAGE_STATE_PATH}`);

  } catch (error) {
    // Tenta capturar screenshot final em caso de erro não tratado nas etapas
    await page.screenshot({ path: LOGIN_DEBUG_SCREENSHOT }).catch(() => {});
    // Re-lança o erro para que o Playwright reporte a falha
    throw error;
  } finally {
    // Encerra navegador independente de sucesso ou falha
    await browser.close();
  }
}

export default globalSetup;
