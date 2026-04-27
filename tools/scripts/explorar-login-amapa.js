// Script de exploração — Login no tenant do Amapá
// Guardian — Agente de Testes E2E
// Objetivo: Identificar o tenant do Amapá no combo, tentar logar e reportar resultado

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

async function explorarLoginAmapa() {
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // === ETAPA 1: Navegar para /login ===
    console.log('[explorar] Navegando para /login...');
    await page.goto(`${baseURL}/login`, { timeout: 60000, waitUntil: 'domcontentloaded' });
    // Aguardar um pouco para o React renderizar
    await page.waitForTimeout(3000);
    console.log(`[explorar] Página carregada. URL: ${page.url()}`);

    // === ETAPA 2: Listar opções do combo de município ===
    const municipioSelect = page.locator('#municipio-select');
    const comboVisivel = await municipioSelect.isVisible({ timeout: 5000 }).catch(() => false);

    if (!comboVisivel) {
      console.log('[explorar] ERRO: Combo de município NÃO está visível. Pode ser auto_selected=true.');
      await page.screenshot({ path: resolve(__dirname, '../../reports/screenshots/amapa-combo-nao-visivel.png') });
      return;
    }

    // Listar todas as opções
    const opcoes = await municipioSelect.locator('option').evaluateAll(
      opts => opts.map(o => ({ value: o.value, text: o.textContent.trim() }))
    );
    console.log('[explorar] Opções do combo de município:');
    opcoes.forEach((o, i) => console.log(`  [${i}] value="${o.value}" text="${o.text}"`));

    // Procurar opção do Amapá (ap_, amapa, macapa, etc.)
    const opcaoAmapa = opcoes.find(o =>
      o.value.toLowerCase().includes('ap_') ||
      o.text.toLowerCase().includes('amap') ||
      o.text.toLowerCase().includes('macap')
    );

    if (!opcaoAmapa) {
      console.log('[explorar] ERRO: Nenhuma opção do Amapá encontrada no combo!');
      console.log('[explorar] Procurei por: ap_, amap, macap');
      await page.screenshot({ path: resolve(__dirname, '../../reports/screenshots/amapa-opcao-nao-encontrada.png') });
      return;
    }

    console.log(`[explorar] Opção do Amapá encontrada: value="${opcaoAmapa.value}" text="${opcaoAmapa.text}"`);

    // === ETAPA 3: Selecionar Amapá ===
    await municipioSelect.selectOption(opcaoAmapa.value);
    await page.waitForTimeout(500);
    console.log('[explorar] Município do Amapá selecionado.');
    await page.screenshot({ path: resolve(__dirname, '../../reports/screenshots/amapa-municipio-selecionado.png') });

    // === ETAPA 4: Preencher credenciais e logar ===
    console.log(`[explorar] Preenchendo credenciais: ${username}`);
    await page.locator('#signin-username').fill(username);
    await page.locator('#signin-password').fill(password);
    await page.screenshot({ path: resolve(__dirname, '../../reports/screenshots/amapa-credenciais-preenchidas.png') });

    console.log('[explorar] Clicando no botão de login...');
    await page.locator('button[type="submit"].btn-login').click();

    // === ETAPA 5: Aguardar resultado ===
    await page.waitForTimeout(3000);

    // Verificar toast de erro
    const toastErro = page.locator('.Toastify__toast--error');
    const temToastErro = await toastErro.isVisible({ timeout: 5000 }).catch(() => false);

    if (temToastErro) {
      const textoErro = await toastErro.textContent().catch(() => 'texto não capturado');
      console.log(`[explorar] ❌ TOAST DE ERRO: "${textoErro}"`);
      await page.screenshot({ path: resolve(__dirname, '../../reports/screenshots/amapa-login-erro-toast.png') });
    }

    // Verificar se redirecionou (saiu do /login)
    const urlAtual = page.url();
    const aindaNoLogin = urlAtual.includes('/login');
    console.log(`[explorar] URL atual: ${urlAtual}`);

    if (aindaNoLogin) {
      console.log('[explorar] ❌ Login FALHOU — ainda na página de login.');
      // Capturar qualquer mensagem visível na tela
      const bodyText = await page.locator('body').textContent().catch(() => '');
      const toastTexts = await page.locator('.Toastify__toast').allTextContents().catch(() => []);
      console.log(`[explorar] Toasts visíveis: ${JSON.stringify(toastTexts)}`);
      await page.screenshot({ path: resolve(__dirname, '../../reports/screenshots/amapa-login-falhou.png') });
    } else {
      console.log('[explorar] ✅ Login aparentemente OK — redirecionou para outra página.');
      await page.screenshot({ path: resolve(__dirname, '../../reports/screenshots/amapa-login-sucesso.png') });

      // Tentar seguir o fluxo: seleção de grupo
      try {
        const cardPATE = page.locator('h4', { hasText: /PATE|Especializada/i });
        const pateVisivel = await cardPATE.isVisible({ timeout: 10000 }).catch(() => false);
        if (pateVisivel) {
          console.log('[explorar] Card PATE visível. Clicando...');
          await cardPATE.click();
          await page.waitForTimeout(2000);
          console.log(`[explorar] URL após PATE: ${page.url()}`);
          await page.screenshot({ path: resolve(__dirname, '../../reports/screenshots/amapa-pos-pate.png') });
        } else {
          const cardsVisiveis = await page.locator('h4').allTextContents().catch(() => []);
          console.log(`[explorar] Card PATE NÃO visível. Cards h4 encontrados: ${JSON.stringify(cardsVisiveis)}`);
          await page.screenshot({ path: resolve(__dirname, '../../reports/screenshots/amapa-sem-pate.png') });
        }
      } catch (e) {
        console.log(`[explorar] Erro ao navegar pós-login: ${e.message}`);
        await page.screenshot({ path: resolve(__dirname, '../../reports/screenshots/amapa-erro-pos-login.png') });
      }
    }

    // Capturar logs de console do navegador
    console.log('[explorar] Aguardando 5s para capturar estado final...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: resolve(__dirname, '../../reports/screenshots/amapa-estado-final.png') });
    console.log(`[explorar] URL final: ${page.url()}`);

  } catch (error) {
    console.error(`[explorar] ERRO FATAL: ${error.message}`);
    await page.screenshot({ path: resolve(__dirname, '../../reports/screenshots/amapa-erro-fatal.png') }).catch(() => {});
  } finally {
    console.log('[explorar] Encerrando navegador...');
    await browser.close();
  }
}

explorarLoginAmapa();
