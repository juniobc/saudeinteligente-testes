# Memória de Sessões — Testes OCI Guiados por LLM

> Registro entre sessões para os testes em `guardian/llm-tests/`. Diferente de
> `guardian/agent/memory.md` (memória oficial do Guardian/Playwright), este
> arquivo é específico do piloto de testes via browser real guiados por LLM.
> **Leia este arquivo inteiro antes de iniciar uma nova sessão de teste.**

---

## Ambiente

- SPA: `saudeinteligente-spa/` — `npm run dev:oci` (porta 5173, modo OCI aponta
  para API em `http://localhost:8002`).
- API: `saudeinteligente-api/` — venv já existe em `api-env/`. Subir com
  `./api-env/Scripts/python.exe -m uvicorn main:app --reload --port 8002`.
  Demora ~2-3 min para carregar (dependências pesadas). Aguarde
  "Application startup complete." no log antes de testar.
- **`uvicorn --reload` pode perder edições feitas em sequência rápida** (viu-se
  2 edições no mesmo arquivo gerarem só 1 reload). Se corrigir um bug e o
  comportamento não mudar após o reload automático, mate o processo
  (`taskkill //F //PID <pid>`) e suba de novo manualmente antes de concluir
  que o fix não funcionou.
- **Reiniciar a API derruba a sessão da SPA** (refresh token falha) — espere
  logout automático e faça login de novo.
- Consultas ao banco: **somente via `guardian/tools/db-query.js`** (somente
  leitura). Nunca criar scripts de consulta dentro de `saudeinteligente-api/`
  — scripts temporários vão no scratchpad da sessão, nunca no repositório do
  projeto-alvo.

## Credenciais e tenants

- `guardian/.env` tem credenciais funcionais para `br_distrito_federal`. O
  **mesmo usuário/senha também funciona no tenant Amapá** (`br_amapa`) —
  confirmado nesta sessão, apesar de uma tentativa antiga (abr/2026) ter
  registrado erro 500 nesse tenant (pode ter sido outro bug de então, já não
  reproduz).
- Amapá tem massa de dados real nos 3 modos de progressão (16-17 linhas
  Integrado, 13-16 Sequencial, 2-4 Faseado, variando por tenant) — melhor
  ambiente para testar `oci-fluxos-progressao.md` do que Distrito Federal.

## Achado crítico — seleção de unidade de trabalho ativa

**Sintoma**: campo "Unidade Responsável" do formulário de Nova Solicitação
aparece vazio ("Selecione") mesmo com a Linha de Cuidado já escolhida, mesmo o
usuário tendo lotação em unidades com `st_solicitante=true`.

**Causa raiz** (não é bug, é fluxo esperado): esse campo (`CadOCI.jsx`) fica
`isDisabled` para usuários sem `st_administrador`/`st_regulador`, e só é
populado pela **unidade selecionada no header** (`lotacaoObj`), não pela lista
inteira de lotações do usuário. Quando o usuário tem múltiplas lotações
(comum em tenants com regulação estadual, ex. Amapá), o sistema não escolhe
uma automaticamente — os combos do header ficam em "Selecione um município".

**Correção prática**: antes de abrir "Solicitar OCI", selecione manualmente no
header: combo Município (ex: "Macapá (3 unidades)") → combo Unidade (aparece
depois, ex: "3523845 - ADACHI OFTALMOLOGIA"). Depois disso "Unidade
Responsável" populate sozinho ao abrir o formulário.

## Rotas e navegação confirmadas (Gestão das Filas de Espera)

| Menu | Rota | O que faz |
|---|---|---|
| Regulação | `/oci/dashboard/med_autorizador` | Lista solicitações `st_fila=0` com `st_exige_regulacao=true`; botão de ícone `ri-menu-search-line` abre modal "Análise Médico Autorizador" com ações Autorizar/Devolver/Cancelar |
| Agendamento da Lista de Espera | `/oci/dashboard/lista_espera` | 3 abas por fase (Consulta Especializada=`st_fila:1`, Exames de Apoio Diagnóstico=`st_fila:3`, Consulta de Retorno=`st_fila:5`). Campo "Nº Autorização" busca por `nr_protocolo`. Botão de ação com `aria-label="Agendamento"` abre modal de agendamento (unidade/data/hora) |
| Confirmação de Atendimento | `/oci/dashboard/confirm_comparecimento` | Busca por "ID Solicitação" (`nr_protocolo`). Botão "Confirmar presença..." abre modal pedindo a **chave de verificação**; valida corretamente (chave errada → toast de erro claro) |
| Configuração de OCIs | `/oci/dashboard/config_oci` | Lista por Grupo/Especialidade, expansível por linha — mostra `Exige Regulação` por linha e "Unidades Habilitadas" (executantes). Bom para confirmar config antes de testar, sem precisar só do banco |

## Ciclo de vida confirmado (`oci_tb_fila_espera_oci.st_fila`)

`0=Aguardando Autorização → 1=Aguardando Fase1 → 2=Agendada Fase1 →
(confirmar comparecimento) → 3=Aguardando Fase2 → 4=Agendada Fase2 → ... →
5=Aguardando Fase3 → 6=Agendada Fase3 → 7=Finalizada`. `8=Cancelada`,
`9=Devolvida para Solicitante`. Validado ao vivo: criar solicitação → 0;
autorizar na Regulação → 1; (bug de agendamento impediu ir além nesta sessão,
ver abaixo).

## Mudança de backend pendente de migração (2026-07-09, RNO2)

O Spark implementou snapshot de `st_exige_regulacao` na própria OCI (não só na
linha de cuidado): `oci_tb_fila_espera_oci` ganhou uma coluna nova
`st_exige_regulacao`, gravada no momento da criação (`create_oci` e
`criar_oci_com_agendamento_automatico`, `microservicoOCI/service/oci_service.py`).
**Antes de testar qualquer fluxo de criação de OCI**, confirme no banco se a
migração `microservicoOCI/migrations/2026-07-09_oci_st_exige_regulacao_snapshot.sql`
já foi rodada no tenant em uso (`SELECT column_name FROM information_schema.columns
WHERE table_name='oci_tb_fila_espera_oci' AND column_name='st_exige_regulacao'`) —
se não, criar OCI vai quebrar com erro de coluna inexistente (não é bug de
regra de negócio, é migração pendente).

Também nesta mudança: `criar_oci_com_agendamento_automatico` agora **recusa**
(erro de validação) tentativas de agendamento automático direto quando a linha
é Sequencial (`id_progressao=2`) e `st_exige_regulacao=true` — antes isso não
era validado no backend, só no frontend. Se um teste tentar forçar esse
caminho via chamada direta de API, esperar erro, não sucesso.

Confirmado com o desenvolvedor (não é bug, é regra de negócio): **Integrado e
Faseado nunca passam por regulação**, mesmo que `st_exige_regulacao` esteja
marcado na linha — só Sequencial usa o flag. Já refletido em
`oci-fluxos-progressao.md`.

## Bug encontrado e corrigido nesta sessão (2026-07-08)

`saudeinteligente-api/microservicoOCI/service/agenda_service.py`, função
`get_unidades_com_vaga` (~linha 1281): `print()` de debug com caracteres
especiais (emoji, depois até acentos na mesma combinação) causava
`UnicodeEncodeError` no Windows (console cp1252), retornando 500 na rota
`GET /oci/unidades_com_vaga/{cd_tp_agenda}/{co_procedimento}` — quebrava
**qualquer** tentativa de abrir o modal de Agendamento quando o procedimento
não tinha agenda futura cadastrada (não específico do nosso paciente de
teste). **Corrigido** trocando por texto ASCII puro; confirmado 500→200 no
log do backend após reiniciar o processo manualmente.

## Bug corrigido em 2026-07-09 — Faseado/Integrado perdiam pré-agendamento ao confirmar Fase 1

Causa raiz do achado §2.8 do relatório de conformidade: `fila_service.py::confirmar_comparecimento`
sempre transicionava para `AGUARDANDO_FASE_2`/`AGUARDANDO_FASE_3` ao confirmar a etapa
anterior, mesmo quando a próxima etapa já tinha agenda reservada em `oci_tb_agenda`
(caso de Faseado/Integrado, agendados juntos na criação). Corrigido para checar
pré-agendamento e pular direto para `AGENDADA_FASE_2`/`AGENDADA_FASE_3` quando
aplicável. Ver `oci-fluxos-progressao.md` para o roteiro de reteste de RN08.

## Bug corrigido em 2026-07-09 — agendamento automático era tudo-ou-nada

`oci_service.py::criar_oci_com_agendamento_automatico` (endpoint
`/oci/oci-com-agendamento-automatico`) lançava exceção e desfazia a criação
inteira da OCI se faltasse vaga em **qualquer** exame (Fase 2) ou no Retorno
(Fase 3, Integrado) — mesmo que a Primeira Consulta (Fase 1) tivesse vaga.
Corrigido: a Consulta continua obrigatória (sem vaga = não cria a OCI), mas
exames/retorno sem vaga agora ficam pendentes de agendamento manual em vez de
bloquear tudo. Regra importante preservada: o Retorno **nunca** é agendado
automaticamente se algum exame obrigatório ainda estiver pendente de vaga
(mesmo que haja vaga de Retorno disponível) — precisa ser sempre posterior aos
exames. A resposta do endpoint agora inclui `exames_pendentes` e
`retorno_pendente` no payload, e uma `mensagem` explicando o que ficou
pendente. **Nota**: a tela de Nova Solicitação do módulo OCI (`CadOCI.jsx`) na
prática usa outro endpoint (`criar_oci_com_agendamento_multi_fase`, via o
modal `AgendamentoMultiFaseModal`, que já só envia as fases com vaga
disponível) — `criar_oci_com_agendamento_automatico` é chamado só via API
direta ou por outros fluxos; ainda assim vale testar via API se for reavaliar
esse comportamento.

## Regra confirmada em 2026-07-09 — exame agendado passa a ser obrigatório (RN12)

Confirmado pelo desenvolvedor: um exame que foi **colocado na lista para ser
agendado** (existe registro em `oci_tb_agenda`) passa a ser obrigatório para
liberar a Fase 3 (Retorno), **independente** do `st_opcional` original da
linha de cuidado. Corrigido em `fila_service.py` — a query que libera a Fase 3
(`query_exames_obrigatorios`, dentro de `confirmar_comparecimento`) não filtra
mais por `st_opcional = false`, usa só "tem agenda" como critério (o
`INNER JOIN` com `oci_tb_agenda` já garante isso). Relevante para retestar
RN10-12 quando a tela de inclusão de exame opcional for localizada/testada —
uma vez incluído e agendado, o exame opcional deve bloquear o Retorno igual a
um obrigatório, e isso já está garantido no backend.

## Bug corrigido em 2026-07-09 — toda OCI sem agenda caía na fila de Regulação (§2.1)

Causa raiz: `create_oci` (`oci_service.py`, chamado por `POST /oci`, usado no fluxo
manual/fallback quando não há agenda disponível na criação) sempre gravava
`st_fila=0` (Aguardando Autorização) — inclusive para Integrado/Faseado/Sequencial-
sem-regulação, que nunca deveriam passar pela tela do regulador. Não existe status
novo no banco (`oci_tb_status_fila` continua os mesmos 10 códigos:
0=Aguardando Autorização, 1=Aguardando Fase 1, 2=Agendada Fase 1, 3=Aguardando Fase
2, 4=Agendada Fase 2, 5=Aguardando Fase 3, 6=Agendada Fase 3, 7=Finalizada,
8=Cancelada, 9=Devolvida) — a correção só passou a usar os códigos certos: `st_fila=0`
só quando Sequencial + `st_exige_regulacao=true`; caso contrário nasce em
`st_fila=1` (Aguardando Fase 1), que é a fila correta de "esperando ser agendado" e
não aparece mais pra o regulador.

## Caso de teste reaproveitável (Amapá)

**Protocolo 37590** — linha "AVALIACAO DE ESTRABISMO" (id=3, Sequencial,
`st_exige_regulacao=true`), unidade "ADACHI OFTALMOLOGIA" (CNES 3523845),
paciente "DEBORA PACIENTE MENOR TESTE", profissional "HILKIAS ADACHI ARAUJO".
Estado no fim desta sessão: `st_fila=1` (Aguardando Fase 1, já autorizado pela
Regulação). Pode ser reaproveitado para continuar o teste do bloqueio
Sequencial (agendar Fase 1 → confirmar comparecimento → checar liberação da
Fase 2) sem precisar recriar do zero — mas **confira o `st_fila` atual no
banco antes de assumir onde parou**, pode ter avançado em sessões futuras.

## Pendências (não testado ainda)

- Confirmar liberação real da Fase 2 após confirmar comparecimento da Fase 1
  (ficou bloqueado pelo bug 500, já corrigido — falta reexecutar).
- Modo Integrado do zero.
- Modo Faseado do zero.
- Bloqueio por cota zerada (`qt_disponivel = 0`).
- Bloqueio Fase 2→Fase 3 no Sequencial.
- Tela "Resultado de Exame com CID" (mencionada no modal de confirmação de
  comparecimento de exames: "sem isso a OCI permanece em Fase 2 e não avança
  pra Consulta de Retorno") — não localizada/explorada ainda. Pode ser um
  gate adicional além do `st_fila=5` pra realmente liberar a Fase 3.
- ~~Faseado/Integrado com Fase 2 pré-agendada pulando pra `st_fila=4`~~ —
  **RESOLVIDO em 2026-07-09.** Eram 2 bugs reais (não falta de dado de
  teste): (1) `criar_oci_com_agendamento_multi_fase` só agenda 1 procedimento
  por fase — **ainda não corrigido**, continua limitando linhas com >1 exame
  obrigatório (contornado nos testes usando uma linha com só 1 exame); (2) a
  query de "procedimentos obrigatórios (exames)", espalhada em 7 lugares
  (`oci_service.py` x6, `fila_service.py` x1), incluía Retorno/Teleconsulta/
  código interno da OCI como se fossem exame — **corrigida e validada
  end-to-end** (protocolo 37603, `st_fila` pulou pra 4 corretamente). Ver
  seção 3 e "Achados adicionais" do relatório de retest pra detalhes
  completos e todos os protocolos de teste (37599-37603).
- ~~Integrado, Fase 3 pré-agendada pulando pra `st_fila=6`~~ — **TESTADO e
  CORRIGIDO em 2026-07-09.** Não era só "faltava testar" — era um bug real:
  a correção anterior (checar se o Retorno já tem agenda antes de decidir
  entre Agendada/Aguardando Fase 3) só tinha sido aplicada na função de
  confirmação de **item único** (`confirmar_comparecimento`), não na de
  **lote** (`confirmar_comparecimento_batch`) — que é a que a tela realmente
  usa quando os exames aparecem agrupados na mesma visita (o caso normal).
  Corrigido replicando a mesma checagem. Validado end-to-end com protocolo
  limpo 37605 (linha 6, Integrado): `st_fila` foi de 4 direto pra 6 ao
  confirmar os exames em lote. Ver
  `guardian/reports/relatorio-conformidade-ate-oci-20260709-integrado.md`.
- `criar_oci_com_agendamento_multi_fase` só agenda 1 procedimento por fase
  (não itera pelos exames obrigatórios da linha) — bug real, documentado,
  **não corrigido**. Ver achado 0b do relatório de retest.

## Sessão de retest 2026-07-09 (correções RNO2/§2.1/agendamento automático)

Relatório completo: `guardian/reports/relatorio-conformidade-ate-oci-20260709-retest.md`.
Resumo: **todos os 7 itens do briefing confirmados PASSOU** com evidência de banco + UI/API
— RNO2 (snapshot + bloqueio API), §2.1 (OCI sem agenda não regula mais), item 3
(pré-agendamento de fases), agendamento automático tolerante a falta de vaga, RN10, RN12 e
§2.8. O item 3 inicialmente parecia bloqueado por falta de dado de teste, mas era na
verdade causado por um bug real (Consulta/Retorno tratados como "exame") que foi
encontrado, corrigido e validado end-to-end nesta mesma sessão.

**Bug novo encontrado e CORRIGIDO nesta sessão:** `ProfissionalNotFoundException` era
instanciada com kwarg errado (`nu_cns=` em vez de `cns=`) em
`saudeinteligente-api/microservicoOCI/service/oci_service.py` linhas 2748 e 3414 — mascarava
o erro 404 real ("profissional não encontrado") com um 500 genérico de `TypeError`. Corrigido
(troca do nome do kwarg) e validado após restart manual da API (o `--reload` automático do
uvicorn ficou preso em "Reloading..." sem nunca aplicar a mudança — precisou `preview_stop` +
`preview_start` de novo, reforça a lição já registrada de que o reload automático é flaky).

**Segundo bug encontrado e CORRIGIDO nesta sessão:** docstring de `SemanaItem.dia_semana`
(`schemas/geral.py`) dizia "1=segunda, 7=domingo", mas a validação real em
`agenda_service.py::create_agenda` (função `python_to_js_weekday`) usa a convenção
"0=domingo...6=sábado". Um cliente de API seguindo a doc (mandando `dia_semana=7` pra
domingo) disparava um `KeyError` não tratado ao montar a mensagem de erro de "dias inválidos"
— vazava como `{"detail": "7"}`, um 400 completamente opaco. Corrigido: docstring atualizada
+ `dias_nomes[d]` trocado por `dias_nomes.get(d, f'dia_semana={d}')`. **Não é bug alcançável
pela UI real** — `FormCadAgendaOCI.jsx` (`DIAS_SEMANA_CADASTRO`) já usa a convenção correta
(0=domingo). Só afeta quem chama a API diretamente (Postman, integração, testes). Possível
follow-up não confirmado: `ociServicos.js:1799` (`gerarAgendamentosVisualizacao`, preview
client-side) usa a convenção contrária (7=domingo) — pode estar omitindo domingo de algum
preview local silenciosamente; não investigado se essa função é realmente usada com o array
`semanas` do form real.

**§2.8 CONFIRMADO PASSOU nesta sessão** (não precisou trocar de município — achei um
conflito real na própria unidade ADACHI OFTALMOLOGIA/3523845, profissional HILKIAS ADACHI
ARAUJO, agenda existente em 10/07/2026 07:00). Testado via `POST /oci/agendas` direto
(a UI "Cadastrar Nova Agenda" tem um seletor de intervalo de datas — `react-date-range` —
extremamente resistente a automação via `preview_eval`/`dispatchEvent`; ver lição abaixo).
Submeti agenda de 5 dias (09 a 13/07) cobrindo o conflito → HTTP 409 com mensagem clara de
conflito → contagem de registros antes/depois idêntica (37/37). Transação atômica confirmada,
bug original do §2.8 não reproduz.

**Payload de `POST /oci/agendas`** (útil pra próximas sessões, schema `AgendaCreateRequest`):
`duracao` (min), `vagas_disponiveis`, `tipo_atendimento_id` (1=Primeira Consulta, 3=Retorno,
2=Exames), `grupo_id` (= `co_grupo` da linha de cuidado em `oci_tb_linha_cuidado`),
`id_linha_cuidado`, `nu_cns` (do profissional), `co_cnes_executante`, `datas: {start, end}`
(YYYY-MM-DD), `semanas: [{dia_semana, hora_inicio, hora_fim, vagas}]` (dia_semana:
0=domingo...6=sábado, **não** a doc antiga), `dias: []` (aceita vazio mesmo sendo `...`
required no schema), `co_procd_medc: [...]`.

**RN10/RN12 confirmados PASSOU** (mesmo relatório, seções 5 e 6), reaproveitando o protocolo
37596: ao confirmar comparecimento da Fase 1, abre automaticamente o modal "Gerenciamento de
Procedimentos" com ação "Incluir" só no procedimento com `st_opcional=true` na linha. Depois
de incluído e agendado (tela "Agendamento da Lista de Espera" → Exames de Apoio Diagnóstico),
a tela "Confirmação de Comparecimento" → aba Exames confirma **todos os procedimentos daquele
agendamento/visita numa única ação** (uma chave, não por exame individual) — então não dá pra
isolar via UI um cenário "só os obrigatórios confirmados, o opcional-incluído pendente"; a
confirmação em lote levou `st_fila` de 4 direto pra 5 (Aguardando Fase 3) com os 4 exames +
consulta todos com `st_comparecimento=true` de uma vez.

**Payload correto para `POST /oci/oci-com-agendamento-automatico`** (útil para próximas
sessões que precisem testar via API): precisa do header `X-Tenant-ID: <tenant_schema>`
(ex. `br_amapa`) além dos cookies de sessão já autenticados no browser. Campos:
`id_linha_cuidado` (int), `co_cnes_solicitante` (string, não int — dá erro de tipo no
Postgres se mandar int), `co_pac` (int), `nu_cns_solicitante` (string — **não** `co_profs`,
esse nome de campo não existe no payload esperado), `co_cid` (string), `ds_justificativa`.
Dá pra montar essa chamada direto do console do browser já logado via
`fetch(..., {credentials:'include', headers:{'X-Tenant-ID':'br_amapa'}})` sem precisar
extrair token manualmente.

**Item 3 (pré-agendamento de Fase 1+2) RESOLVIDO nesta sessão — causa raiz e correção
completa.** Não era falta de dado de teste. Causa raiz esclarecida pelo desenvolvedor:
várias queries em `oci_tb_procedimentos_linha` que deveriam listar só os exames
obrigatórios de uma linha (`st_opcional = false`) tratavam Consulta, Teleconsulta e o
código interno da própria OCI como se fossem exame — porque não excluíam explicitamente
esses códigos. O desenvolvedor já tinha corrigido essa mesma lógica uma vez, em
`listar_procedimentos_linha_cuidado` (usada pela tela "Cadastrar Nova Agenda", endpoint
`GET /oci/linhas/{id}/procedimentos?apenas_exames=true`), mas a correção nunca foi
replicada em outros lugares que faziam a mesma pergunta de formas ligeiramente diferentes.

**Filtro correto** (já existente em `oci_service.py::listar_procedimentos_linha_cuidado`,
replicado em 2026-07-09 pra mais 7 lugares): excluir `co_procd_medc IN ('0301010072',
'0301010307')` (consulta e teleconsulta) e `co_procd_medc LIKE '09%'` (grupo SIGTAP do
código interno da própria OCI) de qualquer query que pretenda listar "exames obrigatórios".
**Não usar `tp_proc_linha = 2`** como critério de exclusão — não cobre teleconsulta nem é
o mecanismo que o dev usa oficialmente.

**Locais corrigidos em `saudeinteligente-api/microservicoOCI/service/oci_service.py`**:
`verificar_agenda_cadastrada`, `get_config_agendamento_linha`,
`criar_oci_com_agendamento_automatico` (query_exames), `get_executantes_com_agenda_fase`,
`get_horarios_disponiveis_fase` (2 ocorrências). E em
`saudeinteligente-api/microservicoOCI/service/fila_service.py`: `confirmar_comparecimento`
(query `query_pendentes_fase2`, ~linha 1379) — esse último foi o mais difícil de achar,
porque só aparece quando se testa o fluxo *completo* (agendar + confirmar comparecimento),
não só a criação da OCI.

**Bug relacionado, NÃO corrigido:** `criar_oci_com_agendamento_multi_fase` (usado pela tela
real "Nova Solicitação") busca só a primeira vaga disponível por fase (`horarios[0]`) e
nunca itera pelos demais procedimentos obrigatórios — então uma linha com mais de 1 exame
obrigatório nunca consegue pré-agendar a Fase 2 inteira automaticamente pela UI. Contornei
pros testes usando a linha 8 (só 1 exame obrigatório: `0417010060`, "SEDACAO"). Precisa de
uma sessão de dev dedicada pra reescrever essa função corretamente.

**Protocolo de teste final validado:** 37603 (linha 8, paciente "Ana Maria Teste") — criado
pela tela, modal "Agendamento de Fases" agendou Consulta+Exame juntos (`st_fila=2`),
confirmar comparecimento da Fase 1 pela tela pulou direto pra `st_fila=4` (Agendada Fase 2).

## Sessão de retest 2026-07-09 (parte 2) — Integrado, Fase 3 pré-agendada

Retomando o checklist pendente do briefing anterior, testei especificamente o caso
**Integrado** (que o retest anterior não cobriu — só validou Faseado). Achei e corrigi um
bug novo: `confirmar_comparecimento_batch` (`fila_service.py`) não checava se o Retorno já
tinha agenda antes de decidir o próximo `st_fila`, ao contrário da função irmã de item único.
Como a tela sempre usa a versão em lote quando os exames aparecem agrupados na mesma visita
(o caso normal, não uma exceção), esse era o caminho real percorrido por qualquer teste de
Integrado com todas as fases pré-agendadas — por isso nunca tinha sido pego antes. Corrigido
e validado com protocolo limpo (37605). Relatório completo:
`guardian/reports/relatorio-conformidade-ate-oci-20260709-integrado.md`.

**Linha reaproveitável para testes futuros de Integrado em Amapá:** id 6 ("AVALIACAO INICIAL
PARA ONCOLOGIA OFTALMOLOGICA"), unidade 3523845 (ADACHI OFTALMOLOGIA), profissional HILKIAS
ADACHI ARAUJO (CNS 706402609034687). Tem Consulta (`0905010051`), 4 exames obrigatórios
(`0211060259`, `0205020089`, `0211060127`, `0211060020`) e Retorno (agenda criada com
`co_procd_medc` genérico de consulta/teleconsulta, mas o sistema normaliza para o código
principal da linha — ver nota abaixo). **Atenção:** como todas as linhas Integradas de
Oftalmologia em Amapá têm mais de 1 exame obrigatório, a tela real "Nova Solicitação" não
consegue pré-agendar todas as fases (achado 0b, `criar_oci_com_agendamento_multi_fase`) — para
testar cenários que dependem de todas as fases pré-agendadas, use
`POST /oci/oci-com-agendamento-automatico` via API direta (documentado no retest anterior).

**Nota sobre agenda de Retorno via `POST /oci/agendas`:** ao criar a agenda de Retorno
passando `co_procd_medc: ['0301010072']` (código genérico de consulta) com
`tipo_atendimento_id: 3`, o registro final em `oci_tb_agenda` aparece com `co_procd_medc`
igual ao **procedimento principal da linha** (ex. `0905010051`), não o código que foi
enviado — a busca de vaga em `_buscar_primeira_vaga` casa por `co_procd_medc` OU por um
vínculo em `oci_agenda_procedimento`, então funciona de qualquer forma; só não espere ver o
código exato que você enviou refletido na coluna `co_procd_medc` da agenda de Retorno.

## RNO2 — como testar regulação=false quando a unidade só atende 1 especialidade

**Sintoma:** com a unidade de trabalho ativa em Oftalmologia (ex. ADACHI OFTALMOLOGIA,
Amapá), linhas Sequenciais sem regulação de outras especialidades (Câncer de Mama/Próstata/
Colo do Útero/Gástrico/Colorretal, GIN2-I/II) não aparecem com "Unidade Responsável"
preenchida no formulário — parecia falta de dado de teste no tenant.

**Solução:** trocar o **município** no combo do header (não só a unidade) — em Amapá,
municípios menores (ex. Cutias, Pedra Branca do Amaparí) têm UBS genéricas de atenção básica
que atendem qualquer especialidade, ao contrário das unidades especializadas de Macapá.
Unidade reaproveitável: **CNES 2021021, "PM CUT UBS AMERICO COELHO PEREIRA"** (município
Cutias, código 160021). Confirmado funcionando pra linha 9 (Câncer de Mama).

**Limitação de automação encontrada:** o campo "Cidadão Usuário" (busca de paciente,
`react-select` assíncrono, endpoint `GET /oci/pacientes/autocomplete?cns=...`) não respondeu
a `preview_fill` nem a técnicas mais agressivas (native setter + `dispatchEvent('input')`,
digitação char-a-char simulada) — sempre ficou em "Nenhuma opção encontrada", mesmo com a
mesma chamada de API funcionando perfeitamente via `fetch` direto no console. Não vale a pena
insistir (mesma lição do datepicker `react-date-range` já documentada abaixo) — usar a API
diretamente (`POST /oci/oci`, multipart com campo `oci` = JSON stringificado, é o endpoint de
criação manual/fallback; rota real é `/oci/oci` por causa do prefixo duplicado do router, não
só `/oci`) pra este trecho específico do fluxo.

## Sessão de retest 2026-07-09 (parte 3) — RNO2 regulação=false

Retomando o último item pendente do checklist, encontrei e usei o município de Cutias (ver
seção acima) pra testar uma linha Sequencial sem regulação. Protocolo 37606 (linha 9, Câncer
de Mama, unidade 2021021): confirmado `st_exige_regulacao=false` gravado corretamente na OCI
e `st_fila=1` (não 0) — igual ao mecanismo já validado pro caso `true`. Relatório atualizado:
`guardian/reports/relatorio-conformidade-ate-oci-20260709-integrado.md`.

## Sessão 2026-07-09 (parte 4) — Investigação e fix de `ociServicos.js:1799` (preview de agenda)

Achado registrado desde o retest anterior (não confirmado até então): `gerarAgendamentosVisualizacao`
(preview visual da tela "Cadastrar Nova Agenda") usava a convenção antiga de dia da semana
(7=domingo) enquanto o form real e o backend usam 0=domingo. Confirmado por leitura de código
que é **bug só de exibição** — o backend nunca lê o campo `dias` do payload, recalcula tudo
sozinho a partir de `semanas` (correto). Corrigido em `ociServicos.js:1799` e sua cópia em
`sisregaServicos.js:1800` (mesma função duplicada nos dois módulos). Validado isoladamente
via `javascript_tool` no console (domingo `getDay()=0` agora casa com `dia_semana=0`) — não
validado via fluxo completo de UI porque a sessão do browser perdeu o login entre as partes
do teste (trocou de ferramenta de preview no meio da sessão). Ver
`guardian/reports/relatorio-conformidade-ate-oci-20260709-integrado.md`.

## Lições sobre a ferramenta de browser (`preview_*`)

- `preview_network` sem filtro estoura limite de tokens rápido (muitos
  assets/imagens) — prefira `filter="failed"` ou leia o arquivo salvo com
  `grep` por padrão de URL específico.
- Cliques em seletores genéricos (`button:not([disabled])`, `.Select2__option`
  sem escopo) pegam o elemento errado quando há duplicatas na tela (ex.:
  campo atrás de um modal). Sempre escopar a `[role="dialog"]`/`.modal` ativo
  e usar `data-guardian-target` temporário via `preview_eval` para marcar o
  elemento exato antes de clicar.
- `performance.getEntriesByType('resource')` é útil para achar qual endpoint
  uma ação específica chamou, mas o buffer é limitado — some com o tempo,
  prefira checar logo após a ação.
- **Opções de dropdown React-Select**: nunca faça busca genérica por texto
  (`Array.from(document.querySelectorAll('*')).find(e => e.textContent.includes(...))`)
  para achar a opção a clicar — pode casar com outro elemento da página que
  contém o mesmo texto (ex. um CNS repetido num card de "Solicitações
  Recentes"), fazendo o clique falhar silenciosamente sem erro. Prefira achar
  o ID exato da option renderizada (`[id^="react-select-N-option"]`) e clicar
  nele via `preview_click` com esse seletor.
- Depois de digitar num campo Select2/react-select com `preview_fill`, o campo
  às vezes é um `<select>` nativo escondido (não um combobox custom) — nesse
  caso `ArrowDown` + `Enter` via `KeyboardEvent` no input funciona melhor que
  tentar clicar na opção visualmente.
- Um modal de confirmação "Alterações não salvas" pode aparecer inesperadamente
  no meio do preenchimento de um formulário grande (gatilho não totalmente
  claro, parece ligado a mousedown/mouseup sintéticos disparados em sequência
  rápida demais) — e ele **reseta campos já preenchidos** (Profissional
  Solicitante, CID10) mesmo clicando "Continuar editando". Sempre tire um
  screenshot depois de preencher todos os campos de um formulário grande e
  antes de clicar Salvar, pra confirmar que nada foi perdido.
- Menus laterais em flyout (ex. "Gestão das Filas de Espera") só renderizam o
  submenu correto depois de um clique único e limpo no ícone certo — cliques
  repetidos/programáticos em sequência rápida deixam o tooltip/painel preso
  mostrando o grupo errado. Prefira `preview_click` num seletor
  `.main-menu-container > div:nth-child(N) span` isolado, um de cada vez, com
  screenshot de confirmação antes do próximo passo.
- Para chamadas de API diretas do console do browser (sessão já logada), é
  preciso descobrir o header custom de tenant (`X-Tenant-ID` neste projeto,
  ver `saudeinteligente-spa/src/services/api.js`) — sem ele a API responde
  404 "Municipio ainda não está credenciado".
- **Seletor de intervalo de datas `react-date-range`** (usado em "Cadastrar Nova
  Agenda"): extremamente resistente a `preview_eval`/`dispatchEvent` — cliques
  simples (`.click()`) em dias do calendário não confiavelmente setam o range
  (ora não faz nada, ora reseta pra um único dia, ora "pula" pra um range
  totalmente diferente do clicado). Tentativas com mousedown+mouseup+mousemove
  sintéticos também falharam de forma inconsistente. **Não vale a pena
  insistir** — se precisar testar algo que dependa desse datepicker
  especificamente, prefira chamar a API por trás da tela diretamente
  (`POST /oci/agendas`, ver payload documentado acima) em vez de tentar
  reproduzir via clique na UI.
- Quando `preview_stop` + `preview_start` são necessários pra pegar uma
  correção de código que o `--reload` do uvicorn não aplicou, o novo
  `serverId` muda — sempre atualizar as próximas chamadas com o serverId novo
  (`preview_list` pra conferir se tiver dúvida).
