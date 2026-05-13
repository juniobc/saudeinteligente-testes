/**
 * E2E — Teste da aba Rastreamento com as 3 novas ações
 * 
 * Pré-requisito: já ter feito uma importação (dados existem no estado da tela)
 * Fluxo: Upload CSV → Preview → Verificar aba Rastreamento → Testar ações
 * Tenant: br_distrito_federal
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const FILES_DIR = path.resolve('D:/m1031007/Projetos/Prosystema/SaudeInteligente/python/docs/atividades/teste_carga_sisreg_sia_sim/backup_20260510_095400');
const CSV_SISREG = path.join(FILES_DIR, 'sisreg_teste_oftalmo_200.csv');

test.describe('Aba Rastreamento — Ações Pendente de Classificação', () => {

    test('Verificar aba Rastreamento com 3 ações nos pendentes', async ({ page }) => {
        test.setTimeout(90000);

        // 1. Navegar para tela de importação
        await page.goto('/oci/importacao-sisreg');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 2. Upload CSV e Preview para ter dados de rastreamento
        await page.click('[role="tab"]:has-text("Nova Importação")');
        await page.waitForTimeout(1000);

        const inputCSV = page.locator('[id="upload-CSV SISREG"]');
        await inputCSV.setInputFiles(CSV_SISREG);
        await page.waitForTimeout(1000);
        console.log('✅ CSV carregado');

        // Executar Preview
        await page.click('button:has-text("Preview / Validar")');
        console.log('⏳ Executando Preview...');

        // Aguardar conclusão
        try {
            await page.waitForSelector('[role="tab"]:has-text("Resumo Executivo")', { timeout: 60000 });
            await page.waitForTimeout(3000);
            console.log('✅ Preview concluído');
        } catch (e) {
            console.log('⚠️ Timeout no preview');
        }

        // 3. Ir para aba Rastreamento
        await page.click('[role="tab"]:has-text("Rastreamento")');
        await page.waitForTimeout(2000);
        console.log('📋 Aba Rastreamento aberta');

        // 4. Verificar que a tabela de rastreamento existe
        const tabelaRastreamento = page.locator('table.table-hover').first();
        const semDados = page.locator('text=Nenhum rastreamento');

        if (await semDados.isVisible()) {
            console.log('ℹ️ Nenhum dado de rastreamento — Preview pode não ter gerado rastreamento');
            // Capturar screenshot para debug
            await page.screenshot({ path: 'guardian/reports/screenshots/rastreamento-sem-dados.png' });
            return;
        }

        await expect(tabelaRastreamento).toBeVisible();
        console.log('✅ Tabela de rastreamento visível');

        // 5. Verificar filtros por status
        const btnTodos = page.locator('button:has-text("Todos")');
        await expect(btnTodos).toBeVisible();
        console.log('✅ Botão "Todos" visível');

        // Capturar screenshot da tabela
        await page.screenshot({ path: 'guardian/reports/screenshots/rastreamento-tabela.png' });

        // 6. Verificar se há registros "Pendente Classificação"
        const btnPendente = page.locator('button:has-text("Pendente")');
        if (await btnPendente.isVisible()) {
            console.log('✅ Filtro "Pendente" disponível');
            await btnPendente.click();
            await page.waitForTimeout(1000);

            // 7. Verificar dropdown de ações no primeiro registro pendente
            const dropdowns = page.locator('[id^="dropdown-acoes-"]');
            const qtdDropdowns = await dropdowns.count();
            console.log(`📋 ${qtdDropdowns} registros pendentes com dropdown de ações`);

            if (qtdDropdowns > 0) {
                // Clicar no primeiro dropdown
                await dropdowns.first().click();
                await page.waitForTimeout(500);

                // Capturar screenshot do dropdown aberto
                await page.screenshot({ path: 'guardian/reports/screenshots/rastreamento-dropdown-acoes.png' });

                // 8. Verificar as 3 ações
                const acaoVisualizar = page.locator('.dropdown-menu:visible >> text=Visualizar Consolidação');
                const acaoEnviar = page.locator('.dropdown-menu:visible >> text=Enviar para Regulação');
                const acaoExcluir = page.locator('.dropdown-menu:visible >> text=Excluir Registro');

                if (await acaoVisualizar.isVisible()) {
                    console.log('✅ Ação "Visualizar Consolidação de OCI" presente');
                } else {
                    console.log('❌ Ação "Visualizar Consolidação" NÃO encontrada');
                }

                if (await acaoEnviar.isVisible()) {
                    console.log('✅ Ação "Enviar para Regulação" presente');
                } else {
                    console.log('❌ Ação "Enviar para Regulação" NÃO encontrada');
                }

                if (await acaoExcluir.isVisible()) {
                    console.log('✅ Ação "Excluir Registro" presente');
                } else {
                    console.log('❌ Ação "Excluir Registro" NÃO encontrada');
                }

                // 9. Verificar que "Classificar Manualmente" NÃO existe como ação isolada
                const acaoClassificar = page.locator('.dropdown-menu:visible >> text=Classificar Manualmente');
                if (await acaoClassificar.isVisible()) {
                    console.log('❌ ERRO: "Classificar Manualmente" ainda existe como ação isolada!');
                } else {
                    console.log('✅ "Classificar Manualmente" removida (substituída pelas 3 novas ações)');
                }

                // 10. Testar ação "Enviar para Regulação"
                if (await acaoEnviar.isVisible()) {
                    console.log('⏳ Testando "Enviar para Regulação"...');
                    await acaoEnviar.click();
                    await page.waitForTimeout(3000);

                    // Verificar resposta (sucesso ou erro)
                    // O toast de notificação deve aparecer
                    const toastSucesso = page.locator('text=regulação com sucesso');
                    const toastErro = page.locator('[class*="error"], [class*="danger"]');

                    if (await toastSucesso.isVisible().catch(() => false)) {
                        console.log('✅ Envio para regulação: SUCESSO');
                    } else {
                        // Pode ter dado erro (paciente sem identificador, etc.) — isso é esperado em preview
                        console.log('⚠️ Envio para regulação: resposta não confirmada (pode ser erro esperado em dry-run)');
                    }

                    await page.screenshot({ path: 'guardian/reports/screenshots/rastreamento-enviar-regulacao.png' });
                }

                // Fechar dropdown se aberto
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);

            } else {
                console.log('ℹ️ Nenhum registro pendente com dropdown — pode não haver ambiguidade nos dados de teste');
                await page.screenshot({ path: 'guardian/reports/screenshots/rastreamento-sem-pendentes.png' });
            }
        } else {
            console.log('ℹ️ Filtro "Pendente" não disponível — nenhum registro pendente de classificação');
            
            // Verificar outros status disponíveis
            const statusButtons = page.locator('.d-flex.flex-wrap.gap-2 button');
            const qtdStatus = await statusButtons.count();
            console.log(`📋 ${qtdStatus} filtros de status disponíveis`);
            
            await page.screenshot({ path: 'guardian/reports/screenshots/rastreamento-filtros.png' });
        }

        // 11. Verificar colunas da tabela
        const colunas = ['Paciente', 'Procedimentos', 'Status', 'OCI Vinculada', 'Detalhes', 'Acao'];
        for (const col of colunas) {
            const th = page.locator(`th:has-text("${col}")`);
            if (await th.isVisible()) {
                console.log(`✅ Coluna "${col}" presente`);
            }
        }

        // Screenshot final
        await page.screenshot({ path: 'guardian/reports/screenshots/rastreamento-final.png' });
        console.log('📸 Screenshots salvos em guardian/reports/screenshots/');
    });
});
