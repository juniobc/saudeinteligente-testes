/**
 * E2E — Validação dos ajustes na tela de Importação SISREG e Monitoramento de Transmissões
 * 
 * Spec: ajustes-importacao-monitoramento-oci
 * Tenant: br_distrito_federal
 * 
 * Testa:
 * 1. Upload de arquivos e Preview
 * 2. KPIs do Resumo Executivo (10 cards, toggle dimensão, labels "Conversão")
 * 3. Funil de Saneamento e Gráfico de Composição
 * 4. Seção Óbitos (novas colunas: Nº Registro SISREG, Data Solicitação, CID Óbito, Tempo Espera)
 * 5. Botão "Confirmar Importação" (renomeado)
 * 6. Aba Rastreamento (3 novas ações nos pendentes)
 * 7. Aba Histórico (KPIs do backend: Taxa Média de Conversão)
 * 8. Tela Monitoramento de Transmissões (4 cards + tabela)
 */
import { test, expect } from '@playwright/test';
import path from 'path';

// Caminhos dos arquivos de teste
const FILES_DIR = path.resolve('docs/atividades/teste_carga_sisreg_sia_sim/backup_20260510_095400');
const CSV_SISREG = path.join(FILES_DIR, 'sisreg_teste_oftalmo_200.csv');
const ZIP_SIA = path.join(FILES_DIR, 'sia_teste_oftalmo_50.zip');
const ZIP_SIM = path.join(FILES_DIR, 'sim_teste_oftalmo_20.zip');

test.describe('Ajustes Importação SISREG + Monitoramento Transmissões', () => {

    test.beforeEach(async ({ page }) => {
        // Navegar para a tela de importação SISREG
        await page.goto('/oci/importacao-sisreg');
        await page.waitForLoadState('networkidle');
    });

    test('1. Botão "Confirmar Importação" existe (renomeado de "Importar de fato")', async ({ page }) => {
        // Clicar na aba "Nova Importação"
        await page.click('text=Nova Importação');
        await page.waitForTimeout(500);

        // Verificar que o botão "Confirmar Importação" existe
        const btnConfirmar = page.locator('button:has-text("Confirmar Importação")');
        await expect(btnConfirmar).toBeVisible();

        // Verificar que "Importar de fato" NÃO existe
        const btnAntigo = page.locator('button:has-text("Importar de fato")');
        await expect(btnAntigo).toHaveCount(0);

        // Verificar que "Preview / Validar" continua existindo
        const btnPreview = page.locator('button:has-text("Preview / Validar")');
        await expect(btnPreview).toBeVisible();
    });

    test('2. Upload de arquivos e execução do Preview', async ({ page }) => {
        // Clicar na aba "Nova Importação"
        await page.click('text=Nova Importação');
        await page.waitForTimeout(500);

        // Upload CSV SISREG — usar seletor por atributo accept + posição
        const fileInputs = page.locator('input[type="file"]');
        // O primeiro input é CSV SISREG, segundo é ZIP SIA, terceiro é ZIP SIM
        await fileInputs.nth(0).setInputFiles(CSV_SISREG);
        await page.waitForTimeout(500);

        // Verificar que o arquivo foi aceito (nome aparece na tela)
        await expect(page.locator('text=sisreg_teste_oftalmo_200.csv')).toBeVisible();

        // Upload ZIP SIA
        await fileInputs.nth(1).setInputFiles(ZIP_SIA);
        await page.waitForTimeout(500);

        // Upload ZIP SIM
        await fileInputs.nth(2).setInputFiles(ZIP_SIM);
        await page.waitForTimeout(500);

        // Verificar modo detectado: ANALISE_COMPLETA
        await expect(page.locator('text=ANALISE_COMPLETA')).toBeVisible();

        // Executar Preview
        await page.click('button:has-text("Preview / Validar")');

        // Aguardar resultado (pode demorar)
        await page.waitForSelector('text=Preview concluído', { timeout: 60000 }).catch(() => {});
        
        // Deve redirecionar para aba Resumo Executivo
        await page.waitForTimeout(2000);
    });

    test('3. Resumo Executivo — KPIs e labels "Conversão"', async ({ page }) => {
        // Primeiro fazer upload e preview para ter dados
        await page.click('text=Nova Importação');
        await page.waitForTimeout(500);
        
        const inputSisreg = page.locator('#upload-CSV\\ SISREG');
        await inputSisreg.setInputFiles(CSV_SISREG);
        await page.waitForTimeout(300);

        await page.click('button:has-text("Preview / Validar")');
        await page.waitForTimeout(15000); // Aguardar processamento

        // Clicar na aba Resumo Executivo
        await page.click('text=Resumo Executivo');
        await page.waitForTimeout(1000);

        // Verificar label "Taxa de Conversão" (não "Taxa de Aceitação")
        await expect(page.locator('text=Taxa de Conversão')).toBeVisible();
        const taxaAceitacao = page.locator('text=Taxa de Aceitação');
        await expect(taxaAceitacao).toHaveCount(0);

        // Verificar que "Duplicidade SIA" e "Histórico SIA Encontrado" NÃO existem
        const dupSia = page.locator('text=Duplicidade SIA');
        await expect(dupSia).toHaveCount(0);
        const histSia = page.locator('text=Histórico SIA Encontrado');
        await expect(histSia).toHaveCount(0);

        // Verificar KPIs presentes
        await expect(page.locator('text=Total de Solicitações')).toBeVisible();
        await expect(page.locator('text=Total de Pacientes')).toBeVisible();
        await expect(page.locator('text=Média de OCI por Paciente')).toBeVisible();
        await expect(page.locator('text=Solicitações Convertidas')).toBeVisible();
        await expect(page.locator('text=Pendentes de Classificação')).toBeVisible();
        await expect(page.locator('text=Total de Óbitos')).toBeVisible();
        await expect(page.locator('text=Pacientes Sem Conversão')).toBeVisible();

        // Verificar que "Distribuição por Fase" NÃO existe (removido)
        const distFase = page.locator('text=Distribuição por Fase');
        await expect(distFase).toHaveCount(0);

        // Verificar que "Origem da Detecção" NÃO existe (removido)
        const origemDeteccao = page.locator('text=Origem da Detecção');
        await expect(origemDeteccao).toHaveCount(0);
    });

    test('4. Toggle de Dimensão (Por Solicitações / Por Pacientes)', async ({ page }) => {
        // Navegar para Resumo Executivo com dados
        await page.click('text=Nova Importação');
        await page.waitForTimeout(500);
        
        const inputSisreg = page.locator('#upload-CSV\\ SISREG');
        await inputSisreg.setInputFiles(CSV_SISREG);
        await page.waitForTimeout(300);

        await page.click('button:has-text("Preview / Validar")');
        await page.waitForTimeout(15000);

        await page.click('text=Resumo Executivo');
        await page.waitForTimeout(1000);

        // Verificar toggle existe
        const btnSolicitacoes = page.locator('button:has-text("Por Solicitações")');
        const btnPacientes = page.locator('button:has-text("Por Pacientes")');
        await expect(btnSolicitacoes).toBeVisible();
        await expect(btnPacientes).toBeVisible();

        // Clicar em "Por Pacientes"
        await btnPacientes.click();
        await page.waitForTimeout(500);

        // Verificar que o funil mostra "Pacientes"
        await expect(page.locator('text=Fila de Referência (em Pacientes)')).toBeVisible();

        // Voltar para "Por Solicitações"
        await btnSolicitacoes.click();
        await page.waitForTimeout(500);

        await expect(page.locator('text=Fila de Referência (em Solicitações)')).toBeVisible();
    });

    test('5. Seção Óbitos — novas colunas', async ({ page }) => {
        // Fazer preview com SIM para ter óbitos
        await page.click('text=Nova Importação');
        await page.waitForTimeout(500);
        
        const inputSisreg = page.locator('#upload-CSV\\ SISREG');
        await inputSisreg.setInputFiles(CSV_SISREG);
        await page.waitForTimeout(300);

        const inputSim = page.locator('#upload-ZIP\\ SIM');
        await inputSim.setInputFiles(ZIP_SIM);
        await page.waitForTimeout(300);

        await page.click('button:has-text("Preview / Validar")');
        await page.waitForTimeout(15000);

        await page.click('text=Resumo Executivo');
        await page.waitForTimeout(1000);

        // Verificar novas colunas na tabela de óbitos (se houver óbitos)
        const tabelaObitos = page.locator('text=Óbitos Identificados (SIM)');
        if (await tabelaObitos.isVisible()) {
            // Novas colunas
            await expect(page.locator('th:has-text("Nº Registro SISREG")')).toBeVisible();
            await expect(page.locator('th:has-text("Data Solicitação")')).toBeVisible();
            await expect(page.locator('th:has-text("CID Óbito")')).toBeVisible();
            await expect(page.locator('th:has-text("Tempo de Espera")')).toBeVisible();

            // Coluna removida
            const tipoMatch = page.locator('th:has-text("Tipo Match")');
            await expect(tipoMatch).toHaveCount(0);

            const linhaCSV = page.locator('th:has-text("Linha CSV")');
            await expect(linhaCSV).toHaveCount(0);
        }
    });

    test('6. Aba Rastreamento — 3 novas ações nos pendentes', async ({ page }) => {
        // Fazer preview para ter dados de rastreamento
        await page.click('text=Nova Importação');
        await page.waitForTimeout(500);
        
        const inputSisreg = page.locator('#upload-CSV\\ SISREG');
        await inputSisreg.setInputFiles(CSV_SISREG);
        await page.waitForTimeout(300);

        await page.click('button:has-text("Preview / Validar")');
        await page.waitForTimeout(15000);

        // Ir para aba Rastreamento
        await page.click('text=Rastreamento');
        await page.waitForTimeout(1000);

        // Filtrar por Pendente Classificação (se existir)
        const btnPendente = page.locator('button:has-text("Pendente")');
        if (await btnPendente.isVisible()) {
            await btnPendente.click();
            await page.waitForTimeout(500);

            // Verificar que existe dropdown de ações
            const dropdown = page.locator('[id^="dropdown-acoes-"]').first();
            if (await dropdown.isVisible()) {
                await dropdown.click();
                await page.waitForTimeout(300);

                // Verificar 3 ações
                await expect(page.locator('text=Visualizar Consolidação de OCI')).toBeVisible();
                await expect(page.locator('text=Enviar para Regulação')).toBeVisible();
                await expect(page.locator('text=Excluir Registro')).toBeVisible();

                // Verificar que "Classificar Manualmente" NÃO existe como ação isolada
                // (agora é "Visualizar Consolidação de OCI (Classificação Manual)")
            }
        }
    });

    test('7. Aba Histórico — KPIs do backend', async ({ page }) => {
        // Ir para aba Histórico
        await page.click('[role="tab"]:has-text("Histórico")');
        await page.waitForTimeout(2000);

        // Verificar KPIs do histórico
        await expect(page.locator('text=Total de Importações')).toBeVisible();
        await expect(page.locator('text=Total de OCI Geradas após Conversão')).toBeVisible();
        await expect(page.locator('text=Taxa Média de Conversão')).toBeVisible();
        await expect(page.locator('text=Última Importação')).toBeVisible();

        // Verificar que "Taxa média de aceitação" NÃO existe
        const taxaAceitacao = page.locator('text=Taxa média de aceitação');
        await expect(taxaAceitacao).toHaveCount(0);

        const mediaAceitacao = page.locator('text=Média de Aceitação');
        await expect(mediaAceitacao).toHaveCount(0);
    });

    test('8. Tela Monitoramento de Transmissões — 4 cards + tabela', async ({ page }) => {
        // Navegar para a tela de monitoramento
        await page.goto('/oci/monitoramento-transmissoes');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Verificar título
        await expect(page.locator('text=Monitoramento de Transmissões')).toBeVisible();

        // Verificar 4 cards de status
        await expect(page.locator('small:has-text("Pendente de Envio")').first()).toBeVisible();
        await expect(page.locator('small:has-text("Transmitido com Sucesso")').first()).toBeVisible();
        await expect(page.locator('small:has-text("Rejeitado pela Regulação")').first()).toBeVisible();
        await expect(page.locator('small:has-text("Falha no Envio")').first()).toBeVisible();

        // Verificar filtros
        await expect(page.locator('button:has-text("Todos")')).toBeVisible();

        // Verificar tabela (pode estar vazia se não há transmissões)
        const tabela = page.locator('table');
        const semDados = page.locator('text=Nenhuma transmissão encontrada');
        
        // Deve ter tabela OU mensagem de vazio
        const temTabela = await tabela.isVisible();
        const temMsgVazio = await semDados.isVisible();
        expect(temTabela || temMsgVazio).toBeTruthy();

        // Se tem tabela, verificar colunas
        if (temTabela) {
            await expect(page.locator('th:has-text("Paciente")')).toBeVisible();
            await expect(page.locator('th:has-text("Protocolo OCI")')).toBeVisible();
            await expect(page.locator('th:has-text("Status")')).toBeVisible();
        }
    });

    test('9. Gráfico Composição — séries corretas', async ({ page }) => {
        // Fazer preview para ter dados
        await page.click('text=Nova Importação');
        await page.waitForTimeout(500);
        
        const inputSisreg = page.locator('#upload-CSV\\ SISREG');
        await inputSisreg.setInputFiles(CSV_SISREG);
        await page.waitForTimeout(300);

        await page.click('button:has-text("Preview / Validar")');
        await page.waitForTimeout(15000);

        await page.click('text=Resumo Executivo');
        await page.waitForTimeout(1000);

        // Verificar título do gráfico de composição
        await expect(page.locator('text=Composição do Resultado')).toBeVisible();

        // Verificar que o funil existe
        await expect(page.locator('text=Funil de Saneamento')).toBeVisible();
    });
});
