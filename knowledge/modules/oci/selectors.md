# Seletores — Módulo OCI

> Dicionário de seletores específicos do módulo **Ofertas de Cuidados Integrados (OCI)**.
> Seletores globais (Login, MenuSistemas, Toasts, Paginação, React Select, Modais) estão em `knowledge/core/selectors.md`.
> Carregado pelo Guardian apenas quando a tarefa envolve o módulo OCI.
> Última atualização: 2025-07-14

---

## CadOCI — Tela Principal (Consulta/Cadastro)

| Tela | Campo | Tipo | Seletor Primário | Seletor Alternativo | Status |
|------|-------|------|------------------|---------------------|--------|
| CadOCI | Especialidade (filtro) | select | `[name="co_grupo"]` | `.Select2__control` | ✅ ativo |
| CadOCI | Linha de Cuidado (filtro) | select | `[name="id_linha_cuidado"]` | — | ✅ ativo |
| CadOCI | Município Origem (filtro) | select | `[name="mun_origem"]` | — | ✅ ativo |
| CadOCI | Unidade Solicitante (filtro) | select | `[name="co_cnes_solicitante"]` | — | ✅ ativo |
| CadOCI | Equipe Referência (filtro) | select | `[name="ine"]` | — | ✅ ativo |
| CadOCI | Switch Minhas Solicitações | input | `[name="st_somente_usuario_logado"]` | — | ✅ ativo |
| CadOCI | Botão Solicitar OCI | button | `getByText('Solicitar OCI')` | — | ✅ ativo |
| CadOCI | Modal Especialidades | modal | `.modal` (hasText "Selecione a Especialidade") | — | ✅ ativo |
| CadOCI | Cards Especialidade | button | `.especialidade-option` | `.especialidade-option h6` | ✅ ativo |
| CadOCI | Modal Cancelamento | modal | `.modal` (hasText "Justificativa do Cancelamento") | — | ✅ ativo |
| CadOCI | Justificativa Cancelamento | input | `#justificativa` | — | ✅ ativo |
| CadOCI | Confirmar Cancelamento | button | `button` (hasText "Confirmar") | — | ✅ ativo |
| CadOCI | Ícone Cancelar | button | `[class*="ri-close-circle-line"]` | — | ✅ ativo |
| CadOCI | Ícone Imprimir | button | `[class*="ri-printer-line"]` | — | ✅ ativo |

## SolicitacaoModal — Modal de Nova Solicitação

| Tela | Campo | Tipo | Seletor Primário | Seletor Alternativo | Status |
|------|-------|------|------------------|---------------------|--------|
| SolicitacaoModal | Modal Nova Solicitação | modal | `.modal` (hasText "Nova Solicitação") | — | ✅ ativo |
| SolicitacaoModal | Linha de Cuidado | select | `[data-field-name="id_linha_cuidado"]` | `.Select2__control` | ✅ ativo |
| SolicitacaoModal | Paciente (Cidadão) | select | `[data-field-name="co_pac"]` | `.Select2__control` | ✅ ativo |
| SolicitacaoModal | CID 10 | select | `[data-field-name="co_cid"]` | `.Select2__control` | ✅ ativo |
| SolicitacaoModal | Profissional Solicitante | select | `[data-field-name="nu_cns_solicitante"]` | `.Select2__control` | ✅ ativo |
| SolicitacaoModal | Unidade Responsável | select | `[data-field-name="co_cnes_solicitante"]` | `.Select2__control` | ✅ ativo |
| SolicitacaoModal | Justificativa | textarea | `textarea[name="ds_justificativa"]` | — | ✅ ativo |
| SolicitacaoModal | Botão Salvar | button | `button[type="submit"]` (dentro do modal) | — | ✅ ativo |
| SolicitacaoModal | Adicionar Cidadão | button | `getByRole('button', { name: /Adicionar Cidadão/i })` | — | ✅ ativo |
| SolicitacaoModal | Erros de Validação | text | `.invalid-feedback` | — | ✅ ativo |

## CadastroPaciente — Modal de Cadastro de Paciente

| Tela | Campo | Tipo | Seletor Primário | Seletor Alternativo | Status |
|------|-------|------|------------------|---------------------|--------|
| CadastroPaciente | Modal Cadastro | modal | `.modal` (hasText "Novo Usuário Cidadão") | — | ✅ ativo |
| CadastroPaciente | Nome Completo | input | `[name="no_pac"]` | — | ✅ ativo |
| CadastroPaciente | Data Nascimento | input | `[name="dt_nasc"]` | — | ✅ ativo |
| CadastroPaciente | CPF | input | `[name="nu_cpf"]` | — | ✅ ativo |
| CadastroPaciente | CNS | input | `[name="nu_cns"]` | — | ✅ ativo |
| CadastroPaciente | Nome da Mãe | input | `[name="no_mae"]` | — | ✅ ativo |
| CadastroPaciente | Sexo | select | `[data-field-name="no_sexo"]` | `.Select2__control` | ✅ ativo |
| CadastroPaciente | CEP | input | `[name="endereco.nr_cep"]` | — | ✅ ativo |
| CadastroPaciente | Logradouro | select | `[data-field-name="endereco.cd_logr"]` | `.Select2__single-value` | ✅ ativo |
| CadastroPaciente | Bairro | select | `[data-field-name="endereco.cd_bairro"]` | `.Select2__single-value` | ✅ ativo |
| CadastroPaciente | UF | select | `[data-field-name="endereco.cd_estado"]` | `.Select2__single-value` | ✅ ativo |
| CadastroPaciente | Município | select | `[data-field-name="endereco.cd_cidade"]` | `.Select2__single-value` | ✅ ativo |
| CadastroPaciente | Botão Salvar | button | `button[type="submit"]` (dentro do modal) | — | ✅ ativo |
| CadastroPaciente | Erros de Validação | text | `.invalid-feedback` (dentro do modal) | — | ✅ ativo |
