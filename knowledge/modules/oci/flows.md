# Fluxos Validados — Módulo OCI

> Fluxos específicos do módulo **Ofertas de Cuidados Integrados (OCI)**.
> Carregado pelo Guardian apenas quando a tarefa envolve o módulo OCI.
> Última atualização: 2025-07-14

---

### listagem-filtragem

- **Pré-condições**: Autenticado, módulo OCI selecionado, tela CadOCI carregada via menu lateral
- **Rota**: `/oci/dashboard/consulta_cadastro` (acessada via menu "Gestão de OCIs > Consultar ou Cadastrar OCI")
- **Passos**:
  1. Navegar via menu lateral: "Gestão de OCIs" > "Consultar ou Cadastrar OCI" — aguardar `networkidle`
  2. Verificar filtros visíveis (Especialidade, Linha de Cuidado, Município, etc.)
  3. Selecionar especialidade no filtro — seletor: `[name="co_grupo"]`
  4. Selecionar linha de cuidado — seletor: `[name="id_linha_cuidado"]`
  5. Selecionar município de origem — seletor: `[name="mun_origem"]`
  6. Selecionar unidade solicitante — seletor: `[name="co_cnes_solicitante"]`
  7. Selecionar equipe de referência — seletor: `[name="ine"]`
  8. Alternar switch "Minhas Solicitações" — seletor: `[name="st_somente_usuario_logado"]`
  9. Clicar em "Filtros Avançados" para expandir — seletor: `getByText('Filtros Avançados')`
  10. Submeter busca — seletor: `button[type="submit"]`
  11. Verificar linhas da tabela — seletor: `table tbody tr:not(.expanded-row)`
  12. Navegar para próxima página — seletor: `[aria-label="Próxima página"]`
  13. Navegar para página anterior — seletor: `[aria-label="Página anterior"]`
  14. Navegar para primeira página — seletor: `[aria-label="Primeira página"]`
  15. Navegar para última página — seletor: `[aria-label="Última página"]`
- **Resultado esperado**: Tabela filtrada exibe resultados conforme critérios; paginação funciona corretamente
- **Page Object**: `CadOCIPage.js`
- **Spec**: `tests/oci/oci-listagem-filtragem.spec.js`
- **Status**: ✅ validado

### nova-solicitacao

- **Pré-condições**: Autenticado, módulo OCI, tela CadOCI carregada
- **Rota**: `/oci/dashboard/consulta_cadastro`
- **Passos**:
  1. Clicar no botão "Solicitar OCI" — seletor: `getByText('Solicitar OCI')`
  2. Aguardar modal de especialidades abrir — seletor: `.modal` (hasText "Selecione a Especialidade")
  3. Selecionar especialidade no modal — seletor: `.especialidade-option`
  4. Aguardar modal de nova solicitação abrir — seletor: `.modal` (hasText "Nova Solicitação")
  5. Selecionar linha de cuidado — seletor: `[data-field-name="id_linha_cuidado"]`
  6. Buscar e selecionar paciente (autocomplete assíncrono) — seletor: `[data-field-name="co_pac"]`
  7. Selecionar CID 10 — seletor: `[data-field-name="co_cid"]`
  8. Selecionar profissional solicitante — seletor: `[data-field-name="nu_cns_solicitante"]`
  9. Verificar unidade responsável pré-preenchida — seletor: `[data-field-name="co_cnes_solicitante"]`
  10. Preencher justificativa — seletor: `textarea[name="ds_justificativa"]`
  11. Clicar em "Salvar" — seletor: `button[type="submit"]` (dentro do modal)
- **Resultado esperado**: Solicitação OCI criada com sucesso; toast de confirmação exibido
- **Page Object**: `CadOCIPage.js`, `SolicitacaoModal.js`
- **Spec**: `tests/oci/oci-nova-solicitacao.spec.js`
- **Status**: ✅ validado

### cadastro-paciente

- **Pré-condições**: Autenticado, módulo OCI, modal de nova solicitação aberto
- **Rota**: `/oci/dashboard/consulta_cadastro` (modal sobre modal)
- **Passos**:
  1. Clicar em "Adicionar Cidadão" no modal de solicitação — seletor: `getByRole('button', { name: /Adicionar Cidadão/i })`
  2. Aguardar modal de cadastro de paciente abrir — seletor: `.modal` (hasText "Novo Usuário Cidadão")
  3. Preencher nome completo — seletor: `[name="no_pac"]`
  4. Preencher data de nascimento — seletor: `[name="dt_nasc"]`
  5. Selecionar sexo — seletor: `[data-field-name="no_sexo"]`
  6. Preencher CPF (com máscara) — seletor: `[name="nu_cpf"]`
  7. Preencher CNS — seletor: `[name="nu_cns"]`
  8. Preencher nome da mãe — seletor: `[name="no_mae"]`
  9. Preencher CEP (dispara auto-fill) — seletor: `[name="endereco.nr_cep"]`
  10. Aguardar preenchimento automático de logradouro — seletor: `[data-field-name="endereco.cd_logr"]`
  11. Aguardar preenchimento automático de bairro — seletor: `[data-field-name="endereco.cd_bairro"]`
  12. Aguardar preenchimento automático de UF — seletor: `[data-field-name="endereco.cd_estado"]`
  13. Aguardar preenchimento automático de município — seletor: `[data-field-name="endereco.cd_cidade"]`
  14. Clicar em "Salvar" — seletor: `button[type="submit"]` (dentro do modal)
- **Resultado esperado**: Paciente cadastrado com sucesso; modal fecha e paciente aparece selecionado no campo co_pac
- **Page Object**: `CadastroPacienteModal.js`
- **Spec**: `tests/oci/oci-cadastro-paciente.spec.js`
- **Status**: ✅ validado

### cancelamento

- **Pré-condições**: Autenticado, módulo OCI, tela CadOCI com solicitações listadas
- **Rota**: `/oci/dashboard/consulta_cadastro`
- **Passos**:
  1. Identificar solicitação na tabela — seletor: `table tbody tr`
  2. Clicar no ícone de cancelar da solicitação — seletor: `[class*="ri-close-circle-line"]`
  3. Aguardar modal de cancelamento abrir — seletor: `.modal` (hasText "Justificativa do Cancelamento")
  4. Preencher justificativa — seletor: `#justificativa`
  5. Clicar em "Confirmar" — seletor: `button` (hasText "Confirmar" dentro do modal)
- **Resultado esperado**: Solicitação cancelada com sucesso; status atualizado na tabela; toast de confirmação exibido
- **Page Object**: `CadOCIPage.js`
- **Spec**: `tests/oci/oci-cancelamento-solicitacao.spec.js`
- **Status**: ✅ validado

### detalhes-impressao

- **Pré-condições**: Autenticado, módulo OCI, tela CadOCI com solicitações listadas
- **Rota**: `/oci/dashboard/consulta_cadastro`
- **Passos**:
  1. Identificar solicitação na tabela — seletor: `table tbody tr`
  2. Clicar no botão de expandir detalhes da linha — seletor: `td:first-child button` (ou `td:first-child i`)
  3. Aguardar conteúdo expandido (PacienteExpandido) — seletor: `.expanded-row, [class*="expandido"], [class*="PacienteExpandido"]`
  4. Verificar dados do paciente nos detalhes expandidos
  5. Clicar no ícone de imprimir comprovante — seletor: `[class*="ri-printer-line"]`
- **Resultado esperado**: Detalhes da solicitação exibidos corretamente; comprovante gerado para impressão
- **Page Object**: `CadOCIPage.js`
- **Spec**: `tests/oci/oci-detalhes-impressao.spec.js`
- **Status**: ✅ validado
