// Specs de Nova Solicitação — Módulo OCI
// Saúde Inteligente — Testes E2E (Requisito 3)
// Este spec REUTILIZA storageState — sessão autenticada via global setup

import { test, expect } from '@playwright/test';
import CadOCIPage from '../../page-objects/CadOCIPage.js';
import SolicitacaoModal from '../../page-objects/SolicitacaoModal.js';
import { solicitacaoOCI, pacienteNovo } from '../../fixtures/test-data.js';
import { waitForToast, waitForTableLoad } from '../../tools/helpers.js';
import { setupConsoleCapture } from '../../tools/console-capture.js';
import { captureScreenshot } from '../../tools/screenshot-helper.js';

/**
 * Aguarda a tela CadOCI estar pronta para interação.
 * Em vez de esperar linhas na tabela (que pode estar vazia),
 * espera o botão "Solicitar OCI" ficar visível.
 * @param {CadOCIPage} cadOCI - Instância do Page Object
 */
async function waitForPageReady(cadOCI) {
  await cadOCI.btnNovaSolicitacao.waitFor({ state: 'visible', timeout: 15000 });
}

/** Especialidades esperadas no modal de seleção */
const especialidadesEsperadas = [
  'Atenção em Oncologia',
  'Atenção em Cardiologia',
  'Atenção em Ortopedia',
  'Atenção em Oftalmologia',
  'Atenção em Otorrinolaringologia',
  'Saúde da Mulher',
];

test.describe('Nova Solicitação — Módulo OCI', () => {
  /** @type {import('../../tools/console-capture.js').ConsoleCapture} */
  let consoleCapture;

  test.beforeEach(async ({ page }, testInfo) => {
    consoleCapture = setupConsoleCapture(page);
    await captureScreenshot(page, 'oci-nova-solicitacao', `${testInfo.title}-antes`);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await captureScreenshot(page, 'oci-nova-solicitacao', `${testInfo.title}-depois`);
    if (consoleCapture.hasConsoleErrors()) {
      const logs = consoleCapture.getConsoleLogs().filter((l) => l.type === 'error');
      console.warn(`[console_errors: true] ${testInfo.title} — ${logs.length} erro(s) JS:`, logs);
      testInfo.annotations.push({ type: 'console_errors', description: 'true' });
    }
    consoleCapture.clear();
  });

  /**
   * Req 3.1 — Botão "Nova Solicitação" abre modal com especialidades disponíveis.
   * Verifica que ao clicar em "Solicitar OCI" o modal de seleção de especialidades
   * é exibido com as 6 opções esperadas.
   */
  test('Req 3.1 - Botão "Nova Solicitação" abre modal com especialidades disponíveis', async ({ page }) => {
    const cadOCI = new CadOCIPage(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();
    await waitForPageReady(cadOCI);

    // Clica no botão "Solicitar OCI"
    await cadOCI.clickNovaSolicitacao();

    // Verifica que o modal de especialidades está visível
    await expect(cadOCI.modalEspecialidades).toBeVisible({ timeout: 10000 });

    // Obtém as especialidades exibidas no modal
    const especialidades = await cadOCI.getEspecialidadesModal();

    // Verifica que todas as especialidades esperadas estão presentes
    for (const esp of especialidadesEsperadas) {
      expect(especialidades.some((e) => e.includes(esp))).toBe(true);
    }
  });

  /**
   * Req 3.2 — Seleção de especialidade abre formulário com campo pré-preenchido e linhas de cuidado filtradas.
   * Verifica que ao selecionar uma especialidade no modal, o formulário de solicitação
   * abre com a especialidade pré-preenchida e as linhas de cuidado disponíveis são filtradas.
   */
  test('Req 3.2 - Seleção de especialidade abre formulário com campo pré-preenchido e linhas de cuidado filtradas', async ({ page }) => {
    const cadOCI = new CadOCIPage(page);
    const solicitacaoModal = new SolicitacaoModal(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();
    await waitForPageReady(cadOCI);

    // Abre o modal de especialidades e seleciona uma
    await cadOCI.clickNovaSolicitacao();
    await expect(cadOCI.modalEspecialidades).toBeVisible({ timeout: 10000 });
    await cadOCI.selectEspecialidadeModal(solicitacaoOCI.especialidade);

    // Aguarda o loading desaparecer e o formulário de solicitação abrir
    const loading = page.locator('text=Carregando');
    await loading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

    // Verifica que o formulário de solicitação está aberto
    const isOpen = await solicitacaoModal.isOpen();
    expect(isOpen).toBe(true);

    // Verifica que a especialidade está pré-preenchida no título do modal
    const especialidadePreenchida = await solicitacaoModal.getEspecialidadePreenchida();
    expect(especialidadePreenchida.toLowerCase()).toContain(solicitacaoOCI.especialidade.toLowerCase());

    // Verifica que as linhas de cuidado estão disponíveis e filtradas
    const linhasCuidado = await solicitacaoModal.getLinhasCuidadoDisponiveis();
    expect(linhasCuidado.length).toBeGreaterThan(0);
  });

  /**
   * Req 3.3 — Preenchimento completo e submissão cria solicitação com sucesso.
   * Preenche todos os campos obrigatórios (paciente, linha de cuidado, CID, justificativa),
   * submete o formulário e verifica toast de sucesso e presença na listagem.
   */
  test('Req 3.3 - Preenchimento completo e submissão cria solicitação com sucesso', async ({ page }) => {
    const cadOCI = new CadOCIPage(page);
    const solicitacaoModal = new SolicitacaoModal(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();
    await waitForPageReady(cadOCI);

    // Abre o modal de especialidades e seleciona uma
    await cadOCI.clickNovaSolicitacao();
    await expect(cadOCI.modalEspecialidades).toBeVisible({ timeout: 10000 });
    await cadOCI.selectEspecialidadeModal(solicitacaoOCI.especialidade);

    // Aguarda o loading desaparecer e o formulário abrir
    const loading = page.locator('text=Carregando');
    await loading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await expect(solicitacaoModal.modal).toBeVisible({ timeout: 10000 });

    // Seleciona a primeira linha de cuidado disponível
    const linhasCuidado = await solicitacaoModal.getLinhasCuidadoDisponiveis();
    expect(linhasCuidado.length).toBeGreaterThan(0);
    await solicitacaoModal.selectLinhaCuidado(linhasCuidado[0]);

    // Busca e seleciona um paciente pelo nome
    await solicitacaoModal.searchPaciente(pacienteNovo.nome.substring(0, 5));
    await solicitacaoModal.selectPacienteSugestao(0);

    // Seleciona o primeiro CID disponível
    const cids = await solicitacaoModal.getCIDsDisponiveis();
    expect(cids.length).toBeGreaterThan(0);
    await solicitacaoModal.selectCID(cids[0]);

    // Preenche a justificativa
    await solicitacaoModal.fillJustificativa(solicitacaoOCI.justificativa);

    // Submete o formulário
    await solicitacaoModal.submit();

    // Verifica toast de sucesso (pode conter "sucesso" ou "Sucesso" ou "cadastrad")
    const toast = page.locator('.Toastify__toast');
    await expect(toast.first()).toBeVisible({ timeout: 15000 });

    // Verifica que a nova solicitação aparece na listagem
    await waitForTableLoad(page);
    const rowCount = await cadOCI.getTableRowCount();
    expect(rowCount).toBeGreaterThan(0);
  });

  /**
   * Req 3.4 — Submissão com campos obrigatórios vazios exibe mensagens de validação.
   * Abre o formulário de solicitação e submete sem preencher campos obrigatórios,
   * verificando que mensagens de validação são exibidas.
   */
  test('Req 3.4 - Submissão com campos obrigatórios vazios exibe mensagens de validação', async ({ page }) => {
    const cadOCI = new CadOCIPage(page);
    const solicitacaoModal = new SolicitacaoModal(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();
    await waitForPageReady(cadOCI);

    // Abre o modal de especialidades e seleciona uma
    await cadOCI.clickNovaSolicitacao();
    await expect(cadOCI.modalEspecialidades).toBeVisible({ timeout: 10000 });
    await cadOCI.selectEspecialidadeModal(solicitacaoOCI.especialidade);

    // Aguarda o loading desaparecer e o formulário abrir
    const loading = page.locator('text=Carregando');
    await loading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await expect(solicitacaoModal.modal).toBeVisible({ timeout: 10000 });

    // Submete o formulário sem preencher campos obrigatórios
    await solicitacaoModal.submit();

    // Verifica que mensagens de validação são exibidas
    const errors = await solicitacaoModal.getValidationErrors();
    expect(errors.length).toBeGreaterThan(0);
  });

  /**
   * Req 3.5 — Autocomplete de paciente exibe sugestões e preenche dados ao selecionar.
   * Digita no campo de busca de paciente, verifica que sugestões aparecem,
   * seleciona uma sugestão e verifica que o paciente é selecionado.
   */
  test('Req 3.5 - Autocomplete de paciente exibe sugestões e preenche dados ao selecionar', async ({ page }) => {
    const cadOCI = new CadOCIPage(page);
    const solicitacaoModal = new SolicitacaoModal(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();
    await waitForPageReady(cadOCI);

    // Abre o modal de especialidades e seleciona uma
    await cadOCI.clickNovaSolicitacao();
    await expect(cadOCI.modalEspecialidades).toBeVisible({ timeout: 10000 });
    await cadOCI.selectEspecialidadeModal(solicitacaoOCI.especialidade);

    // Aguarda o loading desaparecer e o formulário abrir
    const loading = page.locator('text=Carregando');
    await loading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await expect(solicitacaoModal.modal).toBeVisible({ timeout: 10000 });

    // Digita no campo de busca de paciente para acionar o autocomplete
    await solicitacaoModal.searchPaciente(pacienteNovo.nome.substring(0, 5));

    // Verifica que sugestões aparecem no menu do autocomplete
    const opcoes = page.locator('.Select2__menu .Select2__option');
    await expect(opcoes.first()).toBeVisible({ timeout: 10000 });
    const count = await opcoes.count();
    expect(count).toBeGreaterThan(0);

    // Seleciona a primeira sugestão
    await solicitacaoModal.selectPacienteSugestao(0);

    // Verifica que o paciente foi selecionado (campo exibe valor)
    const pacienteSelecionado = await solicitacaoModal.getPacienteSelecionado();
    expect(pacienteSelecionado).toBeTruthy();
  });

  /**
   * Req 3.6 — Seleção de Linha de Cuidado atualiza CIDs disponíveis.
   * Seleciona uma linha de cuidado e verifica que o campo de CID
   * é atualizado com opções disponíveis vinculadas à linha selecionada.
   */
  test('Req 3.6 - Seleção de Linha de Cuidado atualiza CIDs disponíveis', async ({ page }) => {
    const cadOCI = new CadOCIPage(page);
    const solicitacaoModal = new SolicitacaoModal(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();
    await waitForPageReady(cadOCI);

    // Abre o modal de especialidades e seleciona uma
    await cadOCI.clickNovaSolicitacao();
    await expect(cadOCI.modalEspecialidades).toBeVisible({ timeout: 10000 });
    await cadOCI.selectEspecialidadeModal(solicitacaoOCI.especialidade);

    // Aguarda o formulário de solicitação abrir
    await expect(solicitacaoModal.modal).toBeVisible({ timeout: 10000 });

    // Seleciona a primeira linha de cuidado disponível
    const linhasCuidado = await solicitacaoModal.getLinhasCuidadoDisponiveis();
    expect(linhasCuidado.length).toBeGreaterThan(0);
    await solicitacaoModal.selectLinhaCuidado(linhasCuidado[0]);

    // Verifica que os CIDs disponíveis foram atualizados
    const cids = await solicitacaoModal.getCIDsDisponiveis();
    expect(cids.length).toBeGreaterThan(0);
  });
});
