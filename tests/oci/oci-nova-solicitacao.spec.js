// Spec — Nova Solicitação OCI (Cadastro de Oferta de Cuidado Integrado)
// Guardian — Testes E2E do módulo OCI
// Fluxo: Consulta/Cadastro OCI → Solicitar OCI → Selecionar Especialidade → Preencher Formulário → Salvar

import { test, expect } from '@playwright/test';
import { selectReactSelectOption, waitForModalOpen } from '../../tools/component-helpers.js';
import { waitForToast } from '../../tools/helpers.js';

test.describe('Nova Solicitação OCI — Módulo OCI', () => {

  test.beforeEach(async ({ page }) => {
    // Navega para a tela de Consulta/Cadastro OCI
    await page.goto('/oci/dashboard/consulta_cadastro');
    await page.waitForLoadState('networkidle');
    // Aguarda o botão "Solicitar OCI" ficar visível (indica que a tela carregou)
    await page.getByText('Solicitar OCI').waitFor({ state: 'visible', timeout: 15000 });
  });

  test('Req 1.1 - Botão "Solicitar OCI" abre modal de seleção de especialidades', async ({ page }) => {
    // Clica no botão "Solicitar OCI"
    await page.getByText('Solicitar OCI').click();

    // Aguarda o modal de especialidades abrir
    const modal = await waitForModalOpen(page, 'Selecione a Especialidade');

    // Verifica que o modal está visível
    await expect(modal).toBeVisible();

    // Verifica que existem cards de especialidade
    const cards = modal.locator('.especialidade-option');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Captura as especialidades disponíveis para log
    const especialidades = await cards.allTextContents();
    console.log(`[TESTE] Especialidades encontradas (${count}):`, especialidades.map(e => e.trim()));
  });

  test('Req 1.2 - Seleção de especialidade abre formulário de nova solicitação', async ({ page }) => {
    // Abre modal de especialidades
    await page.getByText('Solicitar OCI').click();
    const modalEsp = await waitForModalOpen(page, 'Selecione a Especialidade');

    // Clica na primeira especialidade disponível
    const primeiraEsp = modalEsp.locator('.especialidade-option').first();
    const nomeEsp = await primeiraEsp.textContent();
    console.log(`[TESTE] Selecionando especialidade: ${nomeEsp?.trim()}`);
    await primeiraEsp.click();

    // Aguarda o formulário de nova solicitação abrir
    const modalForm = await waitForModalOpen(page, 'Nova Solicitação');

    // Verifica que o formulário está visível
    await expect(modalForm).toBeVisible();

    // Verifica que os campos principais existem dentro do modal
    await expect(modalForm.locator('[data-field-name="id_linha_cuidado"]').first()).toBeVisible();
    await expect(modalForm.locator('[data-field-name="co_pac"]').first()).toBeVisible();
    await expect(modalForm.locator('textarea[name="ds_justificativa"]')).toBeVisible();

    console.log('[TESTE] Formulário de nova solicitação aberto com campos visíveis');
  });

  test('Req 1.3 - Preenchimento completo e submissão cria solicitação OCI', async ({ page }) => {
    // Abre modal de especialidades
    await page.getByText('Solicitar OCI').click();
    await waitForModalOpen(page, 'Selecione a Especialidade');

    // Seleciona primeira especialidade
    await page.locator('.especialidade-option').first().click();

    // Aguarda formulário abrir
    const modalForm = await waitForModalOpen(page, 'Nova Solicitação');

    // Aguarda loading desaparecer (overlay que intercepta cliques)
    const loading = page.locator('.d-flex.flex-column.justify-content-center.align-items-center');
    await loading.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500); // Aguarda campos carregarem

    // Nota: Unidade Responsável (co_cnes_solicitante) vem pré-preenchida e DESABILITADA
    // É a unidade do usuário logado — não precisa selecionar
    const unidadeValue = await modalForm.locator('[data-field-name="co_cnes_solicitante"]').first()
      .locator('.Select2__single-value').textContent().catch(() => 'não preenchida');
    console.log(`[TESTE] Unidade Responsável (pré-preenchida): ${unidadeValue?.trim()}`);

    // 1. Seleciona Linha de Cuidado (primeira disponível)
    const linhaCuidado = modalForm.locator('[data-field-name="id_linha_cuidado"]').first();
    await linhaCuidado.locator('.Select2__control').click();
    await page.waitForTimeout(500);
    const primeiraLinha = page.locator('.Select2__option').first();
    await primeiraLinha.waitFor({ state: 'visible', timeout: 5000 });
    const nomeLinha = await primeiraLinha.textContent();
    console.log(`[TESTE] Selecionando linha de cuidado: ${nomeLinha?.trim()}`);
    await primeiraLinha.click();
    await page.waitForTimeout(500);

    // 2. Busca e seleciona Paciente (autocomplete)
    const paciente = modalForm.locator('[data-field-name="co_pac"]').first();
    await paciente.locator('.Select2__control').click();
    await page.keyboard.type('Maria');
    await page.waitForTimeout(2000); // Aguarda debounce + API
    const primeiroPaciente = page.locator('.Select2__option').first();
    await primeiroPaciente.waitFor({ state: 'visible', timeout: 10000 });
    const nomePaciente = await primeiroPaciente.textContent();
    console.log(`[TESTE] Selecionando paciente: ${nomePaciente?.trim()}`);
    await primeiroPaciente.click();
    await page.waitForTimeout(500);

    // 3. Seleciona CID (primeiro disponível)
    const cid = modalForm.locator('[data-field-name="co_cid"]').first();
    await cid.locator('.Select2__control').click();
    await page.waitForTimeout(1000);
    const primeiroCID = page.locator('.Select2__option').first();
    await primeiroCID.waitFor({ state: 'visible', timeout: 5000 });
    const nomeCID = await primeiroCID.textContent();
    console.log(`[TESTE] Selecionando CID: ${nomeCID?.trim()}`);
    await primeiroCID.click();
    await page.waitForTimeout(500);

    // 3.5. Seleciona Profissional Solicitante (primeiro disponível)
    const profissional = modalForm.locator('[data-field-name="nu_cns_solicitante"]').first();
    await profissional.locator('.Select2__control').click();
    await page.waitForTimeout(500);
    // Tenta digitar para acionar busca (pode ser autocomplete)
    await page.keyboard.type('a');
    await page.waitForTimeout(1500);
    const menuProf = page.locator('.Select2__menu').first();
    const menuProfVisible = await menuProf.isVisible({ timeout: 3000 }).catch(() => false);
    if (menuProfVisible) {
      const primeiroProfissional = page.locator('.Select2__option').first();
      const nomeProfissional = await primeiroProfissional.textContent();
      console.log(`[TESTE] Selecionando profissional: ${nomeProfissional?.trim()}`);
      await primeiroProfissional.click();
    } else {
      console.log('[TESTE] ⚠️ Menu de profissional não abriu — pode já estar pré-preenchido');
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);

    // 4. Preenche Justificativa
    await modalForm.locator('textarea[name="ds_justificativa"]').fill(
      'Teste automatizado Guardian — validação do fluxo de cadastro de nova solicitação OCI'
    );

    // Captura screenshot antes de salvar
    await page.screenshot({ path: 'reports/screenshots/oci-nova-solicitacao-antes-salvar.png', fullPage: true });

    // 5. Clica em Salvar
    const btnSalvar = modalForm.locator('button', { hasText: 'Salvar' });
    await btnSalvar.click();

    // Aguarda resultado (toast de sucesso ou erro)
    await page.waitForTimeout(3000);

    // Verifica se apareceu toast
    const toastSuccess = page.locator('.Toastify__toast--success');
    const toastError = page.locator('.Toastify__toast--error');

    const hasSuccess = await toastSuccess.isVisible({ timeout: 5000 }).catch(() => false);
    const hasError = await toastError.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasSuccess) {
      const texto = await toastSuccess.first().textContent();
      console.log(`[TESTE] ✅ Solicitação criada com sucesso! Toast: "${texto}"`);
    }
    if (hasError) {
      const texto = await toastError.first().textContent();
      console.log(`[TESTE] ❌ Erro ao criar solicitação. Toast: "${texto}"`);
    }
    if (!hasSuccess && !hasError) {
      // Verifica erros de validação
      const validationErrors = await modalForm.locator('.invalid-feedback').allTextContents();
      if (validationErrors.length > 0) {
        console.log(`[TESTE] ⚠️ Erros de validação: ${JSON.stringify(validationErrors)}`);
      } else {
        console.log('[TESTE] ⚠️ Nenhum toast apareceu e nenhum erro de validação');
      }
    }

    // Captura screenshot após salvar
    await page.screenshot({ path: 'reports/screenshots/oci-nova-solicitacao-apos-salvar.png', fullPage: true });

    // Asserção: deve ter sucesso
    expect(hasSuccess).toBe(true);
  });

});
