/**
 * Teste Visual — Fila de Espera OCI
 *
 * Objetivo: Navegar até a tela de Consulta/Cadastro OCI e capturar
 * screenshots da fila de espera para validação visual pelo QA.
 *
 * Verifica:
 * - A tela carrega corretamente
 * - A tabela de OCIs é exibida com registros
 * - Filtra por st_origem=SISREG (se possível)
 * - Captura screenshots de cada estado para revisão
 *
 * Rota: /oci/dashboard/consulta_cadastro
 * Módulo: OCI
 */

import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = resolve(__dirname, '../../reports/screenshots');

test.describe('Fila de Espera OCI — Validação Visual', () => {

  test.beforeEach(async ({ page }) => {
    // Navegar para a tela de Consulta/Cadastro OCI
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
    await page.goto(`${baseURL}/oci/dashboard/consulta_cadastro`);
    await page.waitForLoadState('networkidle');
    // Aguardar a tabela carregar
    await page.waitForTimeout(3000);
  });

  test('Req Visual 1 — Tela de listagem OCI carrega com registros', async ({ page }) => {
    // Capturar screenshot da tela inicial
    await page.screenshot({
      path: resolve(SCREENSHOTS_DIR, 'fila-oci-01-tela-inicial.png'),
      fullPage: true,
    });

    // Verificar que a tabela existe
    const tabela = page.locator('table');
    await expect(tabela).toBeVisible({ timeout: 10000 });

    // Contar linhas da tabela (excluindo header)
    const linhas = page.locator('table tbody tr:not(.expanded-row)');
    const qtdLinhas = await linhas.count();
    console.log(`[FILA-OCI] Linhas na tabela: ${qtdLinhas}`);

    // Capturar screenshot com a tabela carregada
    await page.screenshot({
      path: resolve(SCREENSHOTS_DIR, 'fila-oci-02-tabela-carregada.png'),
      fullPage: true,
    });

    expect(qtdLinhas).toBeGreaterThan(0);
  });

  test('Req Visual 2 — Verificar dados de uma OCI na listagem', async ({ page }) => {
    // Aguardar tabela
    const tabela = page.locator('table');
    await expect(tabela).toBeVisible({ timeout: 10000 });

    // Pegar texto da primeira linha
    const primeiraLinha = page.locator('table tbody tr:not(.expanded-row)').first();
    const textoPrimeiraLinha = await primeiraLinha.textContent();
    console.log(`[FILA-OCI] Primeira linha: ${textoPrimeiraLinha?.substring(0, 200)}`);

    // Capturar screenshot
    await page.screenshot({
      path: resolve(SCREENSHOTS_DIR, 'fila-oci-03-primeira-linha.png'),
      fullPage: true,
    });
  });

  test('Req Visual 3 — Expandir detalhes de uma OCI', async ({ page }) => {
    // Aguardar tabela
    const tabela = page.locator('table');
    await expect(tabela).toBeVisible({ timeout: 10000 });

    // Clicar na primeira linha para expandir detalhes
    const primeiraLinha = page.locator('table tbody tr:not(.expanded-row)').first();
    await primeiraLinha.click();
    await page.waitForTimeout(2000);

    // Capturar screenshot com detalhes expandidos
    await page.screenshot({
      path: resolve(SCREENSHOTS_DIR, 'fila-oci-04-detalhes-expandidos.png'),
      fullPage: true,
    });

    // Verificar se apareceu conteúdo expandido
    const expandido = page.locator('.expanded-row, [class*="expandido"], [class*="PacienteExpandido"]');
    const temExpandido = await expandido.count();
    console.log(`[FILA-OCI] Elementos expandidos: ${temExpandido}`);
  });

  test('Req Visual 4 — Navegar para última página (registros mais recentes)', async ({ page }) => {
    // Aguardar tabela
    const tabela = page.locator('table');
    await expect(tabela).toBeVisible({ timeout: 10000 });

    // Tentar ir para a última página
    const btnUltimaPagina = page.locator('[aria-label="Última página"]');
    if (await btnUltimaPagina.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnUltimaPagina.click();
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: resolve(SCREENSHOTS_DIR, 'fila-oci-05-ultima-pagina.png'),
        fullPage: true,
      });
    } else {
      console.log('[FILA-OCI] Botão de última página não encontrado — pode ter só 1 página');
      await page.screenshot({
        path: resolve(SCREENSHOTS_DIR, 'fila-oci-05-pagina-unica.png'),
        fullPage: true,
      });
    }
  });

  test('Req Visual 5 — Verificar paginação e total de registros', async ({ page }) => {
    // Aguardar tabela
    const tabela = page.locator('table');
    await expect(tabela).toBeVisible({ timeout: 10000 });

    // Capturar informações de paginação (se visíveis)
    const paginacao = page.locator('[class*="pagination"], [class*="Pagination"]');
    if (await paginacao.isVisible({ timeout: 3000 }).catch(() => false)) {
      const textoPaginacao = await paginacao.textContent();
      console.log(`[FILA-OCI] Paginação: ${textoPaginacao}`);
    }

    // Capturar screenshot final
    await page.screenshot({
      path: resolve(SCREENSHOTS_DIR, 'fila-oci-06-paginacao.png'),
      fullPage: true,
    });
  });
});
