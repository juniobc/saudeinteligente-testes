/**
 * Debug — Importação SISREG no ambiente desen.prosystema.com.br
 * 
 * Objetivo: Diagnosticar por que o rastreamento não aparece no desen.
 * Captura: status HTTP, headers, body da resposta, erros de console.
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Desabilita storageState — vamos logar do zero no desen
test.use({ storageState: undefined });

// Timeout generoso para processamento
test.setTimeout(300000); // 5 minutos

test.describe('Debug Importação SISREG — Ambiente Desen', () => {

    test('Importar arquivos e capturar resposta do preview', async ({ page }) => {
        const logs = [];
        const networkErrors = [];
        let previewResponse = null;
        let previewResponseBody = null;

        // Capturar TODOS os logs do console
        page.on('console', msg => {
            logs.push({ type: msg.type(), text: msg.text(), time: new Date().toISOString() });
        });

        // Capturar erros de página
        page.on('pageerror', err => {
            logs.push({ type: 'PAGE_ERROR', text: err.message, time: new Date().toISOString() });
        });

        // Interceptar resposta do endpoint de preview
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('/oci/importacao-sisreg/preview')) {
                previewResponse = {
                    status: response.status(),
                    statusText: response.statusText(),
                    headers: response.headers(),
                    url: url,
                };
                try {
                    previewResponseBody = await response.json();
                } catch (e) {
                    try {
                        previewResponseBody = await response.text();
                    } catch (e2) {
                        previewResponseBody = `ERRO AO LER BODY: ${e2.message}`;
                    }
                }
            }
            // Capturar erros de rede (4xx, 5xx)
            if (response.status() >= 400) {
                let body = '';
                try { body = await response.text(); } catch (e) { body = 'N/A'; }
                networkErrors.push({
                    url: url,
                    status: response.status(),
                    body: body.substring(0, 500),
                    time: new Date().toISOString(),
                });
            }
        });

        // ============================================================
        // 1. LOGIN
        // ============================================================
        console.log('[DEBUG] Navegando para login...');
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Selecionar município se combo visível
        const municipioSelect = page.locator('#municipio-select');
        if (await municipioSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('[DEBUG] Selecionando município br_distrito_federal...');
            await municipioSelect.selectOption(process.env.E2E_MUNICIPIO || 'br_distrito_federal');
            await page.waitForTimeout(1000);
        }

        // Preencher credenciais
        console.log('[DEBUG] Preenchendo credenciais...');
        await page.locator('#signin-username').fill(process.env.E2E_USERNAME);
        await page.locator('#signin-password').fill(process.env.E2E_PASSWORD);
        await page.locator('button[type="submit"]').click();

        // Aguardar redirecionamento pós-login
        await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
        console.log('[DEBUG] Login OK. URL:', page.url());

        // ============================================================
        // 2. NAVEGAR ATÉ MÓDULO OCI
        // ============================================================
        // Screenshot para ver o que aparece após login
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'guardian/reports/screenshots/debug-desen-pos-login.png', fullPage: true });
        console.log('[DEBUG] URL pós-login:', page.url());

        // Selecionar grupo PATE (tentar vários seletores)
        const cardPATE = page.locator('h4, h5, .card-title, [class*="card"]', { hasText: /PATE|Especializada|Atenção/i }).first();
        if (await cardPATE.isVisible({ timeout: 10000 }).catch(() => false)) {
            await cardPATE.click();
            console.log('[DEBUG] PATE selecionado.');
            await page.waitForTimeout(3000);
        } else {
            console.log('[DEBUG] Card PATE não encontrado. Tentando navegar direto...');
            // Tentar navegar direto para OCI
            await page.goto('/oci/dashboard');
            await page.waitForLoadState('networkidle');
        }

        // Screenshot para ver tela de sistemas
        await page.screenshot({ path: 'guardian/reports/screenshots/debug-desen-sistemas.png', fullPage: true });
        console.log('[DEBUG] URL após PATE:', page.url());

        // Selecionar sistema OCI (tentar vários seletores)
        if (page.url().includes('/sistemas')) {
            const cardOCI = page.locator('a, .card-link, .card, [class*="card"]', { hasText: /Ofertas de Cuidados|OCI|Integrad/i }).first();
            if (await cardOCI.isVisible({ timeout: 10000 }).catch(() => false)) {
                await cardOCI.click();
                console.log('[DEBUG] Card OCI clicado.');
            } else {
                console.log('[DEBUG] Card OCI não encontrado. Navegando direto...');
                await page.goto('/oci/dashboard');
            }
            await page.waitForTimeout(3000);
        }

        // Se ainda não está no OCI, navegar direto
        if (!page.url().includes('/oci')) {
            console.log('[DEBUG] Não chegou no OCI. Navegando direto para /oci/dashboard...');
            await page.goto('/oci/dashboard');
            await page.waitForLoadState('networkidle');
        }

        await page.waitForTimeout(2000);
        console.log('[DEBUG] Módulo OCI. URL:', page.url());
        await page.screenshot({ path: 'guardian/reports/screenshots/debug-desen-oci-dashboard.png', fullPage: true });

        // ============================================================
        // 3. NAVEGAR ATÉ TELA DE IMPORTAÇÃO SISREG
        // ============================================================
        // Navegar diretamente pela URL
        await page.goto('/oci/importacao-sisreg');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        console.log('[DEBUG] Tela de importação. URL:', page.url());

        // Capturar screenshot da tela
        await page.screenshot({ path: 'guardian/reports/screenshots/debug-desen-importacao-tela.png', fullPage: true });

        // Verificar se a tela carregou (procurar por "Nova Importação" ou similar)
        const tabNova = page.locator('text=Nova Importação').first();
        if (await tabNova.isVisible({ timeout: 5000 }).catch(() => false)) {
            await tabNova.click();
            await page.waitForTimeout(500);
        }

        // ============================================================
        // 4. UPLOAD DOS ARQUIVOS
        // ============================================================
        const basePath = path.resolve(__dirname, '../../docs/atividades/teste_carga_sisreg_sia_sim/backup_20260510_095400');
        
        const csvSisreg = path.join(basePath, 'sisreg_teste_oftalmo_200.csv');
        const zipSia = path.join(basePath, 'sia_teste_oftalmo_50.zip');
        const zipSim = path.join(basePath, 'sim_teste_oftalmo_20.zip');

        console.log('[DEBUG] Arquivos:');
        console.log('  CSV SISREG:', csvSisreg);
        console.log('  ZIP SIA:', zipSia);
        console.log('  ZIP SIM:', zipSim);

        // Upload CSV SISREG
        const inputCsv = page.locator('#upload-CSV\\ SISREG');
        await inputCsv.setInputFiles(csvSisreg);
        await page.waitForTimeout(500);
        console.log('[DEBUG] CSV SISREG uploaded.');

        // Upload ZIP SIA
        const inputSia = page.locator('#upload-ZIP\\ SIA\\/SUS');
        await inputSia.setInputFiles(zipSia);
        await page.waitForTimeout(500);
        console.log('[DEBUG] ZIP SIA uploaded.');

        // Upload ZIP SIM
        const inputSim = page.locator('#upload-ZIP\\ SIM');
        await inputSim.setInputFiles(zipSim);
        await page.waitForTimeout(500);
        console.log('[DEBUG] ZIP SIM uploaded.');

        // Screenshot após uploads
        await page.screenshot({ path: 'guardian/reports/screenshots/debug-desen-importacao-uploads.png', fullPage: true });

        // ============================================================
        // 5. CLICAR EM PREVIEW
        // ============================================================
        console.log('[DEBUG] Clicando em Preview...');
        const btnPreview = page.locator('button', { hasText: /Preview|Validar/i });
        await btnPreview.click();

        // Aguardar resposta (até 4 minutos)
        console.log('[DEBUG] Aguardando resposta do preview (timeout 240s)...');
        
        // Esperar até que previewResponse seja preenchido OU timeout
        const startTime = Date.now();
        while (!previewResponse && (Date.now() - startTime) < 240000) {
            await page.waitForTimeout(2000);
        }

        // Screenshot após preview
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'guardian/reports/screenshots/debug-desen-importacao-resultado.png', fullPage: true });

        // ============================================================
        // 6. RELATÓRIO DE DIAGNÓSTICO
        // ============================================================
        console.log('\n========================================');
        console.log('   RELATÓRIO DE DIAGNÓSTICO');
        console.log('========================================\n');

        if (previewResponse) {
            console.log('[RESPOSTA HTTP]');
            console.log('  Status:', previewResponse.status, previewResponse.statusText);
            console.log('  URL:', previewResponse.url);
            console.log('  Content-Type:', previewResponse.headers['content-type'] || 'N/A');
            
            if (previewResponseBody) {
                if (typeof previewResponseBody === 'object') {
                    console.log('\n[BODY DA RESPOSTA]');
                    console.log('  modo:', previewResponseBody.modo);
                    console.log('  dry_run:', previewResponseBody.dry_run);
                    console.log('  tempo_segundos:', previewResponseBody.tempo_segundos);
                    console.log('  erros:', JSON.stringify(previewResponseBody.erros || []));
                    
                    const stats = previewResponseBody.stats || {};
                    console.log('\n[STATS]');
                    console.log('  sisreg_lidos:', stats.sisreg_lidos);
                    console.log('  sia_lidos:', stats.sia_lidos);
                    console.log('  sia_filtrados:', stats.sia_filtrados);
                    console.log('  sim_lidos:', stats.sim_lidos);
                    console.log('  contadores:', JSON.stringify(stats.contadores || {}));
                    console.log('  por_grupo:', JSON.stringify(stats.por_grupo || {}));
                    
                    const rastreamento = previewResponseBody.rastreamento || [];
                    console.log('\n[RASTREAMENTO]');
                    console.log('  Total de registros:', rastreamento.length);
                    if (rastreamento.length > 0) {
                        console.log('  Primeiro:', JSON.stringify(rastreamento[0]));
                        // Contagem por status
                        const porStatus = {};
                        rastreamento.forEach(r => { porStatus[r.status] = (porStatus[r.status] || 0) + 1; });
                        console.log('  Por status:', JSON.stringify(porStatus));
                    } else {
                        console.log('  ⚠️ RASTREAMENTO VAZIO!');
                    }

                    const obitos = previewResponseBody.obitos || [];
                    console.log('\n[OBITOS]');
                    console.log('  Total:', obitos.length);
                } else {
                    console.log('\n[BODY (texto)]:', String(previewResponseBody).substring(0, 1000));
                }
            }
        } else {
            console.log('⚠️ NENHUMA RESPOSTA RECEBIDA DO ENDPOINT /preview');
            console.log('  Possíveis causas: timeout do proxy, erro de rede, CORS');
        }

        if (networkErrors.length > 0) {
            console.log('\n[ERROS DE REDE]');
            networkErrors.forEach(e => {
                console.log(`  ${e.status} ${e.url}`);
                console.log(`    Body: ${e.body}`);
            });
        }

        // Filtrar logs relevantes (erros, warnings, e logs da API)
        const logsRelevantes = logs.filter(l => 
            l.type === 'error' || l.type === 'warning' || l.type === 'PAGE_ERROR' ||
            l.text.includes('X-Tenant-ID') || l.text.includes('importacao') ||
            l.text.includes('Municipio')
        );
        if (logsRelevantes.length > 0) {
            console.log('\n[LOGS RELEVANTES DO CONSOLE]');
            logsRelevantes.forEach(l => {
                console.log(`  [${l.type}] ${l.text}`);
            });
        }

        // Verificar o header X-Tenant-ID que foi enviado
        const tenantLogs = logs.filter(l => l.text.includes('X-Tenant-ID'));
        if (tenantLogs.length > 0) {
            console.log('\n[TENANT ENVIADO]');
            tenantLogs.forEach(l => console.log(`  ${l.text}`));
        }

        console.log('\n========================================');
        console.log('   FIM DO RELATÓRIO');
        console.log('========================================\n');

        // Assert para que o teste "falhe" com informação útil se rastreamento vazio
        if (previewResponse) {
            expect(previewResponse.status, 'Status HTTP deve ser 200').toBe(200);
            if (typeof previewResponseBody === 'object') {
                const rastreamento = previewResponseBody.rastreamento || [];
                expect(rastreamento.length, 'Rastreamento não deve estar vazio').toBeGreaterThan(0);
            }
        } else {
            expect(previewResponse, 'Resposta do preview não foi recebida (timeout/erro de rede)').not.toBeNull();
        }
    });
});
