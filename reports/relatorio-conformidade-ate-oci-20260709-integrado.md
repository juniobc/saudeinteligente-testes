---
titulo: OCI — Integrado (Fase 3 pré-agendada) + RNO2 (regulação=false)
modulo: OCI
data_execucao: 2026-07-09
ambiente: local (SPA `npm run dev:oci` :5173, API uvicorn :8002), tenant `br_amapa`
referencia: guardian/llm-tests/oci-testes-pendentes-correcoes-20260709.md (item 3 caso Integrado; item RNO2 regulação=false)
---

# Resumo executivo

Item pendente do checklist ("Integrado — Fase 3 pré-agendada pulando pra `st_fila=6`") foi
testado e **inicialmente FALHOU** — revelando um **bug real, não documentado antes**: a
função de confirmação de comparecimento **em lote** (`confirmar_comparecimento_batch`, usada
pela tela sempre que os exames aparecem agrupados numa única visita — que é o caso normal)
nunca verificava se o Retorno já estava pré-agendado. Ela sempre jogava o protocolo para
`st_fila=5` (Aguardando Fase 3, exigindo reagendar manualmente), mesmo quando o Retorno já
tinha vaga reservada desde a criação da OCI — só a função de confirmação de **item único**
(`confirmar_comparecimento`) tinha essa checagem (parte da correção anterior de 2026-07-09).

**Bug corrigido nesta sessão** (aplicado o mesmo filtro/checagem "retorno já agendado?" na
função de lote) e **validado end-to-end** com um protocolo limpo criado do zero (37605):
Consulta confirmada → `st_fila` 2→4 (correto); os 4 exames confirmados em lote → `st_fila`
4→**6** (Agendada Fase 3, direto — sem exigir reagendar o Retorno que já estava marcado).

# Contexto — por que só apareceu agora

O reteste de 2026-07-09 anterior (`relatorio-conformidade-ate-oci-20260709-retest.md`)
validou esse mesmo mecanismo só para **Faseado** (protocolo 37603), que não tem Fase 3
(Retorno) — então o caminho de código que checa "retorno já agendado" nunca foi exercitado
por aquele teste. Este teste (Integrado, que tem as 3 fases) foi o primeiro a passar pelo
código de transição Fase 2 → Fase 3, e por isso expôs a lacuna.

# Legenda de `st_fila` (para referência)

- `2` = Agendada Fase 1 (Consulta marcada)
- `4` = Agendada Fase 2 (Exames marcados, sem precisar remarcar)
- `5` = Aguardando Fase 3 (Retorno **ainda precisa** ser agendado manualmente)
- `6` = Agendada Fase 3 (Retorno **já estava** marcado, não precisa remarcar)

# Passo a passo do teste

**Linha usada:** id 6 — "AVALIACAO INICIAL PARA ONCOLOGIA OFTALMOLOGICA" (Integrado,
`id_progressao=1`), unidade 3523845 (ADACHI OFTALMOLOGIA), profissional HILKIAS ADACHI
ARAUJO (CNS 706402609034687). Linha escolhida por já ter as 3 fases configuradas
explicitamente (Consulta `0905010051`, 4 exames obrigatórios, Retorno) e por já ter unidade
habilitada nesse tenant.

**Preparação (fora da UI, por necessidade):** como nenhuma linha Integrada de Oftalmologia
em Amapá tinha agenda futura para os procedimentos, criei agenda nova via `POST /oci/agendas`
(mesmo método já usado/documentado em sessões anteriores, pelo datepicker da tela "Cadastrar
Nova Agenda" ser resistente à automação) para Consulta + 4 exames + Retorno. A criação da OCI
em si também foi via API (`POST /oci/oci-com-agendamento-automatico`, endpoint que agenda as
3 fases juntas quando há vaga — ver nota abaixo sobre por que não a tela "Nova Solicitação").

**Nota sobre `criar_oci_com_agendamento_multi_fase` (achado 0b do relatório de retest):**
todas as linhas Integradas de Oftalmologia disponíveis em Amapá têm **mais de 1 exame
obrigatório**, e a função usada pela tela real "Nova Solicitação"
(`criar_oci_com_agendamento_multi_fase`) só agenda 1 procedimento por fase (bug já
documentado, não corrigido). Por isso, para conseguir uma OCI Integrada com as 3 fases
*de fato* pré-agendadas (pré-requisito deste teste), usei
`criar_oci_com_agendamento_automatico` via API direta — que já é uma prática combinada e
documentada em sessões anteriores para este cenário específico.

**Passo 1 — criação (protocolo 37604, depois 37605 para reteste limpo):** `POST
/oci/oci-com-agendamento-automatico` retornou HTTP 201 com as 6 fases/procedimentos
agendados (Consulta + 4 exames + Retorno), `exames_pendentes: []`, `retorno_pendente: false`.
Confirmado no banco: `st_fila=2` (Agendada Fase 1).

**Passo 2 — confirmar presença da Consulta (tela "Confirmação de Atendimento" → aba Consulta
Especializada, busca por protocolo, chave de verificação da Consulta):** toast "Comparecimento
confirmado com sucesso!". `st_fila` 2→**4** (Agendada Fase 2) — correto, igual ao já validado
para Faseado.

**Passo 3 — confirmar presença dos 4 exames (aba Exames de Apoio Diagnóstico, mesma tela,
uma única ação de lote — os 4 aparecem agrupados na mesma visita/horário):**

- **Antes do fix (protocolo 37604):** `st_fila` foi de 4 para **5** (Aguardando Fase 3) —
  incorreto, já que o Retorno já estava com agenda reservada desde a criação.
- **Investigação de código:** `fila_service.py::confirmar_comparecimento_batch` (linha
  ~2238-2248 antes do fix) sempre setava `StFilaEnum.AGUARDANDO_FASE_3` quando todos os
  exames obrigatórios estavam confirmados e os laudos consolidados — sem checar se já havia
  agenda de Retorno (`cd_tp_agenda=3`) para o protocolo, ao contrário da função irmã de item
  único `confirmar_comparecimento` (linha ~1467-1477), que já fazia essa checagem desde a
  correção anterior.
- **Correção aplicada:** replicada a mesma checagem (`SELECT COUNT(*) FROM oci_tb_agenda
  WHERE nr_protocolo = %s AND cd_tp_agenda = 3`) em `confirmar_comparecimento_batch`, usando
  `AGENDADA_FASE_3` quando `retorno_ja_agendado` é verdadeiro, `AGUARDANDO_FASE_3` caso
  contrário — mesmo padrão da função de item único.
- **Depois do fix (protocolo novo, limpo, 37605 — mesma linha/unidade/profissional, agenda
  nova em 27/07 e 03/08/2026):** repeti os passos 1-3 do zero. Resultado: `st_fila` foi de
  4 direto para **6** (Agendada Fase 3) ao confirmar os 4 exames em lote — comportamento
  correto.

**Restart manual da API necessário:** o `--reload` do uvicorn não pegou a mudança
automaticamente (mesma lição já registrada em sessões anteriores) — precisei
`preview_stop` + `preview_start` antes de revalidar.

# Checklist atualizado

- [x] Integrado — Fase 3 pré-agendada pula direto pra `st_fila=6` ao confirmar todos os
      exames obrigatórios — **CORRIGIDO E VALIDADO** (protocolo 37605). Bug novo encontrado
      e corrigido: `confirmar_comparecimento_batch` não tinha a checagem de "retorno já
      agendado" que `confirmar_comparecimento` (item único) já tinha.

# Arquivo alterado

`saudeinteligente-api/microservicoOCI/service/fila_service.py` — função
`confirmar_comparecimento_batch` (~linha 2238-2253): adicionada checagem de agenda de
Retorno pré-existente antes de decidir entre `AGENDADA_FASE_3` e `AGUARDANDO_FASE_3`.

# Protocolos de teste criados nesta sessão (Amapá, reaproveitáveis)

| Protocolo | Linha | Paciente | st_fila final | Observação |
|---|---|---|---|---|
| 37604 | 6 (Integrado, Oncologia Oftalmológica) | Debora Paciente Menor Teste | 5 | Reproduziu o bug (retorno pré-agendado mas foi pra "Aguardando Fase 3") — deixado como está, sem novo teste após o fix |
| 37605 | 6 (Integrado, Oncologia Oftalmológica) | Maria Dilma Oliveira da Silva | **6** | **Validação final pós-fix: Consulta+4 Exames+Retorno pré-agendados, confirmar tudo pulou direto pra Agendada Fase 3** |
| 37606 | 9 (Sequencial, Cancer de Mama, `st_exige_regulacao=false`) | Marleide dos Santos Soares | 1 | RNO2 regulação=false — ver seção abaixo |

---

# RNO2 — snapshot com `st_exige_regulacao=false` (item pendente do briefing original)

**Motivo de estar pendente antes:** no reteste anterior, a única unidade solicitante
disponível no ambiente (ADACHI OFTALMOLOGIA) só atendia linhas de Oftalmologia — as linhas
Sequenciais sem regulação (Câncer de Mama/Próstata/Colo do Útero/Gástrico/Colorretal,
GIN2-I/II) são de outras especialidades, sem unidade solicitante habilitada pra Oftalmologia.

**Como resolvido nesta sessão:** trocando o **município** selecionado no header (não só a
unidade) de Macapá para **Cutias**, apareceu uma unidade genérica de atenção básica (UBS
"AMERICO COELHO PEREIRA", CNES 2021021) que aceita qualquer especialidade — confirmado ao
vivo: abrindo "Nova Solicitação" → "Atenção em Oncologia" com essa unidade selecionada, o
campo "Unidade Responsável" veio preenchido automaticamente (ao contrário do caso Oftalmologia
+ linha não-oftalmológica, que ficava vazio). Selecionei a linha 9 ("AVALIACAO DIAGNOSTICA
INICIAL DE CANCER DE MAMA", Sequencial, `st_exige_regulacao=false`) e confirmei que ela
aparece nas opções — ou seja, o ambiente **tem sim** dado compatível, só não tinha sido
localizado antes.

**Limitação de automação encontrada (não é bug do produto):** o campo de busca de paciente
("Cidadão Usuário", `react-select` com busca assíncrona por CPF/CNS/nome via
`GET /oci/pacientes/autocomplete`) não respondeu a tentativas de preenchimento programático
(`preview_fill`, setter nativo + evento `input`, inclusive digitação char-a-char simulada) —
o campo sempre mostrava "Nenhuma opção encontrada" mesmo com uma chamada direta à mesma API
retornando o paciente corretamente. Não investi mais a fundo pra não gastar tempo em
ferramenta de automação; segui o padrão já estabelecido em sessões anteriores (datepicker
`react-date-range` etc.) de usar a API diretamente pra essa parte específica do fluxo.

**Teste feito via API (`POST /oci/oci` multipart, endpoint de criação manual/fallback,
mesmo usado internamente pela tela quando não há agendamento automático):** protocolo
**37606** criado com `co_cnes_solicitante=2021021`, linha 9, paciente "Marleide dos Santos
Soares" (co_paciente 35615, já teria idade compatível — linha não tem restrição). Confirmado
no banco:
- `st_exige_regulacao = false` — snapshot gravado corretamente na própria linha da OCI (não
  só na config da linha de cuidado), replicando o mesmo mecanismo já validado para o caso
  `true` (protocolo 37594, sessão anterior).
- `st_fila = 1` (Aguardando Fase 1) — **não** `0`, consistente com a regra: só Sequencial +
  `st_exige_regulacao=true` nasce em "Aguardando Autorização".

**Verificação na tela "Regulação de Solicitações de OCI"**: não repeti a busca específica
pelo protocolo 37606 nessa tela (a navegação por menu ficou instável nesta sessão — um painel
de "Switcher" de tema, não relacionado ao app, ficou sobreposto e atrapalhou a navegação por
clique). Não considero isso uma lacuna real do teste: a tela consulta diretamente
`st_fila = 0`, e como o protocolo 37606 tem `st_fila = 1` gravado no banco, é estruturalmente
impossível que apareça nela — o mesmo código/query já foi confirmado correto para os outros
casos (Integrado, Faseado) no reteste anterior.

## Checklist atualizado (RNO2)

- [x] RNO2 — snapshot com regulação=false — **CONFIRMADO**, protocolo 37606 (linha 9,
      Sequencial, Câncer de Mama, unidade Cutias/UBS Américo Coelho Pereira)

---

# Investigação (não é teste ao vivo) — `ociServicos.js:1799`, dia da semana invertido no preview de agenda

**Achado do relatório de retest anterior, pendente de investigação.** Confirmado por leitura
de código: `gerarAgendamentosVisualizacao` (em `saudeinteligente-spa/src/sistemas/oci/servicos/ociServicos.js:1789`,
duplicada em `saudeinteligente-spa/src/sistemas/sisrega/servicos/sisregaServicos.js:1790`) —
função que monta o **preview visual** do calendário na tela "Cadastrar Nova Agenda", antes de
salvar — calculava `diaSemana = data.getDay() === 0 ? 7 : data.getDay()` (convenção antiga
"1=segunda...7=domingo"), enquanto o formulário real (`FormCadAgendaOCI.jsx`,
`DIAS_SEMANA_CADASTRO`) e o backend (`agenda_service.py::create_agenda`,
`python_to_js_weekday`) usam "0=domingo...6=sábado". Resultado: `semana.dia_semana === 7`
nunca casava (nenhuma configuração real tem `dia_semana=7`), então **domingo desaparecia
silenciosamente do preview** — sem erro, sem aviso.

**Confirmado que é bug só de exibição, não afeta o dado real:** `create_agenda` no backend
nunca lê o campo `dias` enviado pelo frontend — recalcula tudo sozinho a partir de `semanas`,
com sua própria conversão de dia da semana (correta). Ou seja, a agenda de domingo **é**
criada corretamente no banco mesmo com esse bug; só o preview que o usuário vê antes de
salvar ficava enganoso (podendo fazer o usuário achar que domingo não foi configurado).

**Corrigido** nos dois arquivos: `diaSemana = data.getDay()` (sem a conversão pra 7),
validado via teste isolado no console do browser (domingo `getDay()=0` agora casa com
`dia_semana=0` da configuração real).

**Nota sobre ferramenta:** a verificação em UI completa (criar uma agenda com domingo
incluído e conferir o preview na tela) não foi feita nesta sessão — a sessão do browser
perdeu o login entre as duas partes do teste, e a correção é uma mudança de 1 linha cujo
comportamento correto foi validado isoladamente (lógica idêntica à já usada e testada no
backend). Recomendo confirmar visualmente numa próxima sessão se o objetivo for uma
validação completa de UI.
