// Teste E2E — Tela de Previsão de Demanda OCI
// Guardian — Agente de Testes E2E
// Módulo: OCI | Funcionalidade: Previsão de Demanda (Prophet)
// Rota: /oci/dashboard/previsao

import { test, expect } from '@playwright/test';

test.describe('Previsão de Demanda — Módulo OCI', () => {

  test('Req 1.1 - Tela carrega sem erros e exibe título correto', async ({ page }) => {
    await page.goto('/oci/dashboard/previsao');
    await page.waitForLoadState('networkidle');

    // Verifica título da página
    const titulo = page.locator('text=Previsão de Demanda — Fila SISREG-DF');
    await expect(titulo).toBeVisible({ timeout: 10000 });
  });

  test('Req 1.2 - Seletor de série de previsão está visível', async ({ page }) => {
    await page.goto('/oci/dashboard/previsao');
    await page.waitForLoadState('networkidle');

    // Verifica que o select de série existe
    const selectSerie = page.locator('select').first();
    await expect(selectSerie).toBeVisible({ timeout: 10000 });

    // Verifica que tem opções
    const options = await selectSerie.locator('option').count();
    expect(options).toBeGreaterThan(0);
  });

  test('Req 1.3 - API retorna dados e gráfico é renderizado (série mensal)', async ({ page }) => {
    await page.goto('/oci/dashboard/previsao');
    await page.waitForLoadState('networkidle');

    // Aguarda o gráfico carregar (SectionCard com título da série)
    const sectionCard = page.locator('text=Total Fila SISREG-DF');
    await expect(sectionCard).toBeVisible({ timeout: 15000 });

    // Verifica que NÃO há mensagem de erro
    const alertErro = page.locator('.alert-danger');
    await expect(alertErro).not.toBeVisible();

    // Verifica que badges de métricas aparecem
    const badgeMAPE = page.locator('text=/MAPE:/');
    await expect(badgeMAPE).toBeVisible({ timeout: 10000 });
  });

  test('Req 1.4 - Gráfico ApexCharts é renderizado sem travar', async ({ page }) => {
    await page.goto('/oci/dashboard/previsao');
    await page.waitForLoadState('networkidle');

    // Aguarda o container do ApexCharts aparecer
    const chartContainer = page.locator('.apexcharts-canvas');
    await expect(chartContainer).toBeVisible({ timeout: 20000 });

    // Verifica que a página não está travada (pode interagir)
    const exportBtn = page.locator('text=Exportar CSV');
    await expect(exportBtn).toBeEnabled({ timeout: 5000 });
  });

  test('Req 1.5 - Trocar série para Consultas carrega novos dados', async ({ page }) => {
    await page.goto('/oci/dashboard/previsao');
    await page.waitForLoadState('networkidle');

    // Aguarda gráfico inicial carregar
    const chartContainer = page.locator('.apexcharts-canvas');
    await expect(chartContainer).toBeVisible({ timeout: 20000 });

    // Troca para série "Consultas"
    const selectSerie = page.locator('select').first();
    await selectSerie.selectOption('tipo_consulta|mensal');

    // Aguarda recarregar (spinner pode aparecer brevemente)
    await page.waitForTimeout(2000);

    // Verifica que o gráfico ainda está visível (não quebrou)
    await expect(chartContainer).toBeVisible();

    // Verifica que não há erro
    const alertErro = page.locator('.alert-danger');
    await expect(alertErro).not.toBeVisible();
  });

  test('Req 1.6 - Não exibe dados mockados/simulados', async ({ page }) => {
    await page.goto('/oci/dashboard/previsao');
    await page.waitForLoadState('networkidle');

    // Verifica que NÃO há texto de "simulado" ou "modo alternativo"
    const textoSimulado = page.locator('text=/simulado|modo alternativo|mock/i');
    await expect(textoSimulado).not.toBeVisible({ timeout: 5000 });
  });

});
