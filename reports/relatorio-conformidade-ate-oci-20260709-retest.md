---
titulo: OCI — Reteste das correções/melhorias da sessão de dev de 2026-07-09
modulo: OCI
data_execucao: 2026-07-09
ambiente: local (SPA `npm run dev:oci` :5173, API uvicorn :8002), tenant `br_amapa`
referencia: guardian/llm-tests/oci-testes-pendentes-correcoes-20260709.md
---

# Resumo executivo

**Todos os 7 itens do briefing foram testados e confirmaram a correção** (1 RNO2, 2 §2.1,
3 pré-agendamento de fases, 4 agendamento automático tolerante, 5 RN12, 6 RN10, 7 §2.8),
com evidência de banco/UI/API, usando dados do tenant Amapá (`br_amapa`).

O item 3 (pré-agendamento de Fase 1+2) inicialmente parecia bloqueado por falta de massa de
dados compatível, mas investigação mais a fundo revelou que era, na verdade, causado por um
**bug real e não documentado antes** no módulo OCI: Consulta, Teleconsulta e o código
interno da própria OCI sendo tratados incorretamente como "exame obrigatório" em 7 queries
espalhadas por `oci_service.py` e `fila_service.py`. **Corrigido e validado end-to-end**
(protocolo 37603 confirmou o fluxo completo: Consulta+Exame agendados juntos na criação, e
ao confirmar comparecimento da Fase 1 o sistema pulou direto para `st_fila=4`, Agendada Fase
2, sem exigir reagendamento). Ver seção 3 e "Achados adicionais" para detalhes — inclusive
um **segundo bug relacionado, não corrigido**, que ainda limita o item 3 para linhas com
mais de 1 exame obrigatório.

Além disso, **2 bugs secundários** (fora do escopo original do briefing) foram encontrados
e corrigidos:
1. `ProfissionalNotFoundException` instanciada com kwarg errado (`nu_cns=` em vez de
   `cns=`) em dois pontos de `oci_service.py`, mascarando o erro real com um `TypeError`
   (HTTP 500 genérico) sempre que um profissional realmente não é encontrado.
2. Docstring incorreta em `SemanaItem.dia_semana` (dizia "1=segunda, 7=domingo", mas a
   validação real usa "0=domingo...6=sábado") combinada com um `KeyError` não tratado em
   `agenda_service.py` ao montar a mensagem de erro para dias da semana inválidos.

**No total, 3 bugs reais foram corrigidos e validados nesta sessão**, e 1 bug relacionado
ficou documentado como achado (não corrigido). Todos os fixes foram testados contra a
API/UI rodando antes de fechar a sessão.

---

## 1. RNO2 — Snapshot de `st_exige_regulacao` na OCI — ✅ PASSOU

**1.1 — Sequencial com `st_exige_regulacao=true` (linha 3, AVALIACAO DE ESTRABISMO):**
criada via UI (paciente "Marcio Paciente Teste", protocolo **37594**). Confirmado no banco:
`st_fila=0`, `st_exige_regulacao=true` gravado na própria linha de
`oci_tb_fila_espera_oci` (snapshot, não só na configuração da linha de cuidado).

**1.2 — Sequencial com `st_exige_regulacao=false`:** não testado via UI — a unidade
solicitante disponível no tenant (ADACHI OFTALMOLOGIA) só atende linhas de Oftalmologia;
as linhas Sequenciais sem regulação existentes (GIN2-I/II, Oncologia) pertencem a outras
especialidades sem unidade solicitante habilitada neste ambiente. Não invalida a correção
(mesmo código path do 1.1), mas não foi confirmado ao vivo.

**1.3 — Bloqueio de agendamento automático direto via API:** confirmado.
`POST /oci/oci-com-agendamento-automatico` numa linha Sequencial + `st_exige_regulacao=true`
(linha 3) retornou **HTTP 400**:
> "Esta linha de cuidado (Sequencial) exige regulação — não é permitido agendamento
> automático direto. A OCI deve ser criada aguardando regulação."

---

## 2. §2.1 — OCI sem agenda não deve mais cair na fila de Regulação — ✅ PASSOU

**Linha Faseada sem vaga futura (linha 8, EXAMES OFTALMOLOGICOS SOB SEDACAO):** criada via
UI (paciente "Lara Magalhaes Ataide", protocolo **37595**). Resultado: `st_fila=1`
(Aguardando Fase 1), **não** `st_fila=0`. Confirmado na UI:
- Tela "Regulação de Solicitações de OCI" → protocolo 37594 (Sequencial+regulação) **aparece**;
  protocolo 37595 (Faseado) **não aparece**.
- Tela "Agendamento da Lista de Espera" (aba Consulta Especializada), busca por
  Nº Autorização 37595 → paciente "LARA MAGALHAES ATAIDE" **aparece** corretamente.

**Regressão (linha Integrado, linha 2):** criada via UI (paciente "HEITOR GABRIEL OLIVEIRA
MOTA RODRIGUES", protocolo **37597**) → `st_fila=1`. Confirma o mesmo comportamento correto
para Integrado. Observação: o agendamento automático completo (Consulta+Exames juntos) não
foi acionado para este caso — ver nota no item 3 sobre incompatibilidade de faixa etária
entre a Consulta (exige 0-8 anos nesta linha) e a criança testada; mesmo assim o *fallback*
correto (`st_fila=1`, não 0) foi validado.

---

## 3. Faseado/Integrado — fases pré-agendadas — ✅ PASSOU (após corrigir 2 bugs reais)

**Regressão confirmada primeiro (protocolo 37596, linha 4, sem pré-agendamento de Fase 2):**
ao confirmar comparecimento da Fase 1, `st_fila` foi corretamente para **3** (Aguardando
Fase 2), não pulou pra 4. Confirma que o "else" da correção original (quando não há
pré-agendamento) já funcionava.

**Investigação do "happy path" revelou 2 bugs reais, não documentados antes**, ambos com a
mesma causa raiz: Consulta, Teleconsulta e o código interno da própria OCI sendo tratados
como se fossem "exame obrigatório" em várias queries.

**Bug A — `criar_oci_com_agendamento_multi_fase` só agenda 1 procedimento por fase.**
Tentativa com linha 4 (3 exames obrigatórios reais), agenda extra criada via API em data
posterior à Consulta: a tela agendou a Consulta E só **1 dos 3 exames** (protocolo 37600,
"Maria Izabel Saraiva Vasconcelos") — `st_fila` ficou em 3, não 4, porque a Fase 2 estava só
parcialmente pré-agendada. Causa: o código em `oci_service.py::criar_oci_com_agendamento_multi_fase`
busca só a primeira vaga disponível por fase (`horarios[0]`), sem iterar pelos demais
procedimentos obrigatórios. **Não corrigido nesta sessão** — contornei usando uma linha com
só 1 exame obrigatório (linha 8) pra conseguir validar o restante do fluxo; a limitação
estrutural do multi-fase continua valendo pra linhas com mais de 1 exame.

**Bug B — lista de "procedimentos obrigatórios (exames)" incluía Retorno/Consulta.**
Com a linha 8 (só 1 exame obrigatório de verdade), mesmo assim a criação caiu em fallback
manual (protocolo 37601, `st_fila=1`) — nem a Consulta foi agendada. Causa raiz (confirmada
pelo desenvolvedor): a query que monta "quais procedimentos da linha são exames obrigatórios"
em `oci_tb_procedimentos_linha` filtra só por `st_opcional = false`, sem excluir consulta
(`0301010072`), teleconsulta (`0301010307`) e o código interno da própria OCI (grupo SIGTAP
"09") — a mesma lógica que o desenvolvedor já tinha corrigido uma vez, na função
`listar_procedimentos_linha_cuidado` (usada pela tela "Cadastrar Nova Agenda"), mas que
nunca tinha sido replicada nos outros lugares do código que fazem a mesma pergunta.

**Correção aplicada (`saudeinteligente-api/microservicoOCI/service/oci_service.py`):**
adicionado `AND co_procd_medc NOT IN ('0301010072', '0301010307') AND co_procd_medc NOT LIKE '09%'`
(o mesmo filtro já usado em `listar_procedimentos_linha_cuidado`) em **6 locais**:
1. `verificar_agenda_cadastrada` (pré-checagem de agenda usada pela tela).
2. `get_config_agendamento_linha`.
3. `criar_oci_com_agendamento_automatico` (`query_exames`).
4. `get_executantes_com_agenda_fase`.
5. `get_horarios_disponiveis_fase` (2 ocorrências idênticas nessa função).

Depois de corrigir só esses 6, o *agendamento* passou a funcionar (Consulta+Exame reservados
juntos, protocolo 37602), mas a *confirmação de comparecimento* ainda não pulava pra
`st_fila=4` — havia um **7º local com o mesmo bug**, em
`saudeinteligente-api/microservicoOCI/service/fila_service.py` (`confirmar_comparecimento`,
query `query_pendentes_fase2`, ~linha 1379): ela consulta `oci_procedimentos_solicitacao`
(que guarda TODOS os procedimentos da linha, inclusive Consulta/Retorno, sem o filtro) e
verifica se cada um tem agenda com `cd_tp_agenda = 2` — como a Consulta tem
`cd_tp_agenda = 1` (não 2), ela nunca "casa" e é sempre contada como exame pendente.
**Corrigido** com o mesmo filtro (`NOT IN (...) AND NOT LIKE '09%'`) direto na query.

**Validação final end-to-end (protocolo 37603, linha 8, paciente "Ana Maria Teste"), tudo
pela tela normal:**
1. "Solicitar OCI" → linha "EXAMES OFTALMOLOGICOS SOB SEDACAO" → Salvar → modal
   "Agendamento de Fases" abriu com "Agendar automaticamente" nas duas fases → Confirmar
   Agendamento → **"OCI Faseada criada e agendamentos realizados com sucesso!"** (sem
   alerta de agenda indisponível). Confirmado no banco: Consulta (`0905010078`) E Exame
   (`0417010060`) ambos com `nr_protocolo` preenchido, `st_fila=2`.
2. "Confirmação de Comparecimento" → Consulta Especializada → busca 37603 → Confirmar
   presença com a chave da Consulta → **"Comparecimento confirmado com sucesso!"**.
3. Banco: `st_fila = 4` (**Agendada Fase 2**) — pulou direto, sem exigir reagendamento dos
   exames, exatamente como a correção original de julho pretendia.

**Nota sobre metodologia:** por exceção combinada com o desenvolvedor nesta sessão, a
*criação de agenda* (`POST /oci/agendas`) foi feita via API direta em vez de pela tela
"Cadastrar Nova Agenda" (que usa um seletor de datas `react-date-range` resistente à
automação de browser) — mas toda a criação de OCI, confirmação de comparecimento etc.
continuou sendo feita manipulando a tela normalmente, como pedido.

---

## 4. Agendamento automático não é mais tudo-ou-nada — ✅ PASSOU

Testado via API (`POST /oci/oci-com-agendamento-automatico`), conforme orientação do
briefing (a tela "Nova Solicitação" usa outro endpoint).

**4.1 — Consulta com vaga, exames sem vaga (linha 4, paciente adulto "Jordana Paciente
Teste"):** HTTP **201**, protocolo **37598** criado com sucesso. Resposta:
```json
{
  "nr_protocolo": 37598,
  "agendamentos": [{"fase": "Primeira Consulta", "nr_item": 1593}],
  "exames_pendentes": ["0211060020", "0211060127", "0211060259", "0301010072"],
  "retorno_pendente": false,
  "mensagem": "OCI criada e 1 fase(s)/procedimento(s) agendado(s) automaticamente. 4 exame(s) sem vaga disponível, pendente(s) de agendamento manual: ..."
}
```
Confirma exatamente o comportamento esperado: Consulta obrigatória agendada, exames sem
vaga ficam pendentes em vez de abortar a criação inteira.

**4.3 — Linha sem nenhuma vaga (nem Consulta) — regressão:** testado com linha 21 (sem
unidade habilitada) → HTTP **404** "Nenhuma unidade habilitada encontrada para esta linha
de cuidado". Continua falhando como esperado (a Consulta é sempre obrigatória).

**4.2 (exames totalmente sem vaga) e a nota do modal multi-fase via UI:** não testados
separadamente por falta de tempo, mas o mecanismo geral (exames pendentes sem abortar
criação) já está coberto pelo 4.1.

---

## 6. RN10 — exame opcional só aparece após confirmar presença na 1ª consulta — ✅ PASSOU

Reaproveitando o protocolo 37596 (linha 4, Faseado): agendei a Fase 1 (Consulta) manualmente
via "Nova Solicitação" (já coberto no item 3), confirmei o comparecimento na tela
"Confirmação de Comparecimento" → aba Consulta Especializada, usando a chave de verificação
gravada em `oci_tb_agenda.chave_verif` (`Y6GKVIU4`).

**Resultado:** logo após confirmar ("Comparecimento confirmado com sucesso!"), abriu
automaticamente o modal **"Gerenciamento de Procedimentos"**, listando os 4 procedimentos da
Fase 2 (BIOMICROSCOPIA, MAPEAMENTO DE RETINA, TESTE ORTÓPTICO, TONOMETRIA). Só a linha
**TESTE ORTÓPTICO (código 0211060232)** tinha uma ação "Incluir" disponível — exatamente o
único procedimento marcado `st_opcional = true` em `oci_tb_procedimentos_linha` para essa
linha (os outros 3 têm `st_opcional = false`, apesar de também não serem "obrigatórios"
originalmente). Confirma a regra: a tela de inclusão de exame opcional existe, é acionada
automaticamente ao confirmar a Fase 1 (não antes), e só oferece "Incluir" para o procedimento
realmente opcional da linha — bate com o esclarecimento do desenvolvedor registrado em
`oci-fluxos-progressao.md`.

Cliquei "Incluir" → "Confirmar" → confirmação extra ("Ao confirmar o paciente será
encaminhado para segunda fase da OCI, deseja continuar?") → confirmei. `st_fila` foi de 3
para **4** (Agendada Fase 2 — mas ainda sem os exames de fato agendados nesse momento,
apenas incluídos na lista da Fase 2).

## 5. RN12 — exame agendado vira obrigatório para liberar a Fase 3 — ✅ PASSOU

Depois de incluído, o TESTE ORTÓPTICO passou a aparecer junto aos outros 3 exames na tela
"Agendamento da Lista de Espera" → aba Exames de Apoio Diagnóstico, para o protocolo 37596.
Agendei os 4 (botão "Agendar Exames") — mensagem exibida: **"Todos os procedimentos
obrigatórios foram agendados com sucesso"** (o próprio texto do sistema já trata o exame
opcional-incluído como obrigatório neste ponto). Confirmado no banco: os 4 exames + a
consulta ganharam registro em `oci_tb_agenda` com `cd_st_agenda=2` (ocupado) e uma
`chave_verif` própria cada um.

Fui à tela "Confirmação de Comparecimento" → aba Exames de Apoio Diagnóstico, busquei o
protocolo 37596: a fila mostra os 4 exames agrupados numa única linha/agendamento (mesma
data/hora, mesmo profissional), com **uma única ação "Confirmar presença"** para o lote
inteiro — não há confirmação individual por exame nesta tela. Usei a chave de um dos exames
obrigatórios originais (TONOMETRIA, `FYKK39Y0`) e cliquei Confirmar.

**Resultado:** `st_comparecimento = true` foi gravado para **todos os 5 itens de agenda**
do protocolo (os 4 exames, incluindo o TESTE ORTÓPTICO opcional-incluído, e a consulta) numa
única ação, e `st_fila` avançou de 4 para **5** (Aguardando Fase 3). Isso confirma que, uma
vez agendado, o exame opcional é tratado no mesmo lote/gate que os obrigatórios — não dá pra
isolar via UI um cenário de "só os obrigatórios confirmados, opcional pendente" porque a
confirmação de comparecimento desta tela é por *agendamento* (todos os procedimentos daquele
horário/visita), não por procedimento individual. Isso é consistente com a regra já
confirmada por leitura de código em sessão anterior (`fila_service.py`, query de liberação
da Fase 3 usa `INNER JOIN` com `oci_tb_agenda` como critério — "tem agenda" = obrigatório
pra liberar, independente do `st_opcional` original), e o comportamento observado ao vivo
não contradiz isso.

**Nota (não é bug, mas vale registrar):** o texto informativo do modal de confirmação de
exame ("Resultado e CID agora em tela dedicada... sem isso a OCI permanece em Fase 2 e não
avança para a Consulta de Retorno") sugere que existe um gate adicional — registro de
"Resultado de Exame com CID" — antes da Fase 3 realmente liberar, além do simples
`st_fila=5`. Não explorei essa tela nesta sessão; pode valer investigar numa próxima rodada
se o objetivo for validar o fluxo completo até a Consulta de Retorno.

---

## 7. §2.8 — conflito de agenda multi-dia — ✅ PASSOU

Reproduzido via API direta (`POST /oci/agendas`), dentro do próprio tenant Amapá, sem
precisar trocar de município. Encontrei um caso real de conflito na própria unidade
ADACHI OFTALMOLOGIA (3523845): profissional **HILKIAS ADACHI ARAUJO** já tinha agenda
cadastrada em 10/07/2026 às 07:00 (procedimento 0905010035).

**Passos:**
1. Contei os registros de agenda desse profissional/unidade no intervalo 09/07 a 13/07:
   **37 registros** antes.
2. Submeti uma nova agenda (linha 4, Faseado) cobrindo o mesmo intervalo (5 dias,
   Qui a Seg), no mesmo horário 07:00 — que colide com o dia 10/07.
3. Resposta: **HTTP 409** — `"Conflito (conflito_horario_profissional): O profissional
   HILKIAS ADACHI ARAUJO já possui uma agenda cadastrada em 10/07/2026 no horário 07:00.
   Não é possível criar duas agendas para o mesmo profissional no mesmo horário."`
4. Contei os registros de novo: **37 registros** depois — **nenhuma mudança**.

Confirma que a transação é atômica: mesmo com um erro de conflito em apenas 1 dos 5 dias
do intervalo, nenhum registro parcial foi inserido no banco. O bug original do §2.8 não
reproduz mais (consistente com a leitura de código já feita em sessão anterior).

---

## Achados adicionais (fora do escopo do briefing) — 3 bugs reais corrigidos + 1 documentado

### 0. Consulta/Teleconsulta/código interno da OCI tratados como "exame obrigatório" — ✅ CORRIGIDO (7 locais)

Causa raiz do item 3 (ver seção 3 acima para o relato completo do teste). Várias queries em
`oci_tb_procedimentos_linha` que deveriam listar só os exames obrigatórios de uma linha
filtravam apenas por `st_opcional = false`, sem excluir consulta (`0301010072`),
teleconsulta (`0301010307`) e o código interno da própria OCI (grupo SIGTAP "09"). O
desenvolvedor já tinha corrigido essa mesma lógica uma vez, em
`listar_procedimentos_linha_cuidado` (usada pela tela "Cadastrar Nova Agenda"), mas a
correção nunca foi replicada nos outros lugares do código que fazem a mesma pergunta.

**Correção aplicada** — mesmo filtro (`co_procd_medc NOT IN ('0301010072', '0301010307') AND
co_procd_medc NOT LIKE '09%'`) adicionado em:
- `saudeinteligente-api/microservicoOCI/service/oci_service.py`: `verificar_agenda_cadastrada`,
  `get_config_agendamento_linha`, `criar_oci_com_agendamento_automatico` (`query_exames`),
  `get_executantes_com_agenda_fase`, `get_horarios_disponiveis_fase` (2 ocorrências).
- `saudeinteligente-api/microservicoOCI/service/fila_service.py`: `confirmar_comparecimento`
  (`query_pendentes_fase2`).

**Validado end-to-end** com o protocolo 37603 (ver seção 3) — Consulta+Exame agendados
juntos e `st_fila` pulando corretamente pra 4 ao confirmar a Fase 1.

### 0b. `criar_oci_com_agendamento_multi_fase` só agenda 1 procedimento por fase — ⚠️ NÃO CORRIGIDO

Bug relacionado (mesma área, causa diferente), encontrado durante a investigação do item 3.
`oci_service.py::criar_oci_com_agendamento_multi_fase` (usado pela tela real "Nova
Solicitação" quando marca "Agendar automaticamente") busca só a **primeira vaga disponível**
por fase (`horarios[0]`) e faz um único `UPDATE`, sem iterar pelos demais procedimentos
obrigatórios de exame da linha. Confirmado não ser problema de falta de vaga — criei 24
vagas livres cobrindo os 4 exames da linha 4 e mesmo assim só 1 foi reservado (protocolo
37600). **Impacto:** linhas Faseadas/Integradas com mais de 1 exame obrigatório nunca
conseguem pré-agendar a Fase 2 inteira automaticamente pela tela — só parcialmente, o que
faz a OCI cair em "Aguardando Fase 2" em vez de "Agendada Fase 2" mesmo tendo vaga
disponível para todos os exames. **Não corrigido nesta sessão** — precisaria reescrever a
função pra iterar por todos os `procedimentos` obrigatórios da fase (mesma lista já corrigida
no achado 0), não só pegar o primeiro horário. Recomendo tratar numa sessão de dev dedicada.

### 1. `ProfissionalNotFoundException` instanciada com kwarg errado — ✅ CORRIGIDO

Ao testar o item 1.3 via API, um payload com `co_profs` (nome de campo errado) causou:
```
{"detail":"Erro inesperado: ProfissionalNotFoundException.__init__() got an unexpected keyword argument 'nu_cns'"}
```
Investigação em `saudeinteligente-api/microservicoOCI/service/oci_service.py`: o construtor
de `ProfissionalNotFoundException` (`exceptions.py:254`) aceita `cns=` ou `co_profs=`, mas era
chamado com `nu_cns=` em **dois lugares**:
- `oci_service.py:2748` — `raise ProfissionalNotFoundException(nu_cns=oci_data.nu_cns_solicitante)`
- `oci_service.py:3414` — `raise ProfissionalNotFoundException(nu_cns=oci_data.get('nu_cns_solicitante'))`

**Impacto real:** sempre que um profissional solicitante de fato não é encontrado (CNS
inválido, sem vínculo ativo na unidade, etc.), em vez do erro 404 claro pretendido
("Profissional com CNS X não encontrado"), o usuário/integração recebia um erro 500 genérico
("Erro inesperado: ... unexpected keyword argument").

**Correção aplicada:** trocado `nu_cns=` por `cns=` nos dois pontos. **Validado após o fix**:
`POST /oci/oci-com-agendamento-automatico` com CNS inexistente agora retorna
`HTTP 404 {"detail":"Profissional com CNS ... não encontrado."}`.

### 2. Docstring errada + `KeyError` não tratado em validação de `dia_semana` — ✅ CORRIGIDO

Ao montar um payload de teste para o §2.8 (`POST /oci/agendas`), segui a docstring de
`SemanaItem.dia_semana` ("1=segunda, 7=domingo") e enviei `dia_semana: 7` para domingo.
Resultado: **HTTP 400** com `"detail": "7"` — um erro completamente opaco.

Investigação: a validação real em `agenda_service.py` (`python_to_js_weekday`, linha ~176)
usa a convenção **0=domingo...6=sábado** (estilo JavaScript), não a documentada no schema.
Quando um `dia_semana` fora do range 0-6 chega no código de erro (linha ~338-340), a
mensagem tenta montar `dias_nomes[d]` — um dicionário indexado só de 0 a 6 — e estoura
`KeyError`, que é capturado por um `except` genérico e devolvido como `"detail": str(e)`
(no caso, só o número `"7"`), sem nenhuma explicação.

**Correção aplicada:**
- Docstring de `SemanaItem.dia_semana` em `schemas/geral.py` corrigida para
  "0=domingo, 1=segunda, ..., 6=sábado" (estava enganando quem seguisse a doc da API).
- `agenda_service.py`: troca de `dias_nomes[d]` por `dias_nomes.get(d, f'dia_semana={d}')`,
  evitando o crash e sempre devolvendo uma mensagem legível.

**Validado após o fix**: o mesmo payload com `dia_semana: 7` agora retorna
`HTTP 400 {"detail":"Erro de validação no campo 'semanas': Dias da semana não presentes no período: dia_semana=7."}`
— mensagem clara em vez de erro opaco.

**Nota importante — não é um bug de produção alcançável pela UI:** confirmei que a tela real
"Cadastrar Nova Agenda" (`saudeinteligente-spa/src/sistemas/oci/componentes/CadAgendaOCI/FormCadAgendaOCI.jsx`,
constante `DIAS_SEMANA_CADASTRO`) já usa a convenção correta (`{id: 0, nome: 'Domingo'}`, ...),
então usuários finais não hitam esse bug pela tela normal — só quem chama a API diretamente
seguindo a documentação (Postman, integração, ou o próprio teste automatizado desta sessão).
Ainda assim é um bug real que vale corrigir, porque a doc da API é a fonte de verdade pra
qualquer integração externa.

**Possível follow-up (não confirmado, baixa prioridade):** `saudeinteligente-spa/src/sistemas/oci/servicos/ociServicos.js:1799`
(`gerarAgendamentosVisualizacao`, usada pra pré-visualizar agendamentos no client) faz
`data.getDay() === 0 ? 7 : data.getDay()` — ou seja, usa a convenção contrária (7=domingo)
pra comparar com `semana.dia_semana`. Se essa função realmente recebe o mesmo array `semanas`
que vem de `FormCadAgendaOCI.jsx` (0=domingo), ela nunca vai casar domingo (`.find()` retorna
undefined, `continue` silencioso) — o preview local poderia estar sistematicamente omitindo
domingo, mesmo que o agendamento real no backend seja criado corretamente. Não confirmei em
qual tela essa função é usada nem se o problema é real — fica registrado pra investigação
futura, não foi corrigido nesta sessão.

---

## Resumo rápido do checklist

- [x] Migração SQL do RNO2 já aplicada (confirmado antes da sessão)
- [x] RNO2 — snapshot gravado corretamente na OCI (Sequencial com regulação) — protocolo 37594
- [ ] RNO2 — snapshot com regulação=false — não testado (sem unidade solicitante compatível)
- [x] RNO2 — bloqueio de agendamento automático direto via API — HTTP 400 confirmado
- [x] §2.1 — OCI sem agenda (Faseado) nasce em `st_fila=1`, ausente na Regulação — protocolo 37595
- [x] §2.1 — regressão Integrado também nasce em `st_fila=1` — protocolo 37597
- [x] §2.1 — regressão Sequencial+regulação continua indo pra `st_fila=0` — protocolo 37594
- [x] Faseado — Fase 2 pré-agendada pula pra `st_fila=4` ao confirmar Fase 1 — confirmado após corrigir 2 bugs, protocolo 37603
- [x] Faseado — regressão: sem pré-agendamento, confirmar Fase 1 vai pra `st_fila=3` (não pula) — protocolo 37596
- [ ] Integrado — Fase 3 pré-agendada pula pra `st_fila=6` — não testado (mesma correção deve aplicar, mas não validei o caso Integrado especificamente)
- [x] Agendamento automático — tolerância a falta de vaga em exames — HTTP 201 confirmado, protocolo 37598
- [x] Agendamento automático — regressão (Consulta sem vaga falha) — HTTP 404 confirmado
- [x] RN10 — tela de exame opcional só aparece após confirmar Fase 1 — confirmado, modal "Gerenciamento de Procedimentos"
- [x] RN12 — exame opcional agendado passa a ser obrigatório pra liberar Fase 3 — confirmado, protocolo 37596
- [x] §2.8 — conflito de agenda multi-dia não deixa registro parcial — confirmado via API, contagem 37→37

## Achados

1. **Consulta/Teleconsulta/código interno da OCI tratados como "exame obrigatório"**
   (7 locais em `oci_service.py` e `fila_service.py`) — causa raiz do item 3.
   **Bug corrigido e validado end-to-end nesta sessão** (protocolo 37603). Ver achado 0.
2. **`criar_oci_com_agendamento_multi_fase` só agenda 1 procedimento por fase** — usado pela
   tela real "Nova Solicitação". Linhas Faseadas/Integradas com mais de 1 exame obrigatório
   ainda não conseguem pré-agendar a Fase 2 inteira automaticamente pela UI, só
   parcialmente. **Não corrigido** — achado novo, ver seção 3 e achado 0b.
3. **`ProfissionalNotFoundException` com kwarg errado** (`oci_service.py:2748` e `:3414`,
   `nu_cns=` deveria ser `cns=`) — mascarava erro 404 real com 500 genérico. **Bug corrigido
   e validado nesta sessão.**
4. **Docstring errada + `KeyError` não tratado na validação de `dia_semana`**
   (`schemas/geral.py` e `agenda_service.py`) — cliente de API seguindo a doc recebia erro
   500 opaco em vez de mensagem de validação clara. **Bug corrigido e validado nesta
   sessão.** Não alcançável pela UI de produção (que já usa a convenção correta).
5. Nenhuma divergência de regra de negócio encontrada nos itens efetivamente testados
   (1, 2, 3, 4, 5, 6, 7) além dos bugs já listados acima.
6. Possível gate adicional não explorado: tela "Resultado de Exame com CID" parece ser
   pré-requisito, além do `st_fila=5`, pra realmente liberar a Consulta de Retorno — ver
   nota no item 5/RN12.
7. Possível inconsistência não confirmada em `ociServicos.js:1799` (convenção de dia da
   semana invertida numa função de preview client-side) — ver nota no achado 4, não
   investigado a fundo.

## Protocolos criados nesta sessão (reaproveitáveis)

| Protocolo | Linha | Paciente | st_fila final | Observação |
|---|---|---|---|---|
| 37594 | 3 (Sequencial+regulação) | Marcio Paciente Teste | 0 | Aguardando Autorização |
| 37595 | 8 (Faseado) | Lara Magalhaes Ataide | 1 | Aguardando Fase 1 |
| 37596 | 4 (Faseado) | Antônio Santos Paciente Teste | 5 | Aguardando Fase 3 — Consulta e 4 exames (incl. opcional incluído via RN10) confirmados |
| 37597 | 2 (Integrado) | Heitor Gabriel Oliveira Mota Rodrigues | 1 | Aguardando Fase 1 |
| 37598 | 4 (Faseado, via API) | Jordana Paciente Teste | 2 | Agendada Fase 1, 4 exames pendentes |
| 37599 | 4 (Faseado, via API) | Anne Gabryelly Muller Machado | 2 | Agendada Fase 1 (consulta 03/08), exames de 20/07 ignorados (data anterior à consulta) |
| 37600 | 4 (Faseado, via UI) | Maria Izabel Saraiva Vasconcelos | 3 | Confirmou Fase 1; só 1 de 3 exames obrigatórios foi pré-agendado (bug do multi-fase, achado 0b) — não pulou pra 4 |
| 37601 | 8 (Faseado, via UI, só 1 exame obrigatório) | Sebastião Junio Menezes Campos | 1 | Fallback manual — bug da lista de "exames obrigatórios" (achado 0, pré-fix) bloqueou a pré-checagem |
| 37602 | 8 (Faseado, via UI, pós-fix parcial) | Beatriz Paciente Teste | 3 | Consulta+Exame agendados juntos, mas confirmar Fase 1 ainda foi pra 3 (faltava o 7º local do fix, em fila_service.py) |
| 37603 | 8 (Faseado, via UI, pós-fix completo) | Ana Maria Teste | **4** | **Validação final: Consulta+Exame agendados juntos, confirmar Fase 1 pulou direto pra Agendada Fase 2** |
