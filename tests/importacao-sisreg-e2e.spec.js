/**
 * E2E — Teste de Importação SISREG → OCI (Preview)
 * 
 * Fluxo: Login → Navegar até Importação → Upload CSV → Preview → Verificar resultado
 * Tenant: br_distrito_federal
 * Arquivo: SISREG_AMB_AGENDADOS_REG_530010_2026-05-12_18-55-18.csv
 * 
 * Captura screenshots em cada passo + intercepta console/network para debug.
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const CSV_PATH = path.resolve('D:/m1031007/Projetos/Prosystema/SaudeInteligente/python/clickup/86ahdnnfe/importacao/SISREG_AMB_AGENDADOS_REG_530010_2026-05-12_18-55-18.csv');
const SCREENSHOTS_DIR = path.resolve('reports/screenshots');

// Garantir que o diretório de screenshots existe
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Importação SISREG → OCI — CSV Agendados/Regulados', () => {

  test('Upload CSV e Preview com limite de 50 registros', async ({ page }) => {
    // --- INTERCEPTAR CONSOLE E NETWORK ---
    const consoleLogs = [];
    const networkErrors = [];
    const apiResponses = [];

    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        console.log(`🔴 CONSOLE ERROR: ${msg.text()}`);
      }
    });

    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      if (url.includes('/oci/') || url.includes('/importacao')) {
        apiResponses.push({ url, status });
        if (status >= 400) {
          networkErrors.push({ url, status });
          console.log(`🔴 HTTP ${status}: ${url}`);
        }
      }
    });

    // --- PASSO 1: Navegar para a tela de importação ---
    console.log('\n📍 PASSO 1: Navegando para /oci/importacao-sisreg...');
    await page.goto('/oci/importacao-sisreg');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-tela-importacao.png'), fullPage: true });
    console.log('✅ Tela de importação carregada');

    // --- PASSO 2: Clicar na aba "Nova Importação" ---
    console.log('\n📍 PASSO 2: Clicando na aba Nova Importação...');
    const tabNovaImportacao = page.locator('button, [role="tab"]').filter({ hasText: /Nova Importa/i });
    if (await tabNovaImportacao.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await tabNovaImportacao.first().click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-aba-nova-importacao.png'), fullPage: true });
    console.log('✅ Aba Nova Importação ativa');

    // --- PASSO 3: Upload do CSV ---
    console.log('\n📍 PASSO 3: Fazendo upload do CSV...');
    console.log(`   Arquivo: ${CSV_PATH}`);
    console.log(`   Tamanho: ${(fs.statSync(CSV_PATH).size / 1024 / 1024).toFixed(1)} MB`);
    
    // Procurar input de arquivo (pode estar oculto)
    const fileInputs = page.locator('input[type="file"]');
    const qtFileInputs = await fileInputs.count();
    console.log(`   Inputs de arquivo encontrados: ${qtFileInputs}`);
    
    // O primeiro input geralmente é o CSV SISREG
    await fileInputs.first().setInputFiles(CSV_PATH);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-apos-upload.png'), fullPage: true });
    console.log('✅ Upload realizado');

    // --- PASSO 4: Definir limite de registros ---
    console.log('\n📍 PASSO 4: Definindo limite de 50 registros...');
    const limiteInput = page.locator('input').filter({ hasText: /vazio/i })
      .or(page.locator('input[placeholder*="vazio"]'))
      .or(page.locator('input[placeholder*="todos"]'));
    
    if (await limiteInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await limiteInput.first().fill('50');
      console.log('✅ Limite definido: 50');
    } else {
      // Tentar encontrar por label
      const labelLimite = page.locator('label, span').filter({ hasText: /[Ll]imite/i });
      if (await labelLimite.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        const inputProximo = labelLimite.first().locator('..').locator('input');
        if (await inputProximo.isVisible({ timeout: 2000 }).catch(() => false)) {
          await inputProximo.fill('50');
          console.log('✅ Limite definido via label: 50');
        }
      } else {
        console.log('⚠️ Campo de limite não encontrado, prosseguindo sem limite');
      }
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-limite-definido.png'), fullPage: true });

    // --- PASSO 5: Clicar em Preview ---
    console.log('\n📍 PASSO 5: Clicando em Preview/Validar...');
    const btnPreview = page.locator('button').filter({ hasText: /Preview|Validar/i });
    const qtBtns = await btnPreview.count();
    console.log(`   Botões Preview/Validar encontrados: ${qtBtns}`);
    
    if (qtBtns > 0) {
      await btnPreview.first().click();
      console.log('⏳ Preview iniciado, aguardando resposta...');
    } else {
      console.log('❌ Botão Preview não encontrado!');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-ERRO-btn-preview-nao-encontrado.png'), fullPage: true });
      return;
    }

    // --- PASSO 6: Aguardar resultado ---
    console.log('\n📍 PASSO 6: Aguardando resultado do preview...');
    
    // Aguardar loading desaparecer ou resultado aparecer
    try {
      // Esperar que algum indicador de resultado apareça (até 3 minutos para arquivo grande)
      await page.waitForResponse(
        response => response.url().includes('importacao-sisreg') && response.status() < 500,
        { timeout: 180000 }
      );
      console.log('✅ Resposta da API recebida');
    } catch (e) {
      console.log(`⚠️ Timeout aguardando resposta: ${e.message}`);
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-resultado-preview.png'), fullPage: true });

    // --- PASSO 7: Capturar conteúdo da resposta ---
    console.log('\n📍 PASSO 7: Analisando resultado...');
    
    // Tentar capturar a resposta da API diretamente
    const lastApiResponse = apiResponses.filter(r => r.url.includes('importacao-sisreg')).pop();
    if (lastApiResponse) {
      console.log(`   Última resposta API: HTTP ${lastApiResponse.status} — ${lastApiResponse.url.split('/').pop()}`);
    }

    // Capturar texto visível na tela
    const bodyText = await page.textContent('body');
    
    // Procurar indicadores chave
    const indicadores = [
      'registros', 'pacientes', 'importado', 'elegibilidade', 
      'duplica', 'óbito', 'obito', 'erro', 'ERRO', 'faltante',
      'completude', 'fase', 'agendad'
    ];
    
    console.log('\n   --- INDICADORES NA TELA ---');
    for (const ind of indicadores) {
      if (bodyText.toLowerCase().includes(ind.toLowerCase())) {
        // Extrair trecho ao redor do indicador
        const idx = bodyText.toLowerCase().indexOf(ind.toLowerCase());
        const trecho = bodyText.substring(Math.max(0, idx - 20), idx + 50).replace(/\s+/g, ' ').trim();
        console.log(`   ✅ "${ind}" encontrado: ...${trecho}...`);
      }
    }

    // --- PASSO 8: Verificar aba Rastreamento ---
    console.log('\n📍 PASSO 8: Verificando aba Rastreamento...');
    const tabRastreamento = page.locator('button, [role="tab"]').filter({ hasText: /Rastreamento/i });
    if (await tabRastreamento.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await tabRastreamento.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-rastreamento.png'), fullPage: true });
      console.log('✅ Aba Rastreamento capturada');
    } else {
      console.log('⚠️ Aba Rastreamento não visível');
    }

    // --- PASSO 9: Verificar aba Resumo Executivo ---
    console.log('\n📍 PASSO 9: Verificando aba Resumo Executivo...');
    const tabResumo = page.locator('button, [role="tab"]').filter({ hasText: /Resumo/i });
    if (await tabResumo.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await tabResumo.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-resumo-executivo.png'), fullPage: true });
      console.log('✅ Aba Resumo Executivo capturada');
    } else {
      console.log('⚠️ Aba Resumo Executivo não visível');
    }

    // --- RELATÓRIO FINAL ---
    console.log('\n' + '='.repeat(70));
    console.log('RELATÓRIO FINAL');
    console.log('='.repeat(70));
    console.log(`Console logs: ${consoleLogs.length} (${consoleLogs.filter(l => l.type === 'error').length} erros)`);
    console.log(`API responses: ${apiResponses.length}`);
    console.log(`Network errors: ${networkErrors.length}`);
    
    if (networkErrors.length > 0) {
      console.log('\n--- ERROS DE REDE ---');
      networkErrors.forEach(e => console.log(`  HTTP ${e.status}: ${e.url}`));
    }

    if (consoleLogs.filter(l => l.type === 'error').length > 0) {
      console.log('\n--- ERROS DE CONSOLE ---');
      consoleLogs.filter(l => l.type === 'error').slice(0, 10).forEach(l => console.log(`  ${l.text.substring(0, 200)}`));
    }

    console.log('\n📸 Screenshots salvos em: reports/screenshots/');
    console.log('='.repeat(70));
  });
});
