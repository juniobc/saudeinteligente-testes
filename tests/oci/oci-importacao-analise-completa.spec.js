/**
 * Análise completa — Importação SISREG → OCI
 * Captura screenshots detalhadas de todas as seções para relatório.
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const UPLOAD_DIR = path.resolve('..', 'docs', 'atividades', 'teste_carga_sisreg_sia_sim', 'upload');
const CSV_SISREG = path.join(UPLOAD_DIR, 'sisreg_teste_oftalmo_200.csv');
const ZIP_SIA = path.join(UPLOAD_DIR, 'sia_teste_oftalmo_50.zip');
const ZIP_SIM = path.join(UPLOAD_DIR, 'sim_teste_oftalmo_20.zip');
const SS = path.resolve('reports', 'screenshots', 'analise');

test.describe('Análise Completa', () => {
  test.setTimeout(180_000);

  test('Captura completa para relatório', async ({ page }) => {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

    // 1. Upload e Preview
    await page.goto(`${baseURL}/oci/importacao-sisreg`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.locator('[role="tab"]', { hasText: 'Nova Importação' }).click();
    await page.waitForTimeout(1000);

    await page.locator('#upload-CSV\\ SISREG').setInputFiles(CSV_SISREG);
    await page.waitForTimeout(500);
    await page.locator('#upload-ZIP\\ SIA\\/SUS').setInputFiles(ZIP_SIA);
    await page.waitForTimeout(500);
    await page.locator('#upload-ZIP\\ SIM').setInputFiles(ZIP_SIM);
    await page.waitForTimeout(500);

    await page.locator('button', { hasText: /Preview|Validar/ }).click();
    await page.waitForTimeout(15000);

    // 2. Resumo Executivo
    await page.locator('[role="tab"]', { hasText: 'Resumo Executivo' }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SS, '01-resumo-kpis.png'), fullPage: false });

    // Scroll para gráficos
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SS, '02-resumo-graficos.png'), fullPage: false });

    // Scroll para óbitos
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SS, '03-resumo-obitos.png'), fullPage: false });

    // Full page
    await page.screenshot({ path: path.join(SS, '04-resumo-completo.png'), fullPage: true });

    // 3. Rastreamento - Todos
    await page.locator('[role="tab"]', { hasText: 'Rastreamento' }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SS, '05-rastreamento-todos.png'), fullPage: false });

    // Capturar contagens dos filtros
    const filtros = await page.locator('.d-flex.flex-wrap.gap-2 button').allTextContents();
    console.log('\n=== FILTROS DE STATUS ===');
    filtros.forEach(f => console.log(`  ${f}`));

    // 4. Rastreamento - Importados
    const btnImp = page.locator('button', { hasText: /Importado \(/ }).first();
    if (await btnImp.isVisible()) {
      await btnImp.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SS, '06-rastreamento-importados.png'), fullPage: false });

      // Capturar dados da primeira linha
      const primeiraLinha = await page.locator('table tbody tr').first().textContent();
      console.log('\n=== PRIMEIRO IMPORTADO ===');
      console.log(`  ${primeiraLinha?.substring(0, 200)}`);
    }

    // 5. Rastreamento - Óbitos
    const btnOb = page.locator('button', { hasText: /Obito/ }).first();
    if (await btnOb.isVisible()) {
      await btnOb.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SS, '07-rastreamento-obitos.png'), fullPage: false });

      const primeiraLinha = await page.locator('table tbody tr').first().textContent();
      console.log('\n=== PRIMEIRO ÓBITO ===');
      console.log(`  ${primeiraLinha?.substring(0, 200)}`);
    }

    // 6. Rastreamento - Pendentes
    const btnPend = page.locator('button', { hasText: /Pendente/ }).first();
    if (await btnPend.isVisible()) {
      await btnPend.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SS, '08-rastreamento-pendentes.png'), fullPage: true });

      const primeiraLinha = await page.locator('table tbody tr').first().textContent();
      console.log('\n=== PRIMEIRO PENDENTE ===');
      console.log(`  ${primeiraLinha?.substring(0, 300)}`);
    }

    // 7. Rastreamento - Duplicidade SIA
    const btnDup = page.locator('button', { hasText: /Duplicidade/ }).first();
    if (await btnDup.isVisible()) {
      await btnDup.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SS, '09-rastreamento-duplicidade.png'), fullPage: false });

      const primeiraLinha = await page.locator('table tbody tr').first().textContent();
      console.log('\n=== PRIMEIRA DUPLICIDADE SIA ===');
      console.log(`  ${primeiraLinha?.substring(0, 200)}`);
    }

    // 8. Histórico
    await page.locator('[role="tab"]', { hasText: /Histórico/ }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SS, '10-historico.png'), fullPage: true });

    // 9. Extrair dados do JSON de resposta para análise
    console.log('\n=== RESUMO FINAL ===');
    console.log('Screenshots salvas em: reports/screenshots/analise/');
    console.log('Teste concluído com sucesso.');
  });
});
