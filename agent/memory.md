# Memória do Guardian — Agente de Testes E2E

> Registro de decisões, correções e aprendizados acumulados durante sessões de teste.
> O Guardian consulta este arquivo antes de cada tarefa para evitar repetir erros.
> Última atualização: 2026-04-16

---

## Decisões e Correções

### [2026-04-16] Seletores devem ser escopados dentro do modal
- **Contexto**: Ao verificar campos do formulário de nova solicitação OCI, o seletor `[data-field-name="id_linha_cuidado"]` encontrou 3 elementos — um na tela de filtros atrás do modal e dois dentro do modal.
- **Correção**: Sempre escopar seletores dentro do modal usando `modalForm.locator(...)` em vez de `page.locator(...)` quando interagindo com formulários em modais.
- **Aplicação**: Todo teste que interage com modais.

### [2026-04-16] Imports devem subir 2 níveis de tests/{modulo}/ para tools/
- **Contexto**: O spec em `tests/oci/` importava de `../tools/` mas o caminho correto é `../../tools/`.
- **Correção**: Specs em `tests/{modulo}/` devem usar `../../tools/` e `../../fixtures/` nos imports.
- **Aplicação**: Todo spec dentro de subpastas de `tests/`.

### [2026-04-16] Unidade de saúde sem profissionais cadastrados
- **Contexto**: O campo Profissional Solicitante não mostrava opções porque a unidade de saúde selecionada não tinha profissionais na tabela do banco. O select de profissional é um autocomplete que depende da unidade responsável.
- **Correção**: Antes de testar, consultar o banco para verificar se a unidade tem profissionais cadastrados. Usar a tool `db-query.js` para validar dados disponíveis.
- **Aplicação**: Todo teste que depende de dados relacionais (unidade → profissional, linha de cuidado → CID, etc.).

### [2026-04-16] Sempre assumir que o código de teste está errado — mas PERGUNTAR antes de corrigir
- **Contexto**: O desenvolvedor orientou que os scripts de teste foram feitos como rascunho e podem conter falhas. Porém, ao encontrar uma falha, o Guardian saiu corrigindo o código sem perguntar ao desenvolvedor. O desenvolvedor pode ter visto algo na execução visual que o Guardian não viu nos logs.
- **Correção**: Em toda falha: 1) Analisar o erro. 2) Descrever ao desenvolvedor o que encontrou. 3) PERGUNTAR o que fazer antes de alterar qualquer código. 4) Só corrigir após orientação explícita.
- **Regra**: NUNCA sair corrigindo código automaticamente após uma falha. Sempre perguntar primeiro.
- **Aplicação**: Toda falha de teste.

### [2026-04-16] Usar somente tools do saudeinteligente-testes
- **Contexto**: O desenvolvedor orientou que o Guardian deve usar exclusivamente suas próprias ferramentas em `saudeinteligente-testes/tools/`. Nunca importar ou referenciar código de `saudeinteligente-spa/e2e/`.
- **Correção**: Todo import deve apontar para `../../tools/` (relativo ao spec). Nunca usar helpers, page objects ou scripts do SPA.
- **Aplicação**: Todo código do Guardian.

---

## Dados Descobertos

### Especialidades OCI disponíveis (Luziânia)
- Atenção em Oncologia
- Atenção em Cardiologia
- Atenção em Ortopedia
- Atenção em Oftalmologia
- Atenção em Otorrinolaringologia
- Saúde da Mulher

### Rota correta da tela de Consulta/Cadastro OCI
- `/oci/dashboard/consulta_cadastro` (a rota antiga `/oci/dashboard/cad_oci` não existe mais)

### Campos do formulário de Nova Solicitação OCI
- Unidade Responsável (`co_cnes_solicitante`) — react-select
- Linha de Cuidado (`id_linha_cuidado`) — react-select, filtrado pela especialidade
- Cidadão Usuário (`co_pac`) — react-select async (autocomplete)
- Data da Solicitação (`dt_solicitacao`) — input date, pré-preenchido com data atual
- Profissional Solicitante (`nu_cns_solicitante`) — react-select, depende da unidade responsável
- CID 10 (`co_cid`) — react-select, depende da linha de cuidado
- Justificativa (`ds_justificativa`) — textarea

---

## Pendências

- [x] Consultar banco para encontrar unidade com profissionais cadastrados → UPA Luziânia (7883668) tem 208 profissionais
- [ ] Mapear dependências entre campos (unidade → profissional, linha → CID)

## Dados de Teste Validados no Banco

### Unidades com profissionais vinculados (oci_tb_vinculo)
- **7883668** — UPA de Luziânia (208 profissionais)
- **5882451** — Hospital Municipal do Jardim Ingá (173 profissionais)
- **9093508** — UPA do Jardim Ingá (159 profissionais)
- **2340208** — CAIS I (54 profissionais)
- **0218650** — PSF Jardim do Ingá (23 profissionais)

### Tabelas chave do módulo OCI
- `oci_tb_profissionais` — Cadastro de profissionais (co_profs, nm_profs, nr_cns, nu_cpf)
- `oci_tb_vinculo` — Vínculo profissional-unidade (co_profs, co_cnes, cd_cbo, dt_ini, dt_fim)
- `oci_unidade_solicitante` — Unidades que PODEM solicitar OCI (35 unidades). Campos: co_cnes, dt_ini, dt_fim, no_cnes
- `oci_unidade_executante` — Unidades que PODEM executar OCI (72 unidades). Campos: co_cnes, no_cnes, dt_ini, dt_fim, latitude, longitude
- `oci_tb_fila_espera_oci` — Solicitações OCI
- `oci_tb_linha_cuidado` — Linhas de cuidado
- `cnes_base_estabelecimentos` — Cadastro geral de unidades de saúde

### Regra de negócio: Papéis das unidades
- **Somente unidades cadastradas em `oci_unidade_solicitante` podem solicitar OCI**
- **Somente unidades cadastradas em `oci_unidade_executante` podem executar OCI**
- Uma unidade pode ser solicitante E executante ao mesmo tempo (ex: CAIS I - 2340208, Hospital Jardim Ingá - 5882451)
- O campo "Unidade Responsável" no formulário de nova solicitação deve listar apenas unidades solicitantes

### Unidades SOLICITANTES com profissionais vinculados (para testes)
| CNES | Nome | Profissionais |
|------|------|---------------|
| 7883668 | UPA de Luziânia | 208 |
| 5882451 | Hospital Municipal do Jardim Ingá | 173 |
| 9093508 | UPA do Jardim Ingá | 159 |
| 2340208 | CAIS I | 54 |
| 6427316 | PSF Parque Estrela Dalva IX | 29 |
