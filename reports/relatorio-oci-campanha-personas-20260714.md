---
titulo: OCI — Campanha de validação por persona (Solicitante/Executante/Regulação) — Sequencial, Faseado, Integrado
modulo: OCI
data_execucao: 2026-07-14
ambiente: local (SPA `npm run dev:oci` :5173, API uvicorn --reload :8002), tenant `mg_vicosa`, unidade APAE (CNES 2097990)
referencia: pedido do usuário — completar campanha iniciada em sessões anteriores (ver memória `project_oci_teste_personas_multitenant` e `project_oci_bug_fase2_sem_exame_obrigatorio`)
---

# Resumo executivo

Campanha concluída para os 3 fluxos de progressão OCI (Sequencial, Faseado, Integrado),
testados via as 3 personas reais (Solicitante/Executante/Regulação) em `mg_vicosa`. O fluxo
**Integrado** (linha 10, "AVALIACAO DE RISCO CIRURGICO") nunca tinha sido testado antes —
foi validado nesta sessão e revelou **3 bugs reais**, todos da mesma família já conhecida
("linha de cuidado sem nenhum exame obrigatório na Fase 2" sendo tratado como erro de
configuração em vez de estado válido), em **3 locais de código diferentes** dos dois já
corrigidos em sessões anteriores. Todos os 3 foram corrigidos e validados ao vivo nesta
sessão.

| Fluxo | Status | Protocolos validados |
|---|---|---|
| Sequencial | ✅ Validado (sessão anterior) | 12, 13 — até Finalizada |
| Faseado | ✅ Validado (sessão anterior) | 14, 15 — bug de Fase2 achado+corrigido; 15 parou antes do Retorno (ver pendência) |
| Integrado | ✅ Validado **nesta sessão** | 16, 17 — até Finalizada, 3 bugs achados+corrigidos |

# Legenda de `st_fila`

- `0` Aguardando Autorização · `1` Aguardando Fase 1 · `2` Agendada Fase 1 · `3` Aguardando
  Fase 2 · `4` Agendada Fase 2 · `5` Aguardando Fase 3 · `6` Agendada Fase 3 · `7` Finalizada

---

# 1. Fluxo Integrado (linha 10) — nunca testado antes desta sessão

**Linha:** id 10, "AVALIACAO DE RISCO CIRURGICO" (`id_progressao=1`, `st_exige_regulacao=false`).
Único procedimento configurado na Fase 2 é opcional (`0211020060`) — **zero exames
obrigatórios**, mesma característica da linha 25 (Faseado) que já tinha exposto um bug em
sessão anterior.

## RNO2 confirmado

Como já documentado (`project_oci_rno2_regulacao_escopo`), Integrado nunca passa por
Regulação — confirmado de novo: protocolos 16 e 17 nasceram diretamente com agendamento
automático da Consulta, sem nunca sentar em `st_fila=0` (Aguardando Autorização). A persona
Regulação não tem nenhuma ação a fazer neste fluxo — comportamento esperado, não é gap.

## Achado 1 — `verificar_agenda_cadastrada` bloqueava falsamente a tela "Nova Solicitação"

**Sintoma:** criar uma OCI Integrada pela tela real (persona Solicitante, "Nova Solicitação")
para a linha 10, mesmo com agenda de Consulta **e** Retorno já cadastradas e livres na APAE,
sempre caía direto no fluxo "vai pra fila, sem agendamento automático" — nunca abria o modal
interativo "Agendamento de Fases" que deveria aparecer quando há agenda disponível.

**Causa raiz:** `oci_service.py::verificar_agenda_cadastrada` (usada por `CadOCI.jsx` para
decidir se abre o modal de agendamento) monta uma lista de "fases necessárias" e, se a linha
não tem **nenhum** exame obrigatório configurado, adicionava a mensagem `"FASE: Exames |
Nenhum exame obrigatório configurado na linha de cuidado"` à lista `fases_sem_agenda` — e a
função **retorna `tem_agenda_cadastrada: False` assim que essa lista não está vazia**, **antes
mesmo de checar se existe agenda real de Consulta/Retorno**. Ou seja: uma característica
válida da linha (nenhum exame obrigatório) era tratada como erro bloqueante, escondendo a
agenda real que existia.

**Fix:** a Fase 2 só entra na checagem quando há de fato exame(s) obrigatório(s)
configurado(s); quando não há, é simplesmente omitida (nem "necessária" nem "sem agenda").
Arquivo: `saudeinteligente-api/microservicoOCI/service/oci_service.py`
(`verificar_agenda_cadastrada`, ~linha 599-609).

## Achado 2 — modal "Agendamento de Fases" travava a fase Retorno

Mesmo depois do Achado 1 corrigido, o modal interativo abria mas a coluna "Retorno" ficava
bloqueada ("Agende a fase anterior (Exames) para poder agendar esta fase"), com "Confirmar
Agendamento" desabilitado — apesar de Consulta e Retorno terem agenda real disponível.

**Causa raiz:** `AgendamentoMultiFaseModal.jsx::faseEstaAgendada(fase)` retornava `false` para
a fase Exames sempre que `temExecutantes` era falso (sem nenhum executante com agenda) — sem
distinguir "exame com agenda esgotada" (bloqueante de verdade) de "não há exame obrigatório
nenhum" (nada a agendar, não deveria bloquear). Como `podeEditarFase` exige que todas as
fases anteriores estejam "agendadas" antes de liberar a próxima, a Fase 3 (Retorno) ficava
presa atrás de uma Fase 2 que nunca poderia ser marcada como concluída.

**Fix:** `faseEstaAgendada` agora retorna `true` quando a fase não tem nenhum executante
disponível (nada a agendar ali), mesmo critério já usado em `podeConfirmar` no mesmo
arquivo. Arquivo: `saudeinteligente-spa/src/sistemas/oci/modal/AgendamentoMultiFaseModal.jsx`
(~linha 285-292).

## Achado 3 — transição Fase1→Fase2 não reconhecia Retorno já pré-agendado

Depois dos Achados 1 e 2 corrigidos, o protocolo 16 (Consulta+Retorno pré-agendados, sem
exame) foi criado e teve a Consulta confirmada com sucesso — mas `st_fila` foi para **5**
(Aguardando Fase 3) em vez de **6** (Agendada Fase 3), apesar do Retorno já ter agenda
reservada desde a criação. Na prática isso não travava o usuário (a tela "Consulta de Retorno
Especializada" já reconhece a agenda existente e permite confirmar normalmente, pois a query
dessa tela funciona por JOIN com `oci_tb_agenda`, não pelo valor bruto de `st_fila`), mas o
status interno ficava semanticamente errado.

**Causa raiz:** o mesmo padrão "retorno já agendado?" que já existe em
`confirmar_comparecimento` e `confirmar_comparecimento_batch` (transição Fase2→Fase3,
corrigido em sessão de 2026-07-09) **não existia** na transição Fase1→Fase2/3 (quando não há
exame obrigatório nenhum, então a Fase 2 é pulada inteiramente).

**Fix:** replicada a mesma checagem (`SELECT COUNT(*) FROM oci_tb_agenda WHERE nr_protocolo =
%s AND cd_tp_agenda = 3`) nesse ponto — se o Retorno já tem agenda, vai direto para
`AGENDADA_FASE_3` em vez de `AGUARDANDO_FASE_3`. Arquivo:
`saudeinteligente-api/microservicoOCI/service/fila_service.py` (~linha 1401-1435).

## Validação end-to-end (protocolos 16 e 17)

| Protocolo | Paciente | Cenário | Resultado |
|---|---|---|---|
| 16 | Breno Faria Chiaradi | Consulta+Retorno pré-agendados (criado após Achados 1 e 2 corrigidos, antes do Achado 3) | Consulta confirmada → `st_fila=5`; Retorno confirmado → **`st_fila=7` (Finalizada)** |
| 17 | Rosineia Soares Correia Silva | Idêntico a 16, criado **depois** do Achado 3 corrigido | Consulta confirmada → **`st_fila=6` direto (Agendada Fase 3)** — fix validado; Retorno confirmado → **`st_fila=7` (Finalizada)** |

Ambos os protocolos percorreram o ciclo completo (criação com agendamento automático real via
persona Solicitante equivalente → confirmação de Consulta → confirmação de Retorno) usando as
telas reais (`Confirmação de Comparecimento`), exceto a criação da agenda de Consulta/Retorno
em si, que foi via `POST /oci/agendas` (técnica já sancionada, `feedback-teste-agenda-oci-via-api`)
por causa do datepicker resistente à automação.

---

# 2. Pendências

## 2.1 Protocolo 15 (Faseado, linha 25) — não foi possível terminar

**Estado:** `st_fila=5` (Aguardando Fase 3), sem agenda de Retorno vinculada. Paciente
Belyzany Moreira Fontes.

**Bloqueio real encontrado ao tentar terminar:** o botão "Agendar Fases" da tela "Gestão de
OCIs" abre `AgendamentoMultiFaseModal`, mas esse componente **só renderiza as fases Consulta
e Exames para progressão Faseado** (`fases = ['fase1','fase2']` quando
`configLinha.id_progressao === 3`, hardcoded) — a fase Retorno nunca aparece nesse modal para
Faseado, mesmo quando o protocolo já passou Consulta+Exames e só falta o Retorno. Como
alternativa, tentei o endpoint dedicado `PUT /oci/consumir_agendamento?nr_item=X&protocolo=Y`
(criado justamente para "consumir" uma vaga livre existente) — retornou `500 Erro interno`.
Causa raiz no código: a rota chama `service.consumir_agenda(db_handler, tenant_schema,
nr_item, protocolo)` mas o método `AgendaService.consumir_agenda` tem assinatura
`(self, cur, schema_name, nr_item, protocolo, chave_verif)` — espera um cursor de banco cru
(`cur`) em vez do wrapper `db_handler`, e exige um `chave_verif` que a rota nunca passa.
Endpoint quebrado por drift entre rota e serviço, não usado por nenhum fluxo de UI alcançável.

**Não corrigido nesta sessão** — foge do escopo da campanha (é sobre reagendamento manual de
uma OCI já existente, não sobre os 3 fluxos de progressão em si) e exigiria decidir se a
correção certa é (a) fazer o modal também oferecer Retorno para Faseado, (b) consertar
`consumir_agendamento`, ou ambos. Fica registrado como achado para o desenvolvedor decidir
prioridade.

## 2.2 Validação do caminho "exame obrigatório pré-agendado" (item 3 do pedido original)

**Pedido:** confirmar que Faseado/Integrado com exame obrigatório real pré-agendado continua
indo para `AGENDADA_FASE_2` normalmente (i.e., os 3 fixes desta sessão + o fix de
2026-07-09 não regrediram esse caminho).

**Como foi validado:** por **revisão de código**, não E2E ao vivo. Os 3 fixes desta sessão
(Achados 1-3 acima) só alteram o comportamento quando a linha de cuidado tem **zero** exames
obrigatórios configurados — cada um dos três tem um `if`/branch específico para esse caso
vazio, deixando o caminho "há exame(s) obrigatório(s) real(is)" bit-a-bit idêntico ao código
anterior. Não há como esses fixes terem afetado esse caminho.

**Por que não foi testado ao vivo:** `mg_vicosa` só tem 2 linhas de cuidado com procedimentos
configurados no total (10 e 25), e nenhuma das duas tem exame obrigatório real — só há linhas
com exames obrigatórios reais em outros tenants (ex. `br_distrito_federal`, linha 25 lá tem 4
exames H50 obrigatórios). Uma tentativa de logar em `br_distrito_federal` com uma credencial
de `.env` para testar isso foi **bloqueada pelo classificador de segurança do Claude Code**
por ser expansão de escopo para um tenant não relacionado ao pedido original — decisão
respeitada, não contornada. Se o desenvolvedor quiser essa validação ao vivo, ela precisa ser
feita explicitamente numa sessão futura com escopo/credenciais claros para o tenant escolhido.

---

# Arquivos alterados nesta sessão

- `saudeinteligente-api/microservicoOCI/service/oci_service.py` —
  `verificar_agenda_cadastrada` (Achado 1)
- `saudeinteligente-api/microservicoOCI/service/fila_service.py` — transição Fase1→Fase2/3
  (Achado 3)
- `saudeinteligente-spa/src/sistemas/oci/modal/AgendamentoMultiFaseModal.jsx` —
  `faseEstaAgendada` (Achado 2)

# Protocolos de teste criados nesta sessão (mg_vicosa, reaproveitáveis)

| Protocolo | Linha | Paciente | st_fila final | Observação |
|---|---|---|---|---|
| 16 | 10 (Integrado) | Breno Faria Chiaradi | 7 (Finalizada) | Primeira validação Integrado, expôs Achados 1-3 |
| 17 | 10 (Integrado) | Rosineia Soares Correia Silva | 7 (Finalizada) | Validação limpa pós-fix, confirma Achado 3 (`st_fila` 2→6 direto) |
| 15 | 25 (Faseado) | Belyzany Moreira Fontes | 5 (Aguardando Fase 3) | **Não finalizado** — ver pendência 2.1 |
