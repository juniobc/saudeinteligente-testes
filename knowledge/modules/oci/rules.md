# Regras de Negócio — Módulo OCI

> Regras específicas do módulo **Ofertas de Cuidados Integrados (OCI)**.
> Carregado pelo Guardian apenas quando a tarefa envolve o módulo OCI.
> Última atualização: 2025-07-14

---

### especialidade-obrigatoria-nova-solicitacao

- **Contexto**: Modal de nova solicitação OCI (botão "Solicitar OCI")
- **Regra**: Antes de abrir o formulário de nova solicitação, o sistema exige a seleção de uma especialidade em um modal intermediário ("Selecione a Especialidade"). Sem selecionar especialidade, o formulário de solicitação não abre.
- **Impacto no teste**: O fluxo de nova solicitação tem dois modais sequenciais: (1) modal de especialidades → (2) modal de nova solicitação. Aguardar o primeiro modal abrir, selecionar especialidade via `.especialidade-option`, e só então aguardar o segundo modal.
- **Validado em**: 2025-07-14

### linha-cuidado-filtra-cids

- **Contexto**: Modal de nova solicitação OCI, campo "Linha de Cuidado"
- **Regra**: A seleção de Linha de Cuidado (`id_linha_cuidado`) filtra os CIDs disponíveis no campo CID 10 (`co_cid`). Alterar a linha de cuidado pode limpar o CID previamente selecionado.
- **Impacto no teste**: Sempre selecionar Linha de Cuidado antes de CID 10. Se o teste alterar a linha de cuidado, verificar se o campo CID foi limpo e re-selecionar.
- **Validado em**: 2025-07-14

### paciente-busca-ou-cadastro-inline

- **Contexto**: Modal de nova solicitação OCI, campo "Paciente (Cidadão)"
- **Regra**: O campo de paciente (`co_pac`) é um select assíncrono com busca. Se o paciente não existir, o botão "Adicionar Cidadão" abre um modal de cadastro inline (modal sobre modal). Após salvar o cadastro, o paciente recém-criado aparece selecionado automaticamente no campo `co_pac`.
- **Impacto no teste**: Para testar cadastro inline, o fluxo é: modal de solicitação → clicar "Adicionar Cidadão" → modal de cadastro → preencher e salvar → modal de cadastro fecha → paciente aparece no campo. Aguardar o retorno ao modal de solicitação após salvar.
- **Validado em**: 2025-07-14

### justificativa-obrigatoria-cancelamento

- **Contexto**: Modal de cancelamento de solicitação OCI
- **Regra**: Para cancelar uma solicitação, o sistema exige preenchimento de justificativa no campo `#justificativa`. O botão "Confirmar" só efetiva o cancelamento se a justificativa estiver preenchida.
- **Impacto no teste**: Sempre preencher o campo de justificativa antes de clicar em "Confirmar". Testar também o cenário de submissão sem justificativa para validar a obrigatoriedade.
- **Validado em**: 2025-07-14

### cep-autofill-cadastro-paciente

- **Contexto**: Modal de cadastro de paciente, campo CEP
- **Regra**: Ao preencher o CEP (`endereco.nr_cep`), o sistema dispara uma consulta automática que preenche logradouro (`endereco.cd_logr`), bairro (`endereco.cd_bairro`), UF (`endereco.cd_estado`) e município (`endereco.cd_cidade`). O auto-fill pode demorar alguns segundos dependendo da API de CEP.
- **Impacto no teste**: Após preencher o CEP, aguardar o preenchimento automático dos campos de endereço antes de prosseguir. Verificar que os campos foram preenchidos via `.Select2__single-value` (são selects, não inputs). Timeout recomendado: 5-10s para a resposta da API de CEP.
- **Validado em**: 2025-07-14

### unidade-responsavel-pre-preenchida

- **Contexto**: Modal de nova solicitação OCI, campo "Unidade Responsável"
- **Regra**: O campo de unidade responsável (`co_cnes_solicitante`) é pré-preenchido automaticamente com base na lotação do usuário logado. O campo pode estar desabilitado para edição.
- **Impacto no teste**: Verificar que o campo está preenchido (não vazio) em vez de tentar preenchê-lo. Usar `.Select2__single-value` para ler o valor pré-preenchido.
- **Validado em**: 2025-07-14

### navegacao-oci-via-menu

- **Contexto**: Acesso à tela principal do módulo OCI (CadOCI)
- **Regra**: A tela de consulta/cadastro de OCI é acessada pelo menu lateral: "Gestão de OCIs" > "Consultar ou Cadastrar OCI". A rota real é `/oci/dashboard/consulta_cadastro`. Nunca acessar por URL direta — a rota antiga `/oci/dashboard/cad_oci` não existe mais.
- **Impacto no teste**: O Page Object `CadOCIPage.js` deve navegar via menu lateral, não via `page.goto()`. Seguir a regra global `navegacao-por-menu-nunca-por-url` do core.
- **Validado em**: 2025-07-14
