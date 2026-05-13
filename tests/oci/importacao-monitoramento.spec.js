/**
 * Teste E2E — Ajustes na Tela de Importação e Monitoramento de Transmissões OCI
 *
 * Valida as mudanças de frontend conforme spec:
 * - Renomeações de labels ("Aceitação" → "Conversão")
 * - Remoção de seções obsoletas (Distribuição por Fase, Origem da Detecção, etc.)
 * - Botão "Confirmar Importação" (renomeado de "Importar de fato")
 * - KPIs do Histórico
 * - Toggle de dimensão (Por Solicitações / Por Pacientes)
 * - Nova tela de Monitoramento de Transmissões
 */
import { test, expect } from '@playwright/test';

test.describe('Importação e Monitoramento OCI — Validação de Ajustes', () => {

  // ================================================================
  // TELA DE IMPORTAÇÃO SISREG
  // ================================================================
  test.describe('Tela de Importação SISREG', () => {

    test('deve exibir botões "Confirmar Importação" e "Preview / Validar"', async ({ page }) => {
      await page.goto('/oci/importacao-sisreg');
      await page.waitForLoadState('networkidle');

      // Clicar na aba "Nova Importação" para ver os botões de ação
      const tabNova = page.locator('[role="tab"]', { hasText: 'Nova Importação' });
      if (await tabNova.isVisible({ timeout: 5000 }).catch(() => false)) {
        await tabNova.click();
        await page.waitForTimeout(1000);
      }

      // Verificar que o botão "Confirmar Importação" existe (renomeado de "Importar de fato")
      const btnConfirmar = page.getByRole('button', { name: /Confirmar Importação/i });
      await expect(btnConfirmar).toBeVisible({ timeout: 10000 });

      // Verificar que o botão "Preview / Validar" existe
      const btnPreview = page.getByRole('button', { name: /Preview.*Validar|Validar.*Preview/i });
      await expect(btnPreview).toBeVisible();
    });

    test('deve exibir KPI cards no Histórico com labels corretos', async ({ page }) => {
      await page.goto('/oci/importacao-sisreg');
      await page.waitForLoadState('networkidle');

      // Navegar para aba Histórico
      const tabHistorico = page.locator('[role="tab"]', { hasText: /Histórico/i });
      await expect(tabHistorico).toBeVisible({ timeout: 10000 });
      await tabHistorico.click();
      await page.waitForTimeout(2000);

      // Verificar KPI cards do Histórico
      await expect(page.getByText('Total de Importações')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Total de OCI Geradas/i)).toBeVisible();
      await expect(page.getByText(/Taxa Média de Conversão/i)).toBeVisible();
      await expect(page.getByText(/Última Importação/i)).toBeVisible();

      // Verificar que o label antigo NÃO existe
      await expect(page.getByText(/Taxa média de aceitação/i)).toHaveCount(0);
    });
  });

  // ================================================================
  // ABA RESUMO EXECUTIVO
  // ================================================================
  test.describe('Aba Resumo Executivo', () => {

    test('deve exibir toggle "Por Solicitações" e "Por Pacientes"', async ({ page }) => {
      await page.goto('/oci/importacao-sisreg');
      await page.waitForLoadState('networkidle');

      // Navegar para aba Resumo Executivo
      const tabResumo = page.locator('[role="tab"]', { hasText: /Resumo Executivo/i });
      await expect(tabResumo).toBeVisible({ timeout: 10000 });
      await tabResumo.click();
      await page.waitForTimeout(2000);

      // Verificar toggle de dimensão
      await expect(page.getByText(/Por Solicitações/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Por Pacientes/i)).toBeVisible();
    });

    test('deve exibir "Taxa de Conversão" (não "Taxa de Aceitação")', async ({ page }) => {
      await page.goto('/oci/importacao-sisreg');
      await page.waitForLoadState('networkidle');

      const tabResumo = page.locator('[role="tab"]', { hasText: /Resumo Executivo/i });
      await expect(tabResumo).toBeVisible({ timeout: 10000 });
      await tabResumo.click();
      await page.waitForTimeout(2000);

      // Verificar label correto
      await expect(page.getByText(/Taxa de Conversão/i)).toBeVisible({ timeout: 10000 });

      // Verificar que o label antigo NÃO existe
      await expect(page.getByText(/Taxa de Aceitação/i)).toHaveCount(0);
    });

    test('NÃO deve exibir seções removidas (Distribuição por Fase, Origem da Detecção)', async ({ page }) => {
      await page.goto('/oci/importacao-sisreg');
      await page.waitForLoadState('networkidle');

      const tabResumo = page.locator('[role="tab"]', { hasText: /Resumo Executivo/i });
      await expect(tabResumo).toBeVisible({ timeout: 10000 });
      await tabResumo.click();
      await page.waitForTimeout(2000);

      // Seções removidas NÃO devem existir
      await expect(page.getByText(/Distribuição por Fase/i)).not.toBeVisible();
      await expect(page.getByText(/Origem da Detecção da Fase/i)).not.toBeVisible();
    });

    test('NÃO deve exibir cards removidos (Duplicidade SIA, Histórico SIA Encontrado)', async ({ page }) => {
      await page.goto('/oci/importacao-sisreg');
      await page.waitForLoadState('networkidle');

      const tabResumo = page.locator('[role="tab"]', { hasText: /Resumo Executivo/i });
      await expect(tabResumo).toBeVisible({ timeout: 10000 });
      await tabResumo.click();
      await page.waitForTimeout(2000);

      // Cards removidos NÃO devem existir
      await expect(page.getByText(/Duplicidade SIA/i)).toHaveCount(0);
      await expect(page.getByText(/Histórico SIA Encontrado/i)).toHaveCount(0);
    });
  });

  // ================================================================
  // TELA DE MONITORAMENTO DE TRANSMISSÕES
  // ================================================================
  test.describe('Tela de Monitoramento de Transmissões', () => {

    test('deve exibir 4 cards de status', async ({ page }) => {
      await page.goto('/oci/monitoramento-transmissoes');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verificar os 4 cards de status
      await expect(page.getByText(/Pendente de Envio/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Transmitido com Sucesso/i)).toBeVisible();
      await expect(page.getByText(/Rejeitado pela Regulação/i)).toBeVisible();
      await expect(page.getByText(/Falha no Envio/i)).toBeVisible();
    });

    test('deve exibir tabela de transmissões', async ({ page }) => {
      await page.goto('/oci/monitoramento-transmissoes');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verificar que a tabela existe
      const tabela = page.locator('table');
      await expect(tabela).toBeVisible({ timeout: 10000 });
    });

    test('deve exibir filtros de status', async ({ page }) => {
      await page.goto('/oci/monitoramento-transmissoes');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verificar que existem botões/elementos de filtro
      // Os filtros podem ser botões, selects ou badges clicáveis
      const filtros = page.locator('button, [role="tab"], .badge, select').filter({
        hasText: /Pendente|Transmitido|Rejeitado|Falha|Todos/i
      });
      const qtdFiltros = await filtros.count();
      expect(qtdFiltros).toBeGreaterThan(0);
    });
  });
});
