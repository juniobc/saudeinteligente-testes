---
titulo: OCI — Testes pendentes das correções/melhorias da sessão de dev de 2026-07-09
modulo: OCI
status: pendente — nenhum destes testes foi executado ao vivo ainda
ultima_atualizacao: 2026-07-09
---

# Como usar este arquivo

Este é um **briefing de conhecimento**, não um script de cliques. Você (agente LLM
com ferramenta de browser, ex. `preview_*` do Claude Code) deve decidir por conta
própria como navegar, o que clicar e o que verificar — como um analista de QA, não
como um robô seguindo roteiro fixo. Mesmos princípios gerais de
`guardian/llm-tests/oci-fluxos-progressao.md`: nunca navegue digitando URLs, selecione
a unidade de trabalho ativa no header antes de criar solicitações, escope seletores ao
modal/dialog ativo, confirme visualmente cada ação, investigue o banco antes de testar
na UI (`guardian/tools/db-query.js`, somente leitura), e pare/pergunte diante de
qualquer ambiguidade ou divergência real de regra de negócio.

Contexto completo do código alterado: `spark/logs/changelog.md` (sessões "RNO2",
"Faseado/Integrado...", "§2.1..."), `spark/memory.md` e
`guardian/llm-tests/MEMORIA-SESSOES.md`/`oci-fluxos-progressao.md`. Relatório de
origem dos achados: `guardian/reports/relatorio-conformidade-ate-oci-20260709.md`
(ver seção 6, "Status pós-sessão", pra comparação rápida do antes/depois).

## Mapa de telas — menu → rota → o que testar aqui

Menu lateral: **Gestão de OCIs** / **Gestão de Agendamentos** / **Gestão das Filas de
Espera** (nomes exatos do menu, clique neles — nunca digite a rota direto, exceto
`/login`).

| Menu | Rota | Título na tela | Usar para |
|---|---|---|---|
| Gestão de OCIs | `oci/dashboard/consulta_cadastro` | Consultar ou Cadastrar OCI | Criar nova OCI (itens 1, 2, 3) — botão "Nova Solicitação". Grid também serve pra achar protocolos existentes por paciente/linha. |
| Gestão de OCIs | `oci/dashboard/config_oci` | Configuração de OCIs | Achar/confirmar `id_progressao` e `st_exige_regulacao` de uma linha antes de testar (mostra "Exige Regulação" por linha, expansível). |
| Gestão de Agendamentos | `oci/dashboard/consulta_cadastro_agenda` | Consulta e Cadastro de Agendas | Cadastrar agenda nova quando a linha não tiver vaga (itens 2, 3, 7 — inclusive o reteste do conflito de horário do item 7). |
| Gestão das Filas de Espera | `oci/dashboard/med_autorizador` | Regulação | Verificar quem aparece aqui (item 2 — só deve ter Sequencial+regulação, não Integrado/Faseado). |
| Gestão das Filas de Espera | `oci/dashboard/lista_espera` | Agendamento da Lista de Espera | 3 abas por fase: Consulta Especializada (`st_fila=1`), Exames de Apoio Diagnóstico (`st_fila=3`), Consulta de Retorno (`st_fila=5`). Usar pra confirmar em qual aba uma OCI aparece (itens 2, 3) e pra agendar manualmente o que ficou pendente (item 4). Campo "Nº Autorização" busca por `nr_protocolo`. |
| (link direto, fora de submenu) | `oci/dashboard/confirm_comparecimento` | Confirmação de Atendimento | Confirmar presença via chave de verificação — é o gatilho de todas as transições de fase testadas nos itens 3, 5, 6. Busca por "ID Solicitação" (`nr_protocolo`). |
| (link direto) | `oci/dashboard/resultado_exame_cid` | Resultado de Exame com CID | Relacionado à RN13 (não é foco desta rodada, mas aparece no fluxo de liberar Fase 3 se a linha tiver `st_exige_resultado_prox_fase`). |

**Não mapeado ainda** (item 6, RN10): a tela/ação pra incluir um exame opcional na
Fase 1 depois de confirmar comparecimento. Não está em nenhum dos menus acima — é
"território novo". Ao chegar no item 6, procure a partir da tela de Confirmação de
Atendimento ou de um detalhe/edição do protocolo já com a 1ª consulta confirmada
(ex: grid da tela "Consultar ou Cadastrar OCI", clicando no protocolo). Se não achar,
reporte a ausência — é um achado válido, não input do usuário.

---

## ✅ Pré-requisito da migração SQL — CONFIRMADO OK (2026-07-09)

O desenvolvedor já rodou
`saudeinteligente-api/microservicoOCI/migrations/2026-07-09_oci_st_exige_regulacao_snapshot.sql`.
Confirmado via banco: a coluna `st_exige_regulacao` existe em `oci_tb_fila_espera_oci`
nos 6 schemas que têm essa tabela (`br_amapa`, `br_distrito_federal`, `br_minsaude`,
`go_luziania`, `mg_vicosa`, `to_paraiso`). **Pode testar direto**, sem precisar
reconferir isso — mas se em algum momento aparecer erro de "coluna inexistente" ao
criar OCI, é sinal de que algo regrediu, reporte imediatamente.

---

## 1. RNO2 — Snapshot de `st_exige_regulacao` na OCI

**O que mudou:** `st_exige_regulacao` deixou de ser só uma config da linha de cuidado
— agora é gravado na própria OCI (`oci_tb_fila_espera_oci.st_exige_regulacao`) no
momento da criação, como uma foto do valor vigente naquele instante.

**Testar:**
1. Criar OCI **Sequencial** numa linha com `st_exige_regulacao=true` (ver
   `oci_tb_linha_cuidado` no banco pra achar uma). Confirmar no banco que o protocolo
   criado tem `st_exige_regulacao=true` gravado na própria linha da
   `oci_tb_fila_espera_oci` (não só na linha de cuidado).
2. Repetir com uma linha Sequencial `st_exige_regulacao=false` — confirmar `false`
   gravado no protocolo.
3. Chamar `POST /oci/oci-com-agendamento-automatico` **diretamente** (via API, não
   pela UI) numa linha Sequencial com `st_exige_regulacao=true` — deve retornar erro
   de validação (a linha exige regulação, não pode pular direto pro agendamento
   automático). Isso é uma proteção de backend independente da UI.

---

## 2. §2.1 — OCI sem agenda não deve mais cair na fila de Regulação

**Regra correta:** só cai em "Aguardando Autorização" (`st_fila=0`, tela de
Regulação) quem for **Sequencial + `st_exige_regulacao=true`**. Qualquer outro caso
(Integrado, Faseado, Sequencial sem regulação) que não conseguir agendamento
automático na criação (por falta de agenda) deve nascer em `st_fila=1` (Aguardando
Fase 1) — não é "pendência de aprovação médica", é só "esperando ser agendado".

**Testar:**
1. Achar (ou criar via UI de config) uma linha **Integrada ou Faseada SEM nenhuma
   agenda cadastrada** para a Primeira Consulta. Criar uma OCI nessa linha.
2. Confirmar no banco: `st_fila` deve ser `1`, **não** `0`.
3. Confirmar na UI: a OCI **não** deve aparecer na tela "Regulação de Solicitações de
   OCI" (`/oci/dashboard/med_autorizador`).
4. Confirmar que ela aparece corretamente na tela "Agendamento da Lista de Espera"
   (`/oci/dashboard/lista_espera`, aba Consulta Especializada).
5. Regressão: criar OCI Sequencial numa linha com `st_exige_regulacao=true` —
   continua indo pra `st_fila=0` e aparecendo na tela de Regulação normalmente.

---

## 3. Faseado/Integrado — fases pré-agendadas reconhecidas ao confirmar comparecimento

**Regra correta (esclarecida pelo dev):** AGENDAMENTO e CONFIRMAÇÃO são gates
diferentes. Integrado agenda as 3 fases juntas na criação; Faseado agenda Fase 1+2
juntas na criação; Sequencial agenda uma fase de cada vez. Já a CONFIRMAÇÃO de
comparecimento é sempre sequencial nos 3 modos (fase N só confirma depois da N-1).
Antes desta correção, mesmo tendo a Fase 2 pré-agendada, o sistema sempre jogava a
OCI pra "aguardando agendar" (igual Sequencial) ao confirmar a Fase 1.

**Testar:**
1. Achar/criar uma linha **Faseada** com agenda disponível para Consulta E Exames.
   Criar uma OCI nessa linha (deve auto-agendar Fase 1+2 juntas, `st_fila=2`).
2. Confirmar comparecimento da Fase 1 (chave de verificação, tela "Confirmação de
   Atendimento"). Checar no banco: `st_fila` deve pular direto pra `4` (Agendada
   Fase 2) — **não** deve passar por `3` (Aguardando Fase 2) exigindo reagendar.
3. Repetir com uma linha **Integrada** com agenda disponível pras 3 fases — depois de
   confirmar Consulta e todos os exames obrigatórios da Fase 2, checar que pula
   direto pra `st_fila=6` (Agendada Fase 3), sem precisar reagendar o Retorno.
4. Regressão: numa linha **Sequencial** (sem pré-agendamento de fases futuras),
   confirmar Fase 1 — deve continuar indo pra `st_fila=3` (Aguardando Fase 2),
   comportamento inalterado.
5. Cenário do relatório original (§2.8): linha Faseada **sem** agenda de Fase 1 na
   criação (cai no fluxo manual, sem pré-agendamento) — confirmar que o comportamento
   "aguardando agendar" continua correto nesse caso (a diferenciação só existe quando
   o agendamento automático conseguiu reservar as fases juntas).

---

## 4. Agendamento automático deixou de ser tudo-ou-nada

**O que mudou:** `criar_oci_com_agendamento_automatico` — falta de vaga em UM exame
ou no Retorno não aborta mais a criação inteira da OCI. A Consulta (Fase 1) continua
sendo obrigatória ter vaga (se não tiver, a criação automática ainda falha — isso é
esperado). Exames/Retorno sem vaga ficam **pendentes**. Retorno nunca agenda antes de
todos os exames obrigatórios estarem agendados (mesmo que haja vaga de Retorno).

**Testar (via API, já que a tela "Nova Solicitação" do módulo OCI usa outro endpoint —
ver nota abaixo):**
1. `POST /oci/oci-com-agendamento-automatico` numa linha Integrada/Faseada onde a
   Consulta tem vaga mas 1 dos exames obrigatórios não tem → deve criar a OCI
   normalmente (sem erro), com esse exame listado em `exames_pendentes` na resposta.
2. Mesma linha, mas SEM nenhum exame com vaga → OCI criada com todos os exames em
   `exames_pendentes`, Retorno (se Integrado) com `retorno_pendente=true` mesmo que
   houvesse vaga de Retorno disponível.
3. Linha Integrada onde nem a Consulta tem vaga → deve continuar falhando (erro),
   igual ao comportamento anterior — esse caso não mudou.
4. **Nota importante:** a tela "Nova Solicitação" do módulo OCI (`CadOCI.jsx`) na
   prática **não chama** esse endpoint — ela usa `criar_oci_com_agendamento_multi_fase`
   (via o modal `AgendamentoMultiFaseModal`, que só envia as fases que já têm
   executante/vaga disponível). Então pra testar o item acima, use uma chamada de API
   direta (Postman/curl), não a UI. Se quiser testar o comportamento **via UI**, o
   caminho é: linha Faseada/Integrada com vaga só em ALGUMAS fases → o modal de
   agendamento deve permitir confirmar só as fases com vaga, deixando as outras
   pendentes (comportamento do `criar_oci_com_agendamento_multi_fase`, que não foi
   alterado nesta sessão, mas vale confirmar que já funciona corretamente).

---

## 5. RN12 — exame agendado vira obrigatório para liberar a Fase 3

**Regra confirmada pelo dev:** um exame que foi colocado na agenda (mesmo que
originalmente opcional na config da linha) passa a ser obrigatório para liberar o
Retorno — precisa ter comparecimento confirmado igual aos demais.

**Testar:**
- Depende de RN10 (tela de inclusão de exame opcional) estar localizada/funcionando —
  ainda não estava, no relatório original. Se a tela existir/for encontrada nesta
  rodada: incluir um exame opcional na Fase 1 (depois de confirmar presença da 1ª
  consulta, ver item 6 abaixo), agendar esse exame, e confirmar que o Retorno fica
  bloqueado até esse exame específico ter comparecimento confirmado — mesmo que os
  exames originalmente obrigatórios já tenham sido todos confirmados.
- Se a tela ainda não for encontrada, reporte isso normalmente (é um achado válido,
  não invalida o teste) — a correção no backend já está pronta pra quando essa
  tela existir.

---

## 6. RN10 — exame opcional só aparece após confirmar presença na 1ª consulta

**Esclarecimento do dev (não é código alterado, é correção de entendimento):** ao
retestar RN10-12, agende a Fase 1 → **confirme comparecimento da Fase 1** → só então
procure a tela/ação de incluir exame opcional (provavelmente ligada ao registro da
consulta/atendimento em si, não à tela de agendamento de exames). O teste anterior
procurou antes desse ponto e por isso não achou.

---

## 7. §2.8 (achado adicional) — criação de agenda "não atômica" em conflito: reavaliar

**Contexto:** o relatório original relatou que, ao cadastrar agenda pra um intervalo
de vários dias, um conflito de horário do profissional em UM dos dias resultava em
erro 409 mas **mesmo assim** deixava um registro gravado no banco.

**Investigação de código feita nesta sessão (sem mudança de código ainda):** pela
leitura de `agenda_service.py::create_agenda`, a validação de conflito acontece
**antes** de qualquer INSERT (o código valida TODOS os dias do intervalo primeiro,
acumula os registros, e só insere em lote depois — tudo numa única transação com
rollback em qualquer exceção). Não deveria ser possível reproduzir esse bug com o
código atual. Duas hipóteses: (a) já foi corrigido antes mesmo do teste original (o
trecho de "validar tudo antes de inserir" já existe desde 17/01/2026, via
`git blame`), ou (b) o teste original confundiu duas submissões separadas (tentativa
com intervalo maior falhou, tentativa seguinte com intervalo menor teve sucesso) com
uma única transação parcialmente persistida.

**Testar (reproduzir o cenário exato do relatório):**
1. Escolher um profissional com pelo menos uma agenda já cadastrada num dia
   específico dentro de um intervalo maior (ex: profissional já tem agenda dia 3, você
   vai tentar cadastrar um intervalo de 5 dias que inclui o dia 3 no mesmo horário).
2. Antes de submeter, anotar quantos registros existem em `oci_tb_agenda` pra esse
   profissional nesse intervalo (`SELECT COUNT(*) FROM oci_tb_agenda WHERE
   cd_prof_agenda = <id> AND dt_hr_agen::date BETWEEN <inicio> AND <fim>`).
3. Submeter o cadastro de agenda pro intervalo de 5 dias (tela "Consulta e Cadastro
   de Agendas").
4. Confirmar que a UI reporta erro (409, conflito de horário) — esperado.
5. **Checar de novo a contagem no banco** — se o número for igual ao do passo 2, o
   bug não reproduziu (transação atômica funcionando corretamente). Se aumentou,
   o bug é real e precisa de correção — nesse caso, reporte com evidência (quais
   `nr_item` apareceram, em qual dia) pra investigarmos o porquê, já que contradiz a
   leitura do código.

---

## Resumo rápido do que testar (checklist)

- [x] Migração SQL do RNO2 já aplicada em todos os 6 tenants (confirmado 2026-07-09)
- [ ] RNO2 — snapshot gravado corretamente na OCI (Sequencial com/sem regulação)
- [ ] RNO2 — bloqueio de agendamento automático direto (Sequencial + regulação, via API)
- [ ] §2.1 — OCI sem agenda (Integrado/Faseado/Sequencial-sem-regulação) nasce em
      `st_fila=1`, não aparece na tela de Regulação
- [ ] §2.1 — regressão: Sequencial com regulação continua indo pra `st_fila=0`
- [ ] Faseado — Fase 2 pré-agendada pula direto pra `st_fila=4` ao confirmar Fase 1
- [ ] Integrado — Fase 3 pré-agendada pula direto pra `st_fila=6`
- [ ] Regressão — Sequencial sem pré-agendamento continua indo pra "aguardando agendar"
- [ ] Agendamento automático — tolerância a falta de vaga em exames/retorno (via API)
- [ ] RN10 — reteste procurando a tela de exame opcional DEPOIS de confirmar Fase 1
- [ ] RN12 — exame opcional agendado bloqueia Retorno (se RN10 permitir testar)
- [ ] §2.8 achado adicional — reproduzir conflito de agenda multi-dia, checar
      contagem de registros antes/depois

Ao concluir, registre os resultados num novo relatório em `guardian/reports/` (mesmo
padrão do `relatorio-conformidade-ate-oci-20260709.md`) e atualize
`guardian/llm-tests/MEMORIA-SESSOES.md` com o que for aprendido.
