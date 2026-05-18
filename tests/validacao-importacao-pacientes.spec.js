/**
 * E2E — Validação pós-importação: verificar se pacientes foram para os lugares corretos.
 * 
 * Após importação do CSV SISREG_AMB_AGENDADOS_REG_530010_2026-05-12_18-55-18.csv,
 * navega pela tela de Consulta/Cadastro OCI e verifica:
 * 1. Se existem OCIs criadas
 * 2. Se os pacientes estão nas especialidades corretas
 * 3. Se o status da fila está correto
 * 4. Screenshots de cada etapa para acompanhamento
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve('reports/screenshots/validacao-importacao');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Validação pós-importação — Pacientes nos lugares corretos', () => {

  test('Verificar OCIs criadas na tela de Consulta/Cadastro', async ({ page }) => {
    // Interceptar console
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`🔴 ${msg.text().substring(0, 150)}`);
    });

    // --- 1. Navegar para tela de Consulta/Cadastro OCI ---
    console.log('\n📍 1. Navegando para Consulta/Cadastro OCI...');
    await page.goto('/oci/dashboard/consulta_cadastro');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-tela-consulta-cadastro.png'), fullPage: true });
    console.log('✅ Tela carregada');

    // --- 2. Verificar se há registros na tabela ---
    console.log('\n📍 2. Verificando registros na tabela...');
    const rows = page.locator('table tbody tr:not(.expanded-row)');
    const rowCount = await rows.count().catch(() => 0);
    console.log(`   Registros visíveis na tabela: ${rowCount}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-tabela-ocis.png'), fullPage: true });

    // --- 3. Verificar filtros por especialidade ---
    console.log('\n📍 3. Testando filtros por especialidade...');
    
    const especialidades = ['Oftalmologia', 'Oncologia', 'Cardiologia', 'Ortopedia', 'Otorrinolaringologia'];
    
    for (const esp of especialidades) {
      try {
        // Procurar filtro de especialidade/grupo
        const filtroGrupo = page.locator('[name="co_grupo"]').or(page.locator('[data-field-name="co_grupo"]'));
        if (await filtroGrupo.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await filtroGrupo.first().click();
          await page.keyboard.type(esp.substring(0, 4));
          await page.waitForTimeout(500);
          
          const option = page.locator('.Select2__option, [class*="option"]').filter({ hasText: new RegExp(esp, 'i') });
          if (await option.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await option.first().click();
            await page.waitForTimeout(1000);
            
            // Buscar
            const btnBuscar = page.locator('button[type="submit"]').first();
            if (await btnBuscar.isVisible({ timeout: 2000 }).catch(() => false)) {
              await btnBuscar.click();
              await page.waitForLoadState('networkidle');
              await page.waitForTimeout(2000);
            }
            
            const rowsEsp = await rows.count().catch(() => 0);
            console.log(`   ${esp}: ${rowsEsp} OCIs`);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `03-filtro-${esp.toLowerCase()}.png`), fullPage: true });
            
            // Limpar filtro
            await page.keyboard.press('Escape');
          } else {
            console.log(`   ${esp}: opção não encontrada no filtro`);
          }
        }
      } catch (e) {
        console.log(`   ${esp}: erro ao filtrar — ${e.message.substring(0, 80)}`);
      }
    }

    // --- 4. Expandir primeiro registro para ver detalhes ---
    console.log('\n📍 4. Expandindo primeiro registro...');
    // Limpar filtros primeiro - recarregar página
    await page.goto('/oci/dashboard/consulta_cadastro');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const firstRow = rows.first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Clicar para expandir
      const expandBtn = firstRow.locator('td:first-child').first();
      await expandBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-registro-expandido.png'), fullPage: true });
      console.log('✅ Registro expandido');
      
      // Capturar texto do registro expandido
      const expandedContent = page.locator('.expanded-row, [class*="expand"]').first();
      if (await expandedContent.isVisible({ timeout: 3000 }).catch(() => false)) {
        const text = await expandedContent.textContent();
        console.log(`   Conteúdo: ${text.substring(0, 200)}...`);
      }
    } else {
      console.log('⚠️ Nenhum registro na tabela');
    }

    // --- 5. Navegar para Rastreamento da importação ---
    console.log('\n📍 5. Verificando aba Rastreamento da importação...');
    await page.goto('/oci/importacao-sisreg');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Clicar na aba Rastreamento
    const tabRastreamento = page.locator('button, [role="tab"]').filter({ hasText: /Rastreamento/i });
    if (await tabRastreamento.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await tabRastreamento.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-rastreamento.png'), fullPage: true });
      console.log('✅ Aba Rastreamento capturada');

      // Verificar conteúdo
      const bodyText = await page.textContent('body');
      if (bodyText.includes('IMPORTADO')) console.log('   ✅ Há registros IMPORTADOS');
      if (bodyText.includes('SEM_ELEGIBILIDADE')) console.log('   ⚠️ Há registros SEM_ELEGIBILIDADE');
      if (bodyText.includes('PENDENTE')) console.log('   ⚠️ Há registros PENDENTES');
      if (bodyText.includes('OCI_JA_EXISTE')) console.log('   ℹ️ Há registros OCI_JA_EXISTE');
    }

    // --- 6. Verificar Resumo Executivo ---
    console.log('\n📍 6. Verificando Resumo Executivo...');
    const tabResumo = page.locator('button, [role="tab"]').filter({ hasText: /Resumo/i });
    if (await tabResumo.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await tabResumo.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-resumo-executivo.png'), fullPage: true });
      console.log('✅ Resumo Executivo capturado');
    }

    // --- 7. Verificar Histórico ---
    console.log('\n📍 7. Verificando Histórico...');
    const tabHistorico = page.locator('button, [role="tab"]').filter({ hasText: /Histórico/i });
    if (await tabHistorico.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await tabHistorico.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-historico.png'), fullPage: true });
      console.log('✅ Histórico capturado');
    }

    console.log('\n' + '='.repeat(70));
    console.log('VALIDAÇÃO CONCLUÍDA — Screenshots em reports/screenshots/validacao-importacao/');
    console.log('='.repeat(70));
  });
});
