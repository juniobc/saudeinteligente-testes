/**
 * Verificação visual — OCIs importadas do SISREG
 * 
 * Abre a fila OCI no Amapá e PAUSA para o QA verificar.
 */
import { test, expect } from '@playwright/test';

test.describe('Verificação de Importação SISREG', () => {

  test('Abrir fila OCI e pausar para inspeção visual', async ({ page }) => {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
    
    // Navegar para a fila OCI
    await page.goto(`${baseURL}/oci/dashboard/consulta_cadastro`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Contar linhas
    const linhas = page.locator('table tbody tr:not(.expanded-row)');
    const qtd = await linhas.count();
    console.log(`\n========================================`);
    console.log(`  OCIs NA TABELA: ${qtd} registros`);
    console.log(`========================================\n`);

    // Pegar dados das primeiras 5 linhas
    for (let i = 0; i < Math.min(qtd, 5); i++) {
      const texto = await linhas.nth(i).textContent();
      console.log(`  Linha ${i + 1}: ${texto?.substring(0, 150)}`);
    }

    // PAUSAR — o navegador fica aberto para o QA inspecionar
    // Pressione "Resume" no terminal do Playwright para continuar
    await page.pause();
  });
});
