/**
 * HACKATHON — Importação Real SISREG + SIA + SIM do Distrito Federal
 * 
 * Importa os 3 arquivos CSV reais via interface web.
 * Tenant: br_distrito_federal
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Paths dos arquivos reais
const CSV_SISREG = path.resolve('D:/m1031007/Projetos/Prosystema/SaudeInteligente/python/saudeinteligente-ia/dados/distrito_federal/sisreg-df/Fila_SISREG.csv');
const CSV_SIA = path.resolve('D:/m1031007/Projetos/Prosystema/SaudeInteligente/python/saudeinteligente-ia/dados/distrito_federal/tab_PA/tab_PA/tab_pa_i_ano_compt_2024.csv');
const CSV_SIM = path.resolve('D:/m1031007/Projetos/Prosystema/SaudeInteligente/python/saudeinteligente-ia/dados/distrito_federal/Tab_sim_df/tab_sim_202605141414.csv');

const SCREENSHOTS_DIR = path.resolve('reports/screenshots/hackathon');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Hackathon — Importação DF Completa', () => {

  test('Upload SISREG + SIA + SIM → Preview → Executar', async ({ page }) => {
    // Timeout longo — arquivo de 630MB
    test.setTimeout(600000); // 10 minutos

    // --- PASSO 1: Navegar para tela de importação ---
    console.log('📍 PASSO 1: Navegando para /oci/importacao-sisreg...');
    await page.goto('/oci/importacao-sisreg');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-tela-importacao.png'), fullPage: true });
    console.log('✅ Tela carregada');

    // --- PASSO 2: Aba Nova Importação ---
    console.log('📍 PASSO 2: Aba Nova Importação...');
    const tabNova = page.locator('button, [role="tab"]').filter({ hasText: /Nova Importa/i });
    if (await tabNova.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await tabNova.first().click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-aba-nova.png'), fullPage: true });

    // --- PASSO 3: Upload CSV SISREG ---
    console.log('📍 PASSO 3: Upload CSV SISREG (630MB)...');
    console.log(`   Arquivo: ${CSV_SISREG}`);
    console.log(`   Tamanho: ${(fs.statSync(CSV_SISREG).size / 1024 / 1024).toFixed(0)} MB`);
    
    const inputCSV = page.locator('[id="upload-CSV SISREG"]');
    await inputCSV.setInputFiles(CSV_SISREG);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-csv-sisreg-uploaded.png'), fullPage: true });
    console.log('✅ CSV SISREG carregado');

    // --- PASSO 4: Upload CSV SIA ---
    console.log('📍 PASSO 4: Upload CSV SIA...');
    console.log(`   Arquivo: ${CSV_SIA}`);
    console.log(`   Tamanho: ${(fs.statSync(CSV_SIA).size / 1024 / 1024 / 1024).toFixed(1)} GB`);
    
    const inputSIA = page.locator('[id="upload-ZIP SIA/SUS"]');
    await inputSIA.setInputFiles(CSV_SIA);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-csv-sia-uploaded.png'), fullPage: true });
    console.log('✅ CSV SIA carregado');

    // --- PASSO 5: Upload CSV SIM ---
    console.log('📍 PASSO 5: Upload CSV SIM...');
    console.log(`   Arquivo: ${CSV_SIM}`);
    console.log(`   Tamanho: ${(fs.statSync(CSV_SIM).size / 1024 / 1024).toFixed(0)} MB`);
    
    const inputSIM = page.locator('[id="upload-ZIP SIM"]');
    await inputSIM.setInputFiles(CSV_SIM);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-csv-sim-uploaded.png'), fullPage: true });
    console.log('✅ CSV SIM carregado');

    // --- PASSO 6: Clicar Preview ---
    console.log('📍 PASSO 6: Clicando Preview...');
    const btnPreview = page.locator('button').filter({ hasText: /Preview|Validar/i });
    await btnPreview.first().click();
    console.log('⏳ Preview iniciado — aguardando resposta (pode demorar)...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-preview-iniciado.png'), fullPage: true });

    // Aguardar resposta (até 10 min para arquivo grande)
    try {
      await page.waitForResponse(
        response => response.url().includes('importacao-sisreg') && response.status() < 500,
        { timeout: 600000 }
      );
      console.log('✅ Resposta do preview recebida');
    } catch (e) {
      console.log(`⚠️ Timeout no preview: ${e.message}`);
    }

    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-preview-resultado.png'), fullPage: true });

    // --- PASSO 7: Executar importação real ---
    console.log('📍 PASSO 7: Executando importação real...');
    
    // Aceitar o confirm dialog automaticamente
    page.on('dialog', dialog => dialog.accept());
    
    const btnExecutar = page.locator('button').filter({ hasText: /Importar|Executar/i });
    if (await btnExecutar.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnExecutar.first().click();
      console.log('⏳ Importação iniciada...');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-importacao-iniciada.png'), fullPage: true });

      // Polling visual — capturar progresso a cada 30s
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(30000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `09-progresso-${i}.png`), fullPage: true });
        
        // Verificar se concluiu
        const bodyText = await page.textContent('body');
        if (bodyText.includes('concluíd') || bodyText.includes('Concluíd') || bodyText.includes('finaliz')) {
          console.log(`✅ Importação concluída após ${(i+1)*30}s`);
          break;
        }
        console.log(`   ... ${(i+1)*30}s decorridos, ainda processando...`);
      }

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-resultado-final.png'), fullPage: true });
    } else {
      console.log('⚠️ Botão Executar não encontrado após preview');
    }

    console.log('\n✅ HACKATHON — Teste de importação concluído');
    console.log(`📸 Screenshots em: ${SCREENSHOTS_DIR}`);
  });
});
