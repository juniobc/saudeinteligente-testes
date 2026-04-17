// Spec — Solicitação OCI de Oncologia (Atenção em Oncologia)
// Guardian — Testes E2E do módulo OCI
// Fluxo: CadOCI → Solicitar OCI → Selecionar "Atenção em Oncologia" → Preencher Formulário → Salvar

import { test, expect } from '@playwright/test';
import CadOCIPage from '../../page-objects/CadOCIPage.js';
import SolicitacaoModal from '../../page-objects/SolicitacaoModal.js';
import { waitForModalOpen } from '../../tools/component-helpers.js';

const ESPECIALIDADE = 'Oncologia';

test.describe('Solicitação OCI — Atenção em Oncologia', () => {
  let cadOCI;
  let solicitacaoModal;

  test.beforeEach(async ({ page }) => {
    cadOCI = new CadOCIPage(page);
    solicitacaoModal = new SolicitacaoModal(page);

    // Navega para a tela de Consulta/Cadastro OCI
    await cadOCI.goto();
    await page.getByText('Solicitar OCI').waitFor({ state: 'visible', timeout: 15000 });
  });

  test('Req 1 - Especialidade Oncologia está disponível no modal de seleção', async ({ page }) => {
    await cadOCI.clickNovaSolicitacao();
    const modal = await waitForModalOpen(page, 'Selecione a Especialidade');

    // Verifica que o card de Oncologia existe
    const cardOncologia = modal.locator('.especialidade-option', { hasText: /Oncologia/i });
    await expect(cardOncologia).toBeVisible({ timeout: 5000 });

    // Log das especialidades disponíveis
    const especialidades = await modal.locator('.especialidade-option').allTextContents();
    console.log(`[TESTE] Especialidades disponíveis: ${especialidades.map(e => e.trim()).join(', ')}`);
    console.log('[TESTE] ✅ Especialidade Oncologia encontrada');
  });

  test('Req 2 - Seleção de Oncologia abre formulário com campos corretos', async ({ page }) => {
    await cadOCI.clickNovaSolicitacao();
    await waitForModalOpen(page, 'Selecione a Especialidade');

    // Seleciona Oncologia
    await cadOCI.selectEspecialidadeModal(ESPECIALIDADE);

    // Aguarda formulário de nova solicitação abrir
    const modalForm = await waitForModalOpen(page, 'Nova Solicitação');
    await expect(modalForm).toBeVisible();

    // Aguarda loading desaparecer
    const loading = page.locator('.d-flex.flex-column.justify-content-center.align-items-center');
    await loading.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Verifica campos obrigatórios do formulário
    await expect(modalForm.locator('[data-field-name="id_linha_cuidado"]').first()).toBeVisible();
    await expect(modalForm.locator('[data-field-name="co_pac"]').first()).toBeVisible();
    await expect(modalForm.locator('[data-field-name="co_cid"]').first()).toBeVisible();
    await expect(modalForm.locator('textarea[name="ds_justificativa"]')).toBeVisible();

    // Verifica unidade responsável pré-preenchida
    const unidadeValue = await modalForm.locator('[data-field-name="co_cnes_solicitante"]').first()
      .locator('.Select2__single-value').textContent().catch(() => '');
    console.log(`[TESTE] Unidade Responsável (pré-preenchida): "${unidadeValue?.trim()}"`);
    expect(unidadeValue?.trim()).toBeTruthy();

    // Captura screenshot do formulário
    await page.screenshot({
      path: 'reports/screenshots/oci-oncologia-formulario-aberto.png',
      fullPage: true,
    });

    console.log('[TESTE] ✅ Formulário de Oncologia aberto com todos os campos');
  });

  test('Req 3 - Preenchimento completo e submissão cria solicitação de Oncologia', async ({ page }) => {
    test.setTimeout(60000); // Timeout maior — muitos campos para preencher
    // Abre modal de especialidades e seleciona Oncologia
    await cadOCI.clickNovaSolicitacao();
    await waitForModalOpen(page, 'Selecione a Especialidade');
    await cadOCI.selectEspecialidadeModal(ESPECIALIDADE);

    // Aguarda formulário abrir
    const modalForm = await waitForModalOpen(page, 'Nova Solicitação');

    // Aguarda loading desaparecer
    const loading = page.locator('.d-flex.flex-column.justify-content-center.align-items-center');
    await loading.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // 1. Seleciona Linha de Cuidado (primeira disponível para Oncologia)
    const linhaCuidado = modalForm.locator('[data-field-name="id_linha_cuidado"]').first();
    await linhaCuidado.locator('.Select2__control').click();
    await page.waitForTimeout(500);
    const primeiraLinha = page.locator('.Select2__option').first();
    await primeiraLinha.waitFor({ state: 'visible', timeout: 5000 });
    const nomeLinha = await primeiraLinha.textContent();
    console.log(`[TESTE] Linha de Cuidado selecionada: "${nomeLinha?.trim()}"`);
    await primeiraLinha.click();
    await page.waitForTimeout(500);

    // 2. Busca e seleciona Paciente (autocomplete)
    const paciente = modalForm.locator('[data-field-name="co_pac"]').first();
    await paciente.locator('.Select2__control').click();
    await page.keyboard.type('Maria');
    await page.waitForTimeout(2000);
    const primeiroPaciente = page.locator('.Select2__option').first();
    await primeiroPaciente.waitFor({ state: 'visible', timeout: 10000 });
    const nomePaciente = await primeiroPaciente.textContent();
    console.log(`[TESTE] Paciente selecionado: "${nomePaciente?.trim()}"`);
    await primeiroPaciente.click();
    await page.waitForTimeout(500);

    // 3. Seleciona CID (primeiro disponível — filtrado pela linha de cuidado)
    const cid = modalForm.locator('[data-field-name="co_cid"]').first();
    await cid.locator('.Select2__control').click();
    await page.waitForTimeout(1000);
    const primeiroCID = page.locator('.Select2__option').first();
    await primeiroCID.waitFor({ state: 'visible', timeout: 5000 });
    const nomeCID = await primeiroCID.textContent();
    console.log(`[TESTE] CID selecionado: "${nomeCID?.trim()}"`);
    await primeiroCID.click();
    await page.waitForTimeout(500);

    // 4. Seleciona Profissional Solicitante
    const profissional = modalForm.locator('[data-field-name="nu_cns_solicitante"]').first();
    await profissional.locator('.Select2__control').click();
    await page.waitForTimeout(500);
    await page.keyboard.type('a');
    await page.waitForTimeout(2000);
    // Aguarda opções aparecerem (não apenas o menu container)
    const opcaoProf = page.locator('.Select2__option').first();
    const opcaoProfVisible = await opcaoProf.isVisible({ timeout: 5000 }).catch(() => false);
    if (opcaoProfVisible) {
      const nomeProfissional = await opcaoProf.textContent();
      console.log(`[TESTE] Profissional selecionado: "${nomeProfissional?.trim()}"`);
      await opcaoProf.click();
    } else {
      // Verifica se já está pré-preenchido
      const valorPreenchido = await profissional.locator('.Select2__single-value').textContent().catch(() => '');
      if (valorPreenchido) {
        console.log(`[TESTE] Profissional já pré-preenchido: "${valorPreenchido.trim()}"`);
      } else {
        console.log('[TESTE] ⚠️ Nenhuma opção de profissional disponível');
      }
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);

    // 5. Preenche Justificativa
    await modalForm.locator('textarea[name="ds_justificativa"]').fill(
      'Teste automatizado Guardian — solicitação OCI de Atenção em Oncologia'
    );

    // Captura screenshot antes de salvar
    await page.screenshot({
      path: 'reports/screenshots/oci-oncologia-antes-salvar.png',
      fullPage: true,
    });

    // 6. Clica em Salvar
    const btnSalvar = modalForm.locator('button', { hasText: 'Salvar' });
    await btnSalvar.click();

    // Aguarda resultado
    await page.waitForTimeout(3000);

    // Verifica toast de resultado
    const toastSuccess = page.locator('.Toastify__toast--success');
    const toastError = page.locator('.Toastify__toast--error');

    const hasSuccess = await toastSuccess.isVisible({ timeout: 5000 }).catch(() => false);
    const hasError = await toastError.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasSuccess) {
      const texto = await toastSuccess.first().textContent();
      console.log(`[TESTE] ✅ Solicitação de Oncologia criada! Toast: "${texto}"`);
    }
    if (hasError) {
      const texto = await toastError.first().textContent();
      console.log(`[TESTE] ❌ Erro ao criar solicitação. Toast: "${texto}"`);
    }
    if (!hasSuccess && !hasError) {
      const validationErrors = await modalForm.locator('.invalid-feedback').allTextContents();
      if (validationErrors.length > 0) {
        console.log(`[TESTE] ⚠️ Erros de validação: ${JSON.stringify(validationErrors)}`);
      } else {
        console.log('[TESTE] ⚠️ Nenhum toast apareceu e nenhum erro de validação');
      }
    }

    // Captura screenshot após salvar
    await page.screenshot({
      path: 'reports/screenshots/oci-oncologia-apos-salvar.png',
      fullPage: true,
    });

    expect(hasSuccess).toBe(true);
  });
});
