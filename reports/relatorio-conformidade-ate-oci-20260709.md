# Relatório de Conformidade — Processo ATE/OCI vs. Sistema

> Baseado em `Especificacao_Processo_ATE_OCI.pdf` (19 regras de negócio, RN01-RN19).
> Teste guiado por LLM em ambiente real (`guardian/llm-tests/`), tenant `br_amapa`, unidade
> ADACHI OFTALMOLOGIA (CNES 3523845). Data: 2026-07-08/09.
>
> **Aviso importante**: o documento de especificação pode conter imprecisões — os itens abaixo
> descrevem "o que a spec diz" vs. "o que o sistema faz", sem presumir que toda divergência é
> um bug do sistema. Cabe revisão humana decidir se o gap é do sistema ou do documento.

---

## Como ler este relatório

- **CONFIRMADO** — testado ao vivo na UI, comportamento bate com a regra descrita.
- **DIVERGÊNCIA** — testado ao vivo ou por leitura de código; comportamento do sistema
  diverge do que a spec descreve. Evidência (arquivo:linha ou dado do banco) incluída.
- **NÃO TESTADO (ambiente)** — não foi possível validar ao vivo por limitação de massa de
  dados neste ambiente (ex.: falta de agenda cadastrada), não por dúvida sobre o código.
- **NÃO TESTADO (fora do escopo desta sessão)** — regra não testada por falta de tempo.

---

## 1. Resumo por regra de negócio

| Regra | Descrição resumida | Status |
|---|---|---|
| RN01 | Solicitação via PEC e-SUS ou Plataforma | NÃO TESTADO (fora do escopo — só testamos criação via Plataforma) |
| RN02 | Só linhas com "Exige Regulação" vão para fila de regulação | **DIVERGÊNCIA** — ver §2.1 |
| RN03 | Regulador pode Autorizar/Devolver/Indeferir | CONFIRMADO (Autorizar e Devolver testados; Indeferir/Cancelar não testado) |
| RN04 | Devolvidas retornam à unidade, corrigem e reenviam, reentram na fila | CONFIRMADO — ver §2.2 |
| RN05 | Autorizadas / sem regulação seguem direto para Agendamento | **DIVERGÊNCIA** — mesma raiz da RN02, ver §2.1 |
| RN06 | Progressão Integrada — 3 etapas agendadas de uma vez | NÃO TESTADO (ambiente) — ver §3 |
| RN07 | Progressão Sequencial — cada etapa após finalização da anterior | CONFIRMADO — ver §2.3 |
| RN08 | Progressão Faseada — Fase1+2 juntas, Fase3 após Fase2 | **DIVERGÊNCIA** — ver §2.8 |
| RN09 | Execução sempre linear, independente do agendamento | CONFIRMADO (validado indiretamente via RN07) |
| RN10 | Exame opcional pode ser incluído na Fase 1 | **DIVERGÊNCIA (não encontrada UI para isso)** — ver §2.9 |
| RN11 | Exame opcional exige novo agendamento | NÃO TESTADO — depende de RN10 |
| RN12 | Exame opcional pendente bloqueia Fase 3 | NÃO TESTADO — depende de RN10 |
| RN13 | "Exige Resultado p/ Próxima Fase" bloqueia Fase 3 sem CID | CONFIRMADO por código — ver §2.4 |
| RN14 | Fase 2 pode ser executada em CNES Terceiro | CONFIRMADO por schema/dados — ver §2.5 |
| RN15 | Fase 3 libera só após Fase 2 completa | CONFIRMADO — ver §2.3 |
| RN16 | Validade da APAC = data do 1º procedimento executado | **DIVERGÊNCIA** — ver §2.6 |
| RN17 | APAC com validade fixa de 2 competências | NÃO TESTADO (depende de RN16, que não é automático) |
| RN18 | Numeração da APAC só após conclusão integral da OCI | **DIVERGÊNCIA** — ver §2.6 |
| RN19 | Exportação da remessa para o SIA | **DIVERGÊNCIA (não implementado)** — ver §2.7 |

---

## 2. Achados detalhados

### 2.1 RN02/RN05 — Toda solicitação passa por regulação manual, mesmo sem exigir

**Spec**: "Apenas especialidades/linhas de cuidado configuradas com a opção 'Exige Regulação'
são direcionadas à fila de regulação... as demais seguem diretamente para a Fila de Agendamento."

**Sistema**: `POST /oci` (routes.py:2682) grava `st_fila=0` (Aguardando Autorização) **sempre**,
com o comentário `# Sempre inicia em 0 (aguardando autorização)`. A tela de Regulação
(`get_oci_listagem`, oci_service.py:1273-1275) filtra apenas por `st_fila = 0`, sem nenhuma
condição sobre `oci_tb_linha_cuidado.st_exige_regulacao`.

**Evidência ao vivo**: criamos o protocolo 37592 na linha "AVALIACAO INICIAL EM OFTALMOLOGIA -
A PARTIR DE 9 ANOS" (`st_exige_regulacao = false` no banco) e ele apareceu normalmente na tela
"Regulação de Solicitações de OCI", exigindo autorização manual do mesmo jeito que uma linha
com regulação obrigatória.

**Possíveis leituras**: (a) bug real — falta o `if st_exige_regulacao` no fluxo de criação/listagem;
(b) decisão de produto não documentada na spec (ex.: regulação sempre manual neste sistema,
independente da flag, e a flag serve para outra coisa). Recomendo confirmar com quem define
regra de negócio antes de tratar como bug.

### 2.2 RN03/RN04 — Devolução e reenvio

**Testado ao vivo, protocolo 37593** (paciente JOAO GUILHERME DA SILVA BRAGA):
- Devolver sem justificativa → bloqueado com "A justificativa é obrigatória" (validação correta).
- Devolver com justificativa → `st_fila` 0→9 (Devolvida para Solicitante), justificativa gravada
  em `ds_justificativa_devolucao`.
- Edição da solicitação (ícone lápis) → atualiza `ds_justificativa`, mas **não** reenvia sozinha
  (`st_reenviada` continua `false`) — é necessário o ícone separado "Reenviar" (avião de papel).
- Reenvio (ícone avião) → modal mostra a justificativa da devolução original (bom, dá contexto
  a quem reenvia), `st_fila` volta a 0 e `st_reenviada=true`, `dt_reenvio` gravado.
- Reentrada na fila de regulação → confirmada (protocolo aparece de novo em "Regulação").

Fluxo bate com a RN04. Nenhum erro de console em nenhuma etapa.

### 2.3 RN07/RN09/RN15 — Sequencial completo, execução linear, liberação de Fase 3

**Testado ao vivo, protocolo 37591** (linha "AVALIACAO DE ESTRABISMO", Sequencial,
paciente LAILA EMANUELLE SODRE BRAZAO), ciclo completo:

| Etapa | Ação | st_fila resultante |
|---|---|---|
| Criação | Nova Solicitação | 0 |
| Regulação | Autorizar | 1 (Aguardando Fase 1) |
| Agendamento Fase 1 | 15/07/2026 09:10, HILKIAS ADACHI ARAUJO | 2 (Agendada Fase 1) |
| Confirmação Fase 1 | chave `U9SP4IK6` | 3 (Aguardando Fase 2) |
| Agendamento Fase 2 | 6 exames agendados em lote ("Agendar Exames") | 4 (Agendada Fase 2) |
| Confirmação Fase 2 | ver achado abaixo (§2.3.1) | 5 (Aguardando Fase 3) |
| Agendamento Fase 3 | 16/07/2026 11:00 | 6 (Agendada Fase 3) |
| Confirmação Fase 3 | chave `9OTISG8O` | 7 (Finalizada) |

Todas as transições bateram com a máquina de estados esperada (`oci_tb_status_fila`), sem
erros de console em nenhum passo, e a Fase 3 só liberou após a Fase 2 completa (RN15 OK).

#### 2.3.1 Achado — Confirmação de comparecimento em lote usa apenas 1 chave para N exames

**Contexto do usuário** (esclarecido durante o teste): a chave de verificação é por **agenda**
(sessão de agendamento), não por exame individual — está correto que exames da mesma agenda
compartilhem o código impresso no comprovante. **O problema real não é a chave compartilhada**,
é que a confirmação marca **todos** os exames da agenda como comparecidos de uma vez só, sem
permitir informar que o paciente compareceu a apenas parte deles.

**Evidência**: 6 exames agendados juntos (protocolo 37591), cada um com `chave_verif` distinta
no banco. Ao confirmar presença informando a chave de **um único exame** (referente a
"MAPEAMENTO DE RETINA"), os 6 registros em `oci_tb_agenda` foram marcados
`st_comparecimento = true` simultaneamente.

**Código**: `fila_service.py:2084-2133` (`confirmar_comparecimento_lote` ou função equivalente) —
recebe `nr_items: List[int]` + uma única `chave_verificacao`, valida **somente a chave do
primeiro item** (`rows[0][2]`, linha 2117) e depois faz `UPDATE ... WHERE nr_item IN (...)`
(linha 2126-2133) aplicando a confirmação a **todos** os itens da lista, sem distinção.

**Sugestão de correção**: a tela de confirmação deveria permitir selecionar quais exames da
agenda o paciente efetivamente realizou (checkbox por exame, todos pré-marcados por padrão),
mantendo a validação de uma única chave por agenda, mas atualizando `st_comparecimento`
apenas dos itens marcados.

### 2.4 RN13 — Exige Resultado com CID bloqueia Fase 3

**Confirmado por leitura de código** (não foi possível testar ao vivo por falta de tempo —
nenhuma linha usada nos testes tinha procedimento com `st_exige_resultado_prox_fase = true`
e agenda disponível simultaneamente neste ambiente).

`routes.py:4560-4574`, endpoint `PUT /fila_gestao_exames/atualiza_status_etapa_3`: antes de
avançar `st_fila` para 5 (Aguardando Fase 3), chama `service._todos_laudos_consolidados(...)`;
se `False`, bloqueia com HTTP 400 e mensagem "Há exames sem anexo, laudo e CID registrados na
tela 'Resultado de Exame com CID'." Existe tela dedicada `/oci/dashboard/resultado_exame_cid/`
para esse registro. Comportamento bate com a RN13 pela leitura do código.

### 2.5 RN14 — Execução em CNES Terceiro

**Confirmado por schema/dados, não testado ao vivo**. `oci_tb_agenda.co_cnes_executante` é
independente de `oci_tb_fila_espera_oci.co_cnes_solicitante`; no banco (`br_amapa`) existem
agendas com `co_cnes_executante` em pelo menos 4 estabelecimentos diferentes (3523845, 2020076,
6817866, 7419643), confirmando suporte estrutural a execução em unidade diferente da principal.
Não testamos ao vivo um protocolo real sendo executado em unidade terceira porque a unidade de
trabalho ativa nesta sessão (ADACHI OFTALMOLOGIA) só tinha agenda funcional própria.

### 2.6 RN16-18 — Geração automática de numeração da APAC

**Spec**: "A numeração da APAC só é gerada após a conclusão integral de todas as fases da OCI,
desde que executadas dentro do período de validade" — validade calculada automaticamente a
partir da data do primeiro procedimento executado.

**Sistema**: os campos `nr_apac`/`nu_apac`, `dt_validade_apac_inicio` e `dt_validade_apac_fim`
só existem como **campos opcionais de digitação manual no momento da autorização** (regulação),
antes de qualquer execução — visíveis no modal "Análise Médico Autorizador" (campos "Nº da APAC",
"Código do órgão emissor", "Validade (início)", "Validade (fim)") e persistidos por
`autorizar_oci` (`oci_service.py:3996-4060`).

**Evidência ao vivo**: protocolo 37591 chegou a `st_fila=7` (Finalizada) — todas as 3 fases
executadas e confirmadas — e `nr_apac`, `dt_validade_apac_inicio`, `dt_validade_apac_fim`
continuaram `null`. Não encontrei, em `fila_service.py` nem `oci_service.py`, nenhuma rotina
que calcule/preencha esses campos automaticamente ao atingir `st_fila=7`.

**Leitura**: a numeração de APAC, como descrita na RN16-18 (automática, calculada, pós-
conclusão), **não está implementada**. O que existe é um preenchimento manual anterior à
execução, o que também contraria RN16 (a validade deveria nascer da data do 1º procedimento
*executado*, não ser digitada antes de qualquer execução).

### 2.8 RN08 — Progressão Faseada se comporta igual à Sequencial

**Spec**: "As etapas 1 e 2 podem ser agendadas em conjunto" (Faseada) — diferente da Sequencial,
onde cada etapa só pode ser agendada após a finalização da anterior.

**Testado ao vivo, protocolo 37592** (linha "AVALIACAO INICIAL EM OFTALMOLOGIA - A PARTIR DE 9
ANOS", `id_progressao=3` = Faseada). Para viabilizar o teste, cadastramos agenda de Fase 1 nova
(03-07/08/2026, 08h-12h, tela "Consulta e Cadastro de Agendas") já que a original não tinha
nenhum horário de Primeira Consulta — ver nota sobre não-atomicidade abaixo.

- Agendamos a Fase 1 (03/08/2026 08:00) → `st_fila` 1→2 (Agendada Fase 1).
- **Antes de confirmar comparecimento da Fase 1**, verificamos a aba "Exames de Apoio
  Diagnóstico": o protocolo 37592 **não aparecia** — ou seja, não foi possível agendar a Fase 2
  junto com a Fase 1, mesmo sendo linha Faseada.
- Não encontramos nenhum botão/ação alternativa (ex.: "Agendar Fases" mencionado no toast de
  criação da OCI) que permitisse agendar as duas fases de uma vez só.
- Confirmamos comparecimento da Fase 1 (chave `IFQB0ENQ`) → `st_fila` 2→3 (Aguardando Fase 2) —
  só então o protocolo passou a aparecer na aba de Exames.

**Leitura**: o comportamento observado para Faseada foi **idêntico** ao Sequencial (Fase 2 só
liberada após confirmação da Fase 1). Não encontramos evidência de que o sistema diferencia os
3 modos de progressão no momento do agendamento — a diferenciação pode existir em outro lugar
que não localizamos, ou pode não estar implementada. Recomendo busca dirigida no código por
`id_progressao` no fluxo de agendamento antes de concluir que é bug.

#### Achado adicional — Criação de agenda não é atômica em caso de conflito

Ao tentar cadastrar uma nova agenda (tela "Consulta e Cadastro de Agendas") para um intervalo
de vários dias, uma tentativa que resultou em erro 409 (conflito de horário do profissional em
um dos dias) ainda assim **gravou um registro no banco** (`oci_tb_agenda`, um dos dias do
intervalo) antes de falhar nos demais — a UI reportou a operação como falha total (nenhum toast
de sucesso, erro exibido), mas parte dos dados já tinha sido persistida. Não é function crítica
do processo ATE/OCI em si (é uma tela de suporte/administração), mas pode gerar registros órfãos
inconsistentes com o que o usuário acredita ter acontecido. Endpoint: `POST /oci/agendas`.

### 2.9 RN10-12 — Exame opcional não pôde ser incluído por nenhuma tela testada

**Spec**: "Na 1ª fase (consulta especializada), o profissional pode incluir exames opcionais que
passam a compor a OCI" (RN10); "exigem novo processo de agendamento" (RN11); "enquanto pendente,
bloqueiam a Fase 3" (RN12).

**Testado ao vivo, mesmo protocolo 37592**. A linha de cuidado tem o procedimento "TESTE
ORTÓPTICO" (`0211060232`) configurado com `st_opcional = true` em `oci_tb_procedimentos_linha`,
e isso é corretamente propagado para `oci_procedimentos_solicitacao.st_opcional = true` na
criação da solicitação (confirmado no banco).

Ao abrir "Agendar Exames" (Fase 2) na tela de Agendamento da Lista de Espera, a lista de
procedimentos mostrada **incluía o TESTE ORTÓPTICO junto com os obrigatórios**, sem nenhuma
marcação visual (checkbox, badge "opcional") que o distinguisse. Ao clicar "Agendar Exames", o
sistema agendou automaticamente **apenas os 3 obrigatórios** — o opcional foi silenciosamente
excluído, sem opção na tela de escolher incluí-lo.

**Leitura**: não encontramos, nas telas de agendamento de Fase 1/Fase 2 que percorremos, nenhum
mecanismo para o profissional "incluir" o exame opcional como a RN10 descreve. É possível que
essa ação pertença a uma tela de **execução/registro do atendimento da consulta** (distinta de
"agendar" — talvez ligada à tela "Resultado de Exame com CID" ou outra não mapeada nesta sessão)
que não localizamos a tempo. Recomendo ao usuário indicar onde no sistema o profissional
registra a consulta em si (não o agendamento) para localizarmos o ponto de inclusão do opcional.

### 2.7 RN19 — Exportação para o SIA

**Não implementado**. A tela "Integração SIA" (`saudeinteligente-spa/src/sistemas/oci/paginas/
IntegracaoSIA.jsx`) usa dados inteiramente mock/hardcoded (`fetchApacs`, `fetchCnesOptions` —
linhas 15-80) e não faz nenhuma chamada a um backend real. Busquei no
`saudeinteligente-api/microservicoOCI` por qualquer rota ou service relacionado a exportação
SIA e não encontrei nada — apenas importação de SISREG (fluxo inverso, não relacionado).

---

## 3. Não testado por limitação do ambiente (dados de teste)

O tenant `br_amapa`/unidade ADACHI OFTALMOLOGIA usado nesta sessão só tinha agenda completa
(Fase 1 + Fase 2 + Fase 3) originalmente cadastrada para **uma única linha de cuidado**:
"AVALIACAO DE ESTRABISMO" (Sequencial, id=3). A linha id=4 ("AVALIACAO INICIAL EM OFTALMOLOGIA -
A PARTIR DE 9 ANOS", Faseada, com exame opcional) tinha agenda só de Fase 2/3, sem Fase 1 —
**resolvemos isso cadastrando agenda nova** (tela "Consulta e Cadastro de Agendas", ver §2.8),
o que permitiu completar os testes de RN08 e RN10-12.

Ainda não testado por falta de tempo/agenda:
- **RN06 (Integrado do zero)** — nenhuma linha com `id_progressao=1` e agenda completa nos 3
  tipos foi testada ao vivo nesta sessão. Aplicando a mesma técnica de §2.8 (cadastrar agenda
  nova via UI), deve ser viável numa próxima sessão.
- **RN17** (validade fixa de 2 competências) — depende de RN16 (numeração automática da APAC),
  que não está implementada; não há como testar RN17 isoladamente.
- **RN01** (origem via PEC e-SUS) — fora do escopo desta sessão, só testamos criação direta pela
  Plataforma.

---

## 4. Bugs encontrados e corrigidos durante a campanha (sessões anteriores, não repetidos aqui)

1. `agenda_service.py` (`get_unidades_com_vaga`) — `print()` com caractere Unicode quebrava em
   console Windows (cp1252), retornando 500 em qualquer tentativa de abrir agendamento sem
   agenda futura cadastrada. **Corrigido**.
2. `fila_service.py:1596` — mesmo tipo de problema (seta Unicode em log), causava 500 no
   agendamento de Fase 1 Sequencial. **Corrigido**.
3. `POST /scraping/insere_vinculos/{co_ibge}` não popula `oci_tb_vinculo` apesar do nome — só
   grava `oci_tb_profissionais`. **Registrado, não corrigido** (tarefa separada).

---

## 5. Resumo executivo (para priorização)

| Prioridade sugerida | Achado | Ação sugerida |
|---|---|---|
| Alta | §2.3.1 — confirmação em lote marca todos os exames sem granularidade | Adicionar seleção por exame na tela de confirmação de comparecimento |
| Alta | §2.6 — APAC não é gerada automaticamente pós-conclusão | Decidir: implementar cálculo automático (RN16-18) ou atualizar a spec para refletir o fluxo manual atual |
| Alta | §2.9 — não há UI localizada para incluir exame opcional (RN10-12) | Confirmar com o time onde essa ação deveria existir (tela de execução da consulta?) e implementar/mapear |
| Média | §2.8 — Faseado se comporta igual ao Sequencial (Fase2 não libera antes de confirmar Fase1) | Confirmar se é bug ou se a diferenciação existe em outro ponto não mapeado |
| Média | §2.1 — toda solicitação passa por regulação, ignora `st_exige_regulacao` | Confirmar se é bug ou decisão de produto; se bug, ajustar `POST /oci` e a query da tela de Regulação |
| Média | §2.7 — SIA export é mock | Decidir se entra no escopo atual do projeto ou fica para fase futura |
| Baixa | §2.8 — cadastro de agenda não é atômico em erro de conflito | Envolver criação de múltiplos dias em transação única no `POST /oci/agendas` |
| Baixa | RN06 (Integrado) e RN17 (validade 2 competências) ainda não testados | Repetir abordagem de §2.8 (criar agenda nova) numa próxima sessão |

---

## 6. Status pós-sessão 2026-07-09 (correções aplicadas em sessão de desenvolvimento posterior)

> Comparação item a item com o estado deste relatório. "Corrigido"/"Melhorado" referem-se a
> mudanças de código já aplicadas em `microservicoOCI` (não testadas ao vivo ainda — pendente
> nova rodada do Guardian). Detalhes técnicos em `spark/logs/changelog.md` (sessões
> "RNO2" e "Faseado/Integrado: fases pré-agendadas...") e `spark/memory.md`.

| Item do relatório | Status | O que mudou |
|---|---|---|
| §2.1 (RN02/RN05) — toda solicitação passa por regulação, ignora `st_exige_regulacao` | **CORRIGIDO** | Causa raiz: `create_oci` (usado pelo `POST /oci`, fluxo manual/fallback quando não há agenda para agendamento automático) sempre gravava `st_fila=0` (Aguardando Autorização), mesmo para Integrado/Faseado/Sequencial-sem-regulação — que caíam na fila de Regulação por engano. Não existe status novo no banco (`oci_tb_status_fila` continua com os mesmos 10 códigos) — a correção usa os status já existentes: `st_fila=0` só quando for Sequencial + `st_exige_regulacao=true`; caso contrário nasce em `st_fila=1` (Aguardando Fase 1), que já é a fila correta de "esperando ser agendado" e não aparece mais na tela do regulador. |
| RNO2 — flag `st_exige_regulacao` lido dinamicamente da linha, sem rastreabilidade por protocolo | **MELHORADO** | Passou a ser gravado como snapshot em `oci_tb_fila_espera_oci` no momento da criação; `criar_oci_com_agendamento_automatico` agora recusa (erro de validação) tentativa de agendamento automático numa linha Sequencial que exige regulação; o mesmo snapshot foi reaproveitado para corrigir o §2.1 (linha acima). **Pendente**: você ainda precisa rodar a migração SQL nos tenants para isso entrar em vigor. |
| §2.3.1 — confirmação em lote marca todos os exames sem granularidade | **NÃO CORRIGIDO** | Fora de escopo desta rodada. |
| §2.6 (RN16-18) — APAC não é gerada automaticamente | **NÃO CORRIGIDO** | Fora de escopo desta rodada — ainda é decisão de produto (implementar cálculo automático ou atualizar a spec). |
| §2.7 (RN19) — exportação SIA é mock | **NÃO CORRIGIDO** | Fora de escopo desta rodada — ainda não implementado. |
| §2.8 (RN08) — Faseado se comporta igual ao Sequencial (Fase 2 só libera após confirmar Fase 1) | **CORRIGIDO** | Causa raiz encontrada: `confirmar_comparecimento` sempre transicionava para "aguardando agendar" mesmo quando a próxima fase já tinha agenda reservada desde a criação (caso de Faseado/Integrado). Agora checa `oci_tb_agenda` e pula direto para "já agendada" quando aplicável. |
| §2.8 — achado adicional: criação de agenda não atômica em conflito | **INVESTIGADO, sem mudança de código** | `agenda_service.py::create_agenda` já valida conflito de horário do profissional para TODOS os dias do intervalo antes de fazer qualquer INSERT (INSERT em lote só roda depois, dentro da mesma transação, com rollback em qualquer exceção). Pela leitura do código, o bug não deveria reproduzir — e esse trecho já existia desde 17/01/2026 (antes do teste original). Hipótese: pode ter sido confusão entre duas submissões separadas (intervalo maior falhou, intervalo menor teve sucesso), não uma transação única parcialmente persistida. **Reteste pedido**: ver item 7 de `guardian/llm-tests/oci-testes-pendentes-correcoes-20260709.md` — reproduzir o cenário exato com contagem de registros antes/depois no banco. |
| §2.9 (RN10) — não foi localizada UI para incluir exame opcional | **ESCLARECIDO — não era bug** | Você confirmou que a inclusão do exame opcional só fica disponível **depois** de confirmar a presença do paciente na 1ª consulta — o teste anterior procurou antes desse ponto. Roteiro de reteste corrigido em `guardian/llm-tests/oci-fluxos-progressao.md`. |
| RN11 — exame opcional exige novo processo de agendamento | **NÃO TESTADO** (dependia de RN10) | Ainda não testado ao vivo; sem mudança de código específica. |
| RN12 — exame opcional pendente bloqueia Fase 3 | **CORRIGIDO** | A query que libera a Fase 3 filtrava só exames originalmente `st_opcional=false`. Agora qualquer exame que **foi agendado** (independente do flag original) bloqueia a Fase 3 até ser confirmado — já pronto para quando a inclusão de exame opcional (RN10) for testada/usada. |
| Achado extra — `criar_oci_com_agendamento_automatico` era tudo-ou-nada (falta de vaga em 1 exame abortava a OCI inteira) | **CORRIGIDO** (não estava no relatório original, encontrado durante a correção do §2.8) | Consulta continua obrigatória ter vaga; exames/retorno sem vaga agora ficam pendentes em vez de abortar a criação. Retorno nunca agenda antes de todos os exames obrigatórios estarem agendados. |
| RN06 (Integrado do zero), RN17, RN01 | **NÃO TESTADO** | Sem mudança — seguem pendentes de teste ao vivo numa próxima sessão do Guardian. |
