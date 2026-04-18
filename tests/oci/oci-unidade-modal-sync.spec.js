// Spec — Sincronização da Unidade Responsável entre filtro e modal de Nova Solicitação OCI
// Guardian — Teste E2E para validar fix: unidade selecionada no filtro deve refletir no modal
// Bug: ao mudar a Unidade Responsável no select do filtro da tela principal,
//       o modal de nova solicitação continuava com a unidade anterior.

import { test, expect } from '@playwright/test';
import { getReactSelectValue, waitForModalOpen } from '../../tools/component-helpers.js';

test.describe('Sincronização Unidade Responsável — Filtro ↔ Modal Nova OCI', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/oci/dashboard/consulta_cadastro');
    await page.waitForLoadState('networkidle');
    await page.getByText('Solicitar OCI').waitFor({ state: 'visible', timeout: 15000 });
  });

  test('Req FIX-1 — Modal de nova solicitação exibe a unidade pré-selecionada do filtro', async ({ page }) => {
    // 1. Captura a unidade atual no filtro da tela principal
    const filtroUnidade = page.locator('[data-field-name="co_cnes_solicitante"]').first();
    await filtroUnidade.waitFor({ state: 'visible', timeout: 10000 });
    const unidadeFiltro = await getReactSelectValue(filtroUnidade);
    console.log(`[TESTE] Unidade no filtro da tela principal: "${unidadeFiltro?.trim()}"`);

    // 2. Abre modal de especialidades
    await page.getByText('Solicitar OCI').click();
    const modalEsp = await waitForModalOpen(page, 'Selecione a Especialidade');
    await expect(modalEsp).toBeVisible();

    // 3. Seleciona a primeira especialidade
    const primeiraEsp = modalEsp.locator('.especialidade-option').first();
    const nomeEsp = await primeiraEsp.textContent();
    console.log(`[TESTE] Selecionando especialidade: ${nomeEsp?.trim()}`);
    await primeiraEsp.click();

    // 4. Aguarda o formulário de nova solicitação abrir
    const modalForm = await waitForModalOpen(page, 'Nova Solicitação');
    await expect(modalForm).toBeVisible();
    await page.waitForTimeout(1500); // Aguarda campos carregarem

    // 5. Captura a unidade no modal de nova solicitação
    const modalUnidade = modalForm.locator('[data-field-name="co_cnes_solicitante"]').first();
    await modalUnidade.waitFor({ state: 'visible', timeout: 10000 });
    const unidadeModal = await getReactSelectValue(modalUnidade);
    console.log(`[TESTE] Unidade no modal de nova solicitação: "${unidadeModal?.trim()}"`);

    // 6. Asserção: a unidade no modal deve ser igual à do filtro
    expect(unidadeModal?.trim()).toBe(unidadeFiltro?.trim());
    console.log('[TESTE] ✅ Unidade do filtro refletida corretamente no modal');
  });

  test('Req FIX-2 — Ao mudar unidade no filtro, modal reflete a nova unidade', async ({ page }) => {
    // 1. Verifica se o select de unidade no filtro está habilitado
    const filtroUnidade = page.locator('[data-field-name="co_cnes_solicitante"]').first();
    await filtroUnidade.waitFor({ state: 'visible', timeout: 10000 });

    // Captura unidade inicial
    const unidadeInicial = await getReactSelectValue(filtroUnidade);
    console.log(`[TESTE] Unidade inicial no filtro: "${unidadeInicial?.trim()}"`);

    // 2. Tenta abrir o dropdown de unidade no filtro para ver se há mais opções
    const control = filtroUnidade.locator('.Select2__control');
    const isDisabled = await control.locator('.Select2__control--is-disabled').count() > 0 ||
                       await filtroUnidade.locator('.Select2__control--is-disabled').count() > 0;

    if (isDisabled) {
      console.log('[TESTE] ⚠️ Select de unidade está desabilitado (usuário não é admin/regulador)');
      console.log('[TESTE] Testando apenas que a unidade padrão é propagada ao modal...');

      // Mesmo desabilitado, a unidade deve ser propagada ao modal
      await page.getByText('Solicitar OCI').click();
      const modalEsp = await waitForModalOpen(page, 'Selecione a Especialidade');
      await modalEsp.locator('.especialidade-option').first().click();

      const modalForm = await waitForModalOpen(page, 'Nova Solicitação');
      await page.waitForTimeout(1500);

      const modalUnidade = modalForm.locator('[data-field-name="co_cnes_solicitante"]').first();
      const unidadeModal = await getReactSelectValue(modalUnidade);
      console.log(`[TESTE] Unidade no modal: "${unidadeModal?.trim()}"`);

      expect(unidadeModal?.trim()).toBe(unidadeInicial?.trim());
      console.log('[TESTE] ✅ Unidade padrão propagada corretamente ao modal');
      return;
    }

    // 3. Se habilitado, clica para abrir o dropdown e seleciona outra unidade
    await control.click();
    await page.waitForTimeout(500);

    // Verifica se há opções disponíveis
    const options = page.locator('.Select2__option');
    const optionCount = await options.count();
    console.log(`[TESTE] Opções de unidade disponíveis: ${optionCount}`);

    if (optionCount <= 1) {
      console.log('[TESTE] ⚠️ Apenas uma unidade disponível — não é possível testar troca');
      await page.keyboard.press('Escape');

      // Testa que a unidade única é propagada
      await page.getByText('Solicitar OCI').click();
      const modalEsp = await waitForModalOpen(page, 'Selecione a Especialidade');
      await modalEsp.locator('.especialidade-option').first().click();

      const modalForm = await waitForModalOpen(page, 'Nova Solicitação');
      await page.waitForTimeout(1500);

      const modalUnidade = modalForm.locator('[data-field-name="co_cnes_solicitante"]').first();
      const unidadeModal = await getReactSelectValue(modalUnidade);
      expect(unidadeModal?.trim()).toBe(unidadeInicial?.trim());
      console.log('[TESTE] ✅ Unidade única propagada corretamente');
      return;
    }

    // Seleciona uma opção DIFERENTE da atual
    const allOptionTexts = await options.allTextContents();
    console.log(`[TESTE] Opções disponíveis: ${JSON.stringify(allOptionTexts.map(t => t.trim()))}`);

    // Encontra uma opção diferente da atual
    let selectedNewOption = false;
    for (let i = 0; i < optionCount; i++) {
      const optText = (await options.nth(i).textContent())?.trim();
      if (optText !== unidadeInicial?.trim() && optText !== '' && optText !== 'Todas') {
        await options.nth(i).click();
        selectedNewOption = true;
        console.log(`[TESTE] Nova unidade selecionada no filtro: "${optText}"`);
        break;
      }
    }

    if (!selectedNewOption) {
      console.log('[TESTE] ⚠️ Não encontrou opção diferente da atual');
      await page.keyboard.press('Escape');
      return;
    }

    await page.waitForTimeout(500);

    // 4. Captura a nova unidade selecionada no filtro
    const novaUnidadeFiltro = await getReactSelectValue(filtroUnidade);
    console.log(`[TESTE] Nova unidade no filtro após troca: "${novaUnidadeFiltro?.trim()}"`);

    // 5. Abre modal de nova solicitação
    await page.getByText('Solicitar OCI').click();
    const modalEsp = await waitForModalOpen(page, 'Selecione a Especialidade');
    await modalEsp.locator('.especialidade-option').first().click();

    const modalForm = await waitForModalOpen(page, 'Nova Solicitação');
    await page.waitForTimeout(1500);

    // 6. Verifica a unidade no modal
    const modalUnidade = modalForm.locator('[data-field-name="co_cnes_solicitante"]').first();
    const unidadeModal = await getReactSelectValue(modalUnidade);
    console.log(`[TESTE] Unidade no modal após troca: "${unidadeModal?.trim()}"`);

    // 7. Asserção: a unidade no modal deve ser a NOVA unidade selecionada
    expect(unidadeModal?.trim()).toBe(novaUnidadeFiltro?.trim());
    console.log('[TESTE] ✅ Nova unidade refletida corretamente no modal após troca!');
  });

});
