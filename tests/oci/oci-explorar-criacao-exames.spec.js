// Spec Exploratório — Simular criação de OCI e observar comportamento dos exames
// Guardian — Agente de Testes E2E
// Objetivo: Navegar pelo fluxo de criação de OCI para entender como o sistema
// trata procedimentos/exames, especialmente quantidade e configuração.

import { test, expect } from '@playwright/test';

test.describe('Exploração — Criação de OCI e Exames', () => {

  test('Explorar fluxo de criação de OCI até os exames', async ({ page }) => {
    // === PASSO 1: Navegar para a tela de Consulta/Cadastro OCI ===
    console.log('[GUARDIAN] Navegando para /oci/dashboard/consulta_cadastro...');
    await page.goto('/oci/dashboard/consulta_cadastro');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'reports/screenshots/explorar-01-tela-oci.png', fullPage: true });
    console.log('[GUARDIAN] Screenshot 01 capturado — tela OCI');

    // === PASSO 2: Clicar em "Solicitar OCI" ===
    const btnSolicitar = page.getByText('Solicitar OCI');
    const btnVisivel = await btnSolicitar.isVisible({ timeout: 10000 }).catch(() => false);
    console.log(`[GUARDIAN] Botão "Solicitar OCI" visível: ${btnVisivel}`);
    
    if (!btnVisivel) {
      console.log('[GUARDIAN] Botão não encontrado. Capturando estado...');
      await page.screenshot({ path: 'reports/screenshots/explorar-02-btn-nao-encontrado.png', fullPage: true });
      return;
    }

    await btnSolicitar.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'reports/screenshots/explorar-02-modal-especialidades.png', fullPage: true });
    console.log('[GUARDIAN] Screenshot 02 — modal de especialidades');

    // === PASSO 3: Selecionar especialidade (Oftalmologia) ===
    const cardOftalmo = page.locator('.especialidade-option', { hasText: /Oftalmologia/i }).first();
    const oftalmoVisivel = await cardOftalmo.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[GUARDIAN] Card Oftalmologia visível: ${oftalmoVisivel}`);

    if (!oftalmoVisivel) {
      // Listar especialidades disponíveis
      const cards = page.locator('.especialidade-option h6');
      const nomes = await cards.allTextContents();
      console.log(`[GUARDIAN] Especialidades disponíveis: ${JSON.stringify(nomes)}`);
      await page.screenshot({ path: 'reports/screenshots/explorar-03-especialidades-disponiveis.png', fullPage: true });
      
      // Tentar clicar na primeira disponível
      if (nomes.length > 0) {
        await page.locator('.especialidade-option').first().click();
        await page.waitForTimeout(2000);
      } else {
        return;
      }
    } else {
      await cardOftalmo.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'reports/screenshots/explorar-03-formulario-nova-oci.png', fullPage: true });
    console.log('[GUARDIAN] Screenshot 03 — formulário de nova solicitação');

    // === PASSO 4: Explorar o formulário — listar todos os campos visíveis ===
    const modal = page.locator('.modal').filter({ hasText: /Nova Solicitação|Solicitação/i }).first();
    const modalAberto = await modal.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[GUARDIAN] Modal de solicitação aberto: ${modalAberto}`);

    if (modalAberto) {
      // Listar todos os labels visíveis no modal
      const labels = await modal.locator('label:visible').allTextContents();
      console.log(`[GUARDIAN] Labels no formulário: ${JSON.stringify(labels)}`);

      // Listar todos os selects (data-field-name)
      const selects = await modal.locator('[data-field-name]').evaluateAll(els => 
        els.map(el => el.getAttribute('data-field-name'))
      );
      console.log(`[GUARDIAN] Selects (data-field-name): ${JSON.stringify(selects)}`);

      // Listar todos os inputs (name)
      const inputs = await modal.locator('input[name], textarea[name]').evaluateAll(els => 
        els.map(el => ({ name: el.getAttribute('name'), type: el.type }))
      );
      console.log(`[GUARDIAN] Inputs: ${JSON.stringify(inputs)}`);

      await page.screenshot({ path: 'reports/screenshots/explorar-04-campos-formulario.png', fullPage: true });
    }

    // === PASSO 5: Selecionar Linha de Cuidado para ver os procedimentos ===
    const campoLinha = modal.locator('[data-field-name="id_linha_cuidado"]');
    const linhaVisivel = await campoLinha.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (linhaVisivel) {
      await campoLinha.locator('.Select2__control').click();
      await page.waitForTimeout(1000);
      
      // Listar opções de linha de cuidado
      const opcoes = await page.locator('.Select2__option').allTextContents();
      console.log(`[GUARDIAN] Linhas de cuidado disponíveis: ${JSON.stringify(opcoes)}`);
      await page.screenshot({ path: 'reports/screenshots/explorar-05-linhas-cuidado.png', fullPage: true });

      // Selecionar a primeira opção
      if (opcoes.length > 0) {
        await page.locator('.Select2__option').first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'reports/screenshots/explorar-06-linha-selecionada.png', fullPage: true });
        console.log(`[GUARDIAN] Linha selecionada: ${opcoes[0]}`);
      }
    }

    // === PASSO 6: Preencher campos obrigatórios para tentar submeter ===
    // Selecionar unidade
    const campoUnidade = modal.locator('[data-field-name="co_cnes_solicitante"]');
    if (await campoUnidade.isVisible({ timeout: 3000 }).catch(() => false)) {
      await campoUnidade.locator('.Select2__control').click();
      await page.keyboard.type('UPA');
      await page.waitForTimeout(1000);
      const opcaoUnidade = page.locator('.Select2__option').first();
      if (await opcaoUnidade.isVisible({ timeout: 3000 }).catch(() => false)) {
        await opcaoUnidade.click();
        await page.waitForTimeout(500);
      }
    }

    // Selecionar paciente
    const campoPaciente = modal.locator('[data-field-name="co_pac"]');
    if (await campoPaciente.isVisible({ timeout: 3000 }).catch(() => false)) {
      await campoPaciente.locator('.Select2__control').click();
      await page.keyboard.type('MARIA');
      await page.waitForTimeout(2000);
      const opcaoPac = page.locator('.Select2__option').first();
      if (await opcaoPac.isVisible({ timeout: 5000 }).catch(() => false)) {
        await opcaoPac.click();
        await page.waitForTimeout(500);
      }
    }

    // Selecionar CID
    const campoCID = modal.locator('[data-field-name="co_cid"]');
    if (await campoCID.isVisible({ timeout: 3000 }).catch(() => false)) {
      await campoCID.locator('.Select2__control').click();
      await page.waitForTimeout(500);
      const opcaoCID = page.locator('.Select2__option').first();
      if (await opcaoCID.isVisible({ timeout: 3000 }).catch(() => false)) {
        await opcaoCID.click();
      }
    }

    // Selecionar profissional
    const campoProf = modal.locator('[data-field-name="nu_cns_solicitante"]');
    if (await campoProf.isVisible({ timeout: 3000 }).catch(() => false)) {
      await campoProf.locator('.Select2__control').click();
      await page.waitForTimeout(1000);
      const opcaoProf = page.locator('.Select2__option').first();
      if (await opcaoProf.isVisible({ timeout: 3000 }).catch(() => false)) {
        await opcaoProf.click();
      }
    }

    // Preencher justificativa
    const campoJust = modal.locator('textarea[name="ds_justificativa"]');
    if (await campoJust.isVisible({ timeout: 3000 }).catch(() => false)) {
      await campoJust.fill('Teste exploratório Guardian — simulação de criação OCI para mapear exames');
    }

    await page.screenshot({ path: 'reports/screenshots/explorar-07-formulario-preenchido.png', fullPage: true });
    console.log('[GUARDIAN] Screenshot 07 — formulário preenchido');

    // === PASSO 7: Capturar o estado final antes de submeter ===
    // NÃO vamos submeter — apenas capturar o estado do formulário
    // para ver como os procedimentos/exames são configurados
    
    // Verificar se há seção de procedimentos/exames visível
    const secaoProcs = modal.locator('text=/procedimento|exame/i');
    const procsVisiveis = await secaoProcs.count();
    console.log(`[GUARDIAN] Elementos com texto procedimento/exame: ${procsVisiveis}`);

    // Capturar todo o HTML do modal para análise
    const modalHTML = await modal.innerHTML();
    console.log(`[GUARDIAN] Tamanho do HTML do modal: ${modalHTML.length} chars`);
    
    // Procurar por campos de quantidade no modal
    const camposQt = await modal.locator('[name*="qt"], [name*="quantidade"], [data-field-name*="qt"]').evaluateAll(els =>
      els.map(el => ({ tag: el.tagName, name: el.getAttribute('name'), dfn: el.getAttribute('data-field-name'), value: el.value }))
    );
    console.log(`[GUARDIAN] Campos de quantidade encontrados: ${JSON.stringify(camposQt)}`);

    await page.screenshot({ path: 'reports/screenshots/explorar-08-estado-final.png', fullPage: true });
    console.log('[GUARDIAN] Screenshot 08 — estado final (NÃO submetido)');
    console.log('[GUARDIAN] Exploração concluída. Verifique os screenshots em reports/screenshots/');
  });
});
