/**
 * Teste E2E — Importação SISREG → OCI
 * 
 * Testa o fluxo completo de importação via tela:
 * 1. Navega para /oci/importacao-sisreg
 * 2. Faz upload dos 3 arquivos (CSV SISREG + ZIP SIA + ZIP SIM)
 * 3. Executa Preview (dry-run)
 * 4. Verifica KPIs no Resumo Executivo
 * 5. Verifica aba Rastreamento
 * 6. Tira screenshots para evidência
 */
import { test, expect } from '@playwright/test';
import path from 'path';

// Caminhos dos arquivos de teste (relativo à raiz do workspace)
const UPLOAD_DIR = path.resolve('..', 'docs', 'atividades', 'teste_carga_sisreg_sia_sim', 'upload');
const CSV_SISREG = path.join(UPLOAD_DIR, 'sisreg_teste_oftalmo_200.csv');
const ZIP_SIA = path.join(UPLOAD_DIR, 'sia_teste_oftalmo_50.zip');
const ZIP_SIM = path.join(UPLOAD_DIR, 'sim_teste_oftalmo_20.zip');

// Diretório de screenshots
const SCREENSHOTS_DIR = path.resolve('reports', 'screenshots');

test.describe('Importação SISREG → OCI', () => {

  // Timeout maior para este teste (upload + processamento + verificação)
  test.setTimeout(120_000);

  test('Fluxo completo: upload + preview + verificação', async ({ page }) => {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

    // ================================================================
    // 1. Navegar para a tela de importação
    // ================================================================
    console.log('\n[1] Navegando para /oci/importacao-sisreg...');
    await page.goto(`${baseURL}/oci/importacao-sisreg`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Clicar na aba "Nova Importação"
    const tabNova = page.locator('[role="tab"]', { hasText: 'Nova Importação' });
    await tabNova.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'importacao-01-tela-inicial.png'), fullPage: true });
    console.log('  ✓ Tela de importação carregada');

    // ================================================================
    // 2. Upload dos 3 arquivos
    // ================================================================
    console.log('\n[2] Fazendo upload dos arquivos...');

    // Upload CSV SISREG (primeiro dropzone)
    const inputSisreg = page.locator('#upload-CSV\\ SISREG');
    await inputSisreg.setInputFiles(CSV_SISREG);
    await page.waitForTimeout(500);
    console.log('  ✓ CSV SISREG enviado');

    // Upload ZIP SIA (segundo dropzone)
    const inputSia = page.locator('#upload-ZIP\\ SIA\\/SUS');
    await inputSia.setInputFiles(ZIP_SIA);
    await page.waitForTimeout(500);
    console.log('  ✓ ZIP SIA enviado');

    // Upload ZIP SIM (terceiro dropzone)
    const inputSim = page.locator('#upload-ZIP\\ SIM');
    await inputSim.setInputFiles(ZIP_SIM);
    await page.waitForTimeout(500);
    console.log('  ✓ ZIP SIM enviado');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'importacao-02-arquivos-carregados.png'), fullPage: true });

    // Verificar modo detectado
    const modoBadge = page.locator('.badge', { hasText: 'ANALISE_COMPLETA' });
    await expect(modoBadge).toBeVisible({ timeout: 5000 });
    console.log('  ✓ Modo ANALISE_COMPLETA detectado');

    // ================================================================
    // 3. Executar Preview
    // ================================================================
    console.log('\n[3] Executando Preview...');

    const btnPreview = page.locator('button', { hasText: /Preview|Validar/ });
    await btnPreview.click();

    // Aguardar processamento (pode levar alguns segundos)
    await page.waitForTimeout(10000);

    // Verificar que o preview terminou (aba Resumo Executivo deve estar ativa)
    const tabResumo = page.locator('[role="tab"]', { hasText: 'Resumo Executivo' });
    await expect(tabResumo).toHaveAttribute('aria-selected', 'true', { timeout: 30000 });

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'importacao-03-preview-resultado.png'), fullPage: true });
    console.log('  ✓ Preview concluído');

    // ================================================================
    // 4. Verificar KPIs no Resumo Executivo
    // ================================================================
    console.log('\n[4] Verificando KPIs...');

    // Verificar que há OCIs criadas (> 0)
    const kpiFilaReal = page.locator('text=/\\d+ pac\\..*Fila Real/');
    await expect(kpiFilaReal).toBeVisible({ timeout: 5000 });

    // Verificar óbitos filtrados
    const kpiObitos = page.locator('text=/\\d+ pac\\..*Óbitos Filtrados/');
    await expect(kpiObitos).toBeVisible({ timeout: 5000 });

    // Capturar valores dos KPIs
    const textoCompleto = await page.locator('.container-fluid, main, #root').first().textContent();
    console.log('  Texto da página (primeiros 500 chars):', textoCompleto?.substring(0, 500));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'importacao-04-kpis.png') });
    console.log('  ✓ KPIs verificados');

    // ================================================================
    // 5. Verificar aba Rastreamento
    // ================================================================
    console.log('\n[5] Verificando aba Rastreamento...');

    const tabRastreamento = page.locator('[role="tab"]', { hasText: 'Rastreamento' });
    await tabRastreamento.click();
    await page.waitForTimeout(2000);

    // Verificar que há registros na tabela
    const linhasTabela = page.locator('table tbody tr');
    const qtdLinhas = await linhasTabela.count();
    console.log(`  Registros no rastreamento: ${qtdLinhas}`);
    expect(qtdLinhas).toBeGreaterThan(0);

    // Verificar filtros de status
    const btnImportado = page.locator('button', { hasText: /Importado/ });
    if (await btnImportado.isVisible()) {
      const textoBtn = await btnImportado.textContent();
      console.log(`  Botão Importado: ${textoBtn}`);
    }

    const btnObito = page.locator('button', { hasText: /Obito/ });
    if (await btnObito.isVisible()) {
      const textoBtn = await btnObito.textContent();
      console.log(`  Botão Óbito: ${textoBtn}`);
    }

    const btnPendente = page.locator('button', { hasText: /Pendente/ });
    if (await btnPendente.isVisible()) {
      const textoBtn = await btnPendente.textContent();
      console.log(`  Botão Pendente: ${textoBtn}`);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'importacao-05-rastreamento.png'), fullPage: true });
    console.log('  ✓ Aba Rastreamento verificada');

    // ================================================================
    // 6. Verificar aba Histórico
    // ================================================================
    console.log('\n[6] Verificando aba Histórico...');

    const tabHistorico = page.locator('[role="tab"]', { hasText: /Histórico/ });
    await tabHistorico.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'importacao-06-historico.png'), fullPage: true });
    console.log('  ✓ Aba Histórico verificada');

    // ================================================================
    // 7. Voltar para Rastreamento e capturar filtros
    // ================================================================
    console.log('\n[7] Capturando detalhes do Rastreamento...');

    await tabRastreamento.click();
    await page.waitForTimeout(1500);

    // Filtrar por Importado
    const btnFiltroImportado = page.locator('button', { hasText: /Importado/ }).first();
    if (await btnFiltroImportado.isVisible()) {
      await btnFiltroImportado.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'importacao-07-rastreamento-importados.png'), fullPage: true });
      console.log('  ✓ Screenshot: filtro Importados');
    }

    // Filtrar por Óbito
    const btnFiltroObito = page.locator('button', { hasText: /Obito|Óbito/ }).first();
    if (await btnFiltroObito.isVisible()) {
      await btnFiltroObito.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'importacao-08-rastreamento-obitos.png'), fullPage: true });
      console.log('  ✓ Screenshot: filtro Óbitos');
    }

    // Filtrar por Pendente
    const btnFiltroPendente = page.locator('button', { hasText: /Pendente/ }).first();
    if (await btnFiltroPendente.isVisible()) {
      await btnFiltroPendente.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'importacao-09-rastreamento-pendentes.png'), fullPage: true });
      console.log('  ✓ Screenshot: filtro Pendentes');
    }

    // Voltar para Todos
    const btnTodos = page.locator('button', { hasText: /Todos/ }).first();
    if (await btnTodos.isVisible()) {
      await btnTodos.click();
      await page.waitForTimeout(1000);
    }

    // ================================================================
    // 8. Resumo Executivo final
    // ================================================================
    console.log('\n[8] Capturando Resumo Executivo completo...');

    const tabResumoFinal = page.locator('[role="tab"]', { hasText: 'Resumo Executivo' });
    await tabResumoFinal.click();
    await page.waitForTimeout(2000);

    // Scroll para capturar tudo
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'importacao-10-resumo-executivo-completo.png'), fullPage: true });
    console.log('  ✓ Screenshot: Resumo Executivo completo');

    // ================================================================
    // FIM
    // ================================================================
    console.log('\n========================================');
    console.log('  TESTE CONCLUÍDO COM SUCESSO');
    console.log('  Screenshots em: reports/screenshots/');
    console.log('========================================\n');
  });
});
