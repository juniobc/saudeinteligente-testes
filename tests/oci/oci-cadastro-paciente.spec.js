// Spec — Cadastro de Paciente via Fluxo OCI
// Guardian — Testes E2E do módulo OCI
// Fluxo: CadOCI → Solicitar OCI → Selecionar Especialidade → Adicionar Cidadão → Preencher → Salvar

import { test, expect } from '@playwright/test';
import CadOCIPage from '../../page-objects/CadOCIPage.js';
import SolicitacaoModal from '../../page-objects/SolicitacaoModal.js';
import CadastroPacienteModal from '../../page-objects/CadastroPacienteModal.js';
import { pacienteNovo, solicitacaoOCI } from '../../fixtures/test-data.js';
import { waitForToast, waitForTableLoad } from '../../tools/helpers.js';

test.describe('Cadastro de Paciente — Módulo OCI', () => {
  let cadOCI;
  let solicitacaoModal;
  let cadastroPacienteModal;

  /**
   * Fluxo comum: navega para CadOCI → abre modal de especialidades →
   * seleciona especialidade → aguarda formulário de solicitação abrir.
   */
  test.beforeEach(async ({ page }) => {
    cadOCI = new CadOCIPage(page);
    solicitacaoModal = new SolicitacaoModal(page);
    cadastroPacienteModal = new CadastroPacienteModal(page);

    // Navega para a tela de Consulta/Cadastro OCI
    await cadOCI.goto();
    await page.waitForLoadState('networkidle');
    await page.getByText('Solicitar OCI').waitFor({ state: 'visible', timeout: 15000 });

    // Abre o modal de especialidades e seleciona uma
    await cadOCI.clickNovaSolicitacao();
    await expect(cadOCI.modalEspecialidades).toBeVisible({ timeout: 10000 });
    await cadOCI.selectEspecialidadeModal(solicitacaoOCI.especialidade);

    // Aguarda o formulário de solicitação abrir
    await expect(solicitacaoModal.modal).toBeVisible({ timeout: 10000 });

    // Aguarda loading desaparecer
    const loading = page.locator('.d-flex.flex-column.justify-content-center.align-items-center');
    await loading.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
  });

  test('Req 4.1 - Botão "Adicionar Cidadão" abre modal de cadastro de paciente', async ({ page }) => {
    // Clica no botão "Adicionar Cidadão" dentro do formulário de solicitação
    await solicitacaoModal.clickCadastrarNovoPaciente();

    // Verifica que o modal de cadastro de paciente está visível
    const isOpen = await cadastroPacienteModal.isOpen();
    expect(isOpen).toBe(true);

    // Verifica que o título do modal é "Novo Usuário Cidadão"
    await expect(cadastroPacienteModal.modal).toContainText('Novo Usuário Cidadão');

    console.log('[TESTE] ✅ Modal de cadastro de paciente aberto com sucesso');
  });

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

    // Captura screenshot antes de salvar
    await page.screenshot({
      path: 'reports/screenshots/oci-cadastro-paciente-antes-salvar.png',
      fullPage: true,
    });

    // Submete o formulário de cadastro de paciente
    await cadastroPacienteModal.submit();

    // Aguarda resultado
    await page.waitForTimeout(3000);

    // Verifica se o modal de paciente foi fechado (indica sucesso)
    const isClosed = await cadastroPacienteModal.isClosed();

    if (isClosed) {
      // Verifica que o paciente recém-criado foi auto-selecionado no formulário de solicitação
      const pacienteSelecionado = await solicitacaoModal.getPacienteSelecionado();
      console.log(`[TESTE] ✅ Paciente criado e selecionado: "${pacienteSelecionado}"`);
      expect(pacienteSelecionado).toBeTruthy();
      expect(pacienteSelecionado.toUpperCase()).toContain(pacienteNovo.nome.toUpperCase());
    } else {
      // Se o modal não fechou, verificar erros de validação
      const errors = await cadastroPacienteModal.getValidationErrors();
      console.log(`[TESTE] ⚠️ Modal não fechou. Erros de validação: ${JSON.stringify(errors)}`);

      // Captura screenshot do estado atual
      await page.screenshot({
        path: 'reports/screenshots/oci-cadastro-paciente-erro.png',
        fullPage: true,
      });
    }

    expect(isClosed).toBe(true);
  });

  test('Req 4.3 - Preenchimento do CEP auto-preenche campos de endereço', async ({ page }) => {
    // Abre o modal de cadastro de paciente
    await solicitacaoModal.clickCadastrarNovoPaciente();
    await expect(cadastroPacienteModal.modal).toBeVisible({ timeout: 10000 });

    // Preenche o CEP — a API de CEP deve auto-preencher os campos de endereço
    await cadastroPacienteModal.fillCEP(pacienteNovo.cep);

    // Aguarda tempo extra para a API de CEP responder
    await page.waitForTimeout(3000);

    // Obtém os dados de endereço preenchidos automaticamente
    const endereco = await cadastroPacienteModal.getEnderecoPreenchido();
    console.log(`[TESTE] Endereço preenchido via CEP ${pacienteNovo.cep}:`, endereco);

    // Verifica que os campos de endereço foram preenchidos (não estão vazios)
    expect(endereco.uf).toBeTruthy();
    expect(endereco.municipio).toBeTruthy();

    // Captura screenshot do endereço preenchido
    await page.screenshot({
      path: 'reports/screenshots/oci-cadastro-paciente-cep-autofill.png',
      fullPage: true,
    });

    console.log('[TESTE] ✅ CEP auto-preencheu campos de endereço');
  });

  test('Req 4.4 - Submissão sem dados obrigatórios exibe mensagens de validação', async ({ page }) => {
    // Abre o modal de cadastro de paciente
    await solicitacaoModal.clickCadastrarNovoPaciente();
    await expect(cadastroPacienteModal.modal).toBeVisible({ timeout: 10000 });

    // Submete o formulário sem preencher nenhum campo obrigatório
    await cadastroPacienteModal.submit();

    // Aguarda renderização dos erros
    await page.waitForTimeout(500);

    // Verifica que mensagens de validação são exibidas
    const errors = await cadastroPacienteModal.getValidationErrors();
    console.log(`[TESTE] Erros de validação encontrados (${errors.length}):`, errors);

    expect(errors.length).toBeGreaterThan(0);

    // Captura screenshot dos erros de validação
    await page.screenshot({
      path: 'reports/screenshots/oci-cadastro-paciente-validacao.png',
      fullPage: true,
    });

    console.log('[TESTE] ✅ Validação de campos obrigatórios funcionando');
  });
});
