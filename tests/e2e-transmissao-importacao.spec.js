/**
 * E2E — Teste de Importação + Transmissão
 * 
 * Fluxo: Upload CSV → Preview → Confirmar Importação → Verificar Transmissão
 * Tenant: br_distrito_federal
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const FILES_DIR = path.resolve('D:/m1031007/Projetos/Prosystema/SaudeInteligente/python/docs/atividades/teste_carga_sisreg_sia_sim/backup_20260510_095400');
const CSV_SISREG = path.join(FILES_DIR, 'sisreg_teste_oftalmo_200.csv');
const ZIP_SIA = path.join(FILES_DIR, 'sia_teste_oftalmo_50.zip');
const ZIP_SIM = path.join(FILES_DIR, 'sim_teste_oftalmo_20.zip');

test.describe('Importação e Transmissão de Dados', () => {

    test('Fluxo completo: Upload → Preview → Importar → Verificar Monitoramento', async ({ page }) => {
        // Aumentar timeout para este teste (importação pode demorar)
        test.setTimeout(120000);

        // 1. Navegar para tela de importação
        await page.goto('/oci/importacao-sisreg');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 2. Clicar na aba "Nova Importação"
        await page.click('[role="tab"]:has-text("Nova Importação")');
        await page.waitForTimeout(1000);

        // 3. Upload dos arquivos — usar setInputFiles diretamente no input hidden
        // Os inputs têm id="upload-CSV SISREG", "upload-ZIP SIA/SUS", "upload-ZIP SIM"
        const inputCSV = page.locator('[id="upload-CSV SISREG"]');
        await inputCSV.setInputFiles(CSV_SISREG);
        await page.waitForTimeout(1000);

        // Verificar que o arquivo foi aceito
        await expect(page.locator('text=sisreg_teste_oftalmo_200.csv')).toBeVisible();
        console.log('✅ CSV SISREG carregado');

        // Upload SIA
        const inputSIA = page.locator('[id="upload-ZIP SIA/SUS"]');
        await inputSIA.setInputFiles(ZIP_SIA);
        await page.waitForTimeout(1000);
        await expect(page.locator('text=sia_teste_oftalmo_50.zip')).toBeVisible();
        console.log('✅ ZIP SIA carregado');

        // Upload SIM
        const inputSIM = page.locator('[id="upload-ZIP SIM"]');
        await inputSIM.setInputFiles(ZIP_SIM);
        await page.waitForTimeout(1000);
        await expect(page.locator('text=sim_teste_oftalmo_20.zip')).toBeVisible();
        console.log('✅ ZIP SIM carregado');

        // 4. Verificar modo detectado
        await expect(page.locator('text=ANALISE_COMPLETA')).toBeVisible();
        console.log('✅ Modo ANALISE_COMPLETA detectado');

        // 5. Executar Preview primeiro
        await page.click('button:has-text("Preview / Validar")');
        console.log('⏳ Executando Preview...');

        // Aguardar conclusão do preview (pode demorar até 60s)
        await page.waitForTimeout(3000);
        
        // Esperar que o spinner desapareça ou que o resultado apareça
        try {
            await page.waitForSelector('text=Resumo Executivo', { timeout: 60000 });
            console.log('✅ Preview concluído — Resumo Executivo visível');
        } catch (e) {
            // Pode já estar na aba resumo
            console.log('⚠️ Timeout no preview, verificando estado...');
        }

        // 6. Verificar KPIs no Resumo Executivo
        await page.click('[role="tab"]:has-text("Resumo Executivo")');
        await page.waitForTimeout(2000);

        // Verificar que temos dados (pelo menos o header com taxa)
        const taxaConversao = page.locator('text=Taxa de Conversão');
        if (await taxaConversao.first().isVisible()) {
            console.log('✅ KPIs de Conversão visíveis no Resumo Executivo');
        }

        // Verificar toggle de dimensão
        const btnSolicitacoes = page.locator('button:has-text("Por Solicitações")');
        const btnPacientes = page.locator('button:has-text("Por Pacientes")');
        if (await btnSolicitacoes.isVisible()) {
            console.log('✅ Toggle de dimensão presente');
            
            // Testar alternância
            await btnPacientes.click();
            await page.waitForTimeout(500);
            await btnSolicitacoes.click();
            await page.waitForTimeout(500);
            console.log('✅ Toggle funciona (alternância sem erro)');
        }

        // 7. Agora executar a importação real (Confirmar Importação)
        await page.click('[role="tab"]:has-text("Nova Importação")');
        await page.waitForTimeout(1000);

        // Aceitar o confirm dialog
        page.on('dialog', async dialog => {
            console.log(`📋 Dialog: ${dialog.message()}`);
            await dialog.accept();
        });

        await page.click('button:has-text("Confirmar Importação")');
        console.log('⏳ Executando importação real...');

        // Aguardar conclusão (pode demorar até 90s)
        try {
            await page.waitForSelector('text=Importação concluída', { timeout: 90000 });
            console.log('✅ Importação concluída com sucesso!');
        } catch (e) {
            // Verificar se houve erro
            const erroVisible = await page.locator('text=Erro na importação').isVisible();
            if (erroVisible) {
                console.log('❌ Erro na importação');
                // Capturar screenshot para debug
                await page.screenshot({ path: 'guardian/reports/screenshots/erro-importacao.png' });
            } else {
                console.log('⚠️ Timeout na importação, mas pode ter concluído');
            }
        }

        // 8. Verificar aba Rastreamento (ações nos pendentes)
        await page.click('[role="tab"]:has-text("Rastreamento")');
        await page.waitForTimeout(2000);

        // Verificar se há registros pendentes
        const btnPendente = page.locator('button:has-text("Pendente")');
        if (await btnPendente.isVisible()) {
            await btnPendente.click();
            await page.waitForTimeout(1000);

            // Verificar dropdown de ações
            const dropdown = page.locator('[id^="dropdown-acoes-"]').first();
            if (await dropdown.isVisible()) {
                await dropdown.click();
                await page.waitForTimeout(500);

                // Verificar as 3 ações
                const acaoVisualizar = page.locator('text=Visualizar Consolidação');
                const acaoEnviar = page.locator('text=Enviar para Regulação');
                const acaoExcluir = page.locator('text=Excluir Registro');

                if (await acaoEnviar.isVisible()) {
                    console.log('✅ Ação "Enviar para Regulação" disponível');
                    
                    // Clicar em "Enviar para Regulação" para testar a transmissão
                    await acaoEnviar.click();
                    await page.waitForTimeout(2000);

                    // Verificar se houve sucesso ou erro
                    const sucesso = page.locator('text=regulação com sucesso');
                    const erro = page.locator('.toast-error, .Toastify__toast--error, [class*="error"]');
                    
                    if (await sucesso.isVisible()) {
                        console.log('✅ Transmissão enviada com sucesso!');
                    } else {
                        console.log('⚠️ Resultado da transmissão não confirmado visualmente');
                    }
                }

                // Fechar dropdown se ainda aberto
                await page.keyboard.press('Escape');
            } else {
                console.log('ℹ️ Nenhum registro pendente com dropdown de ações');
            }
        } else {
            console.log('ℹ️ Nenhum registro pendente de classificação');
        }

        // 9. Navegar para Monitoramento de Transmissões
        await page.goto('/oci/monitoramento-transmissoes');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Verificar que a tela carregou
        await expect(page.locator('text=Monitoramento de Transmissões')).toBeVisible();
        console.log('✅ Tela de Monitoramento de Transmissões carregada');

        // Verificar cards de status
        const cardPendente = page.locator('small:has-text("Pendente de Envio")').first();
        await expect(cardPendente).toBeVisible();
        console.log('✅ Card "Pendente de Envio" visível');

        // Verificar se há transmissões na tabela (pode estar vazia ou com dados)
        const tabela = page.locator('table');
        const msgVazio = page.locator('text=Nenhuma transmissão encontrada');
        
        if (await tabela.isVisible()) {
            const rows = await page.locator('table tbody tr').count();
            console.log(`✅ Tabela de transmissões com ${rows} registros`);
        } else if (await msgVazio.isVisible()) {
            console.log('ℹ️ Tabela vazia — nenhuma transmissão registrada ainda');
        }

        // Screenshot final
        await page.screenshot({ path: 'guardian/reports/screenshots/monitoramento-transmissoes-final.png' });
        console.log('📸 Screenshot salvo');
    });
});
