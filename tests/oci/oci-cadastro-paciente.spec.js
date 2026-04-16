// Specs de Cadastro de Paciente — Módulo OCI
// Saúde Inteligente — Testes E2E (Requisito 4)
// Este spec REUTILIZA storageState — sessão autenticada via global setup

import { test, expect } from '@playwright/test';
import CadOCIPage from '../../page-objects/CadOCIPage.js';
import SolicitacaoModal from '../../page-objects/SolicitacaoModal.js';
import CadastroPacienteModal from '../../page-objects/CadastroPacienteModal.js';
import { pacienteNovo, solicitacaoOCI } from '../../fixtures/test-data.js';
import { waitForToast, waitForTableLoad } from '../../tools/helpers.js';
import { setupConsoleCapture } from '../../tools/console-capture.js';
import { captureScreenshot } from '../../tools/screenshot-helper.js';

test.describe('Cadastro de Paciente — Módulo OCI', () => {
  let cadOCI;
  let solicitacaoModal;
  let cadastroPacienteModal;
  /** @type {import('../../tools/console-capture.js').ConsoleCapture} */
  let consoleCapture;

  /**
   * Fluxo comum: navega para CadOCI → abre modal de especialidades →
   * seleciona especialidade → aguarda formulário de solicitação abrir.
   */
  test.beforeEach(async ({ page }, testInfo) => {
    consoleCapture = setupConsoleCapture(page);
    await captureScreenshot(page, 'oci-cadastro-paciente', `${testInfo.title}-antes`);

    cadOCI = new CadOCIPage(page);
    solicitacaoModal = new SolicitacaoModal(page);
    cadastroPacienteModal = new CadastroPacienteModal(page);

    // Navega para a tela de Cadastro OCI
    await cadOCI.goto();
    await waitForTableLoad(page);

    // Abre o modal de especialidades e seleciona uma
    await cadOCI.clickNovaSolicitacao();
    await expect(cadOCI.modalEspecialidades).toBeVisible({ timeout: 10000 });
    await cadOCI.selectEspecialidadeModal(solicitacaoOCI.especialidade);

    // Aguarda o formulário de solicitação abrir
    await expect(solicitacaoModal.modal).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async ({ page }, testInfo) => {
    await captureScreenshot(page, 'oci-cadastro-paciente', `${testInfo.title}-depois`);
    if (consoleCapture.hasConsoleErrors()) {
      const logs = consoleCapture.getConsoleLogs().filter((l) => l.type === 'error');
      console.warn(`[console_errors: true] ${testInfo.title} — ${logs.length} erro(s) JS:`, logs);
      testInfo.annotations.push({ type: 'console_errors', description: 'true' });
    }
    consoleCapture.clear();
  });

  /**
   * Req 4.1 — Botão de cadastrar novo paciente no formulário de solicitação abre modal de paciente.
   * Verifica que ao clicar em "Adicionar Cidadão" no formulário de solicitação,
   * o modal de cadastro de paciente (Novo Usuário Cidadão) é aberto.
   */
  test('Req 4.1 - Botão de cadastrar novo paciente abre modal de paciente', async ({ page }) => {
    // Clica no botão "Adicionar Cidadão" dentro do formulário de solicitação
    await solicitacaoModal.clickCadastrarNovoPaciente();

    // Verifica que o modal de cadastro de paciente está visível
    const isOpen = await cadastroPacienteModal.isOpen();
    expect(isOpen).toBe(true);
  });

  /**
   * Req 4.2 — Preenchimento dos dados obrigatórios e submissão cria paciente.
   * Preenche Nome, Data Nascimento, Sexo, CPF, CNS, Nome da Mãe,
   * submete o formulário e verifica que o modal fecha e o paciente
   * é automaticamente selecionado no formulário de solicitação.
   */
  test('Req 4.2 - Preenchimento dos dados obrigatórios e submissão cria paciente', async ({ page }) => {
    // Abre o modal de cadastro de paciente
    await solicitacaoModal.clickCadastrarNovoPaciente();
    await expect(cadastroPacienteModal.modal).toBeVisible({ timeout: 10000 });

    // Preenche os campos obrigatórios de dados pessoais
    await cadastroPacienteModal.fillNome(pacienteNovo.nome);
    await cadastroPacienteModal.fillDataNascimento(pacienteNovo.dataNascimento);
    await cadastroPacienteModal.selectSexo(pacienteNovo.sexo);
    await cadastroPacienteModal.fillCPF(pacienteNovo.cpf);
    await cadastroPacienteModal.fillNomeMae(pacienteNovo.nomeMae);

    // Submete o formulário de cadastro de paciente
    await cadastroPacienteModal.submit();

    // Verifica que o modal de paciente foi fechado
    const isClosed = await cadastroPacienteModal.isClosed();
    expect(isClosed).toBe(true);

    // Verifica que o paciente recém-criado foi auto-selecionado no formulário de solicitação
    const pacienteSelecionado = await solicitacaoModal.getPacienteSelecionado();
    expect(pacienteSelecionado).toBeTruthy();
    expect(pacienteSelecionado.toUpperCase()).toContain(pacienteNovo.nome.toUpperCase());
  });

  /**
   * Req 4.3 — Preenchimento do CEP auto-preenche campos de endereço.
   * Preenche o CEP (68900-073) e verifica que os campos de Estado,
   * Município, Bairro e Logradouro são preenchidos automaticamente.
   */
  test('Req 4.3 - Preenchimento do CEP auto-preenche campos de endereço', async ({ page }) => {
    // Abre o modal de cadastro de paciente
    await solicitacaoModal.clickCadastrarNovoPaciente();
    await expect(cadastroPacienteModal.modal).toBeVisible({ timeout: 10000 });

    // Preenche o CEP — a API de CEP deve auto-preencher os campos de endereço
    await cadastroPacienteModal.fillCEP(pacienteNovo.cep);

    // Obtém os dados de endereço preenchidos automaticamente
    const endereco = await cadastroPacienteModal.getEnderecoPreenchido();

    // Verifica que os campos de endereço foram preenchidos (não estão vazios)
    expect(endereco.uf).toBeTruthy();
    expect(endereco.municipio).toBeTruthy();
    expect(endereco.bairro).toBeTruthy();
    expect(endereco.logradouro).toBeTruthy();
  });

  /**
   * Req 4.4 — Submissão com dados inválidos exibe mensagens de validação.
   * Submete o formulário de paciente sem preencher campos obrigatórios
   * e verifica que mensagens de validação são exibidas.
   */
  test('Req 4.4 - Submissão com dados inválidos exibe mensagens de validação', async ({ page }) => {
    // Abre o modal de cadastro de paciente
    await solicitacaoModal.clickCadastrarNovoPaciente();
    await expect(cadastroPacienteModal.modal).toBeVisible({ timeout: 10000 });

    // Submete o formulário sem preencher nenhum campo obrigatório
    await cadastroPacienteModal.submit();

    // Verifica que mensagens de validação são exibidas
    const errors = await cadastroPacienteModal.getValidationErrors();
    expect(errors.length).toBeGreaterThan(0);
  });
});
