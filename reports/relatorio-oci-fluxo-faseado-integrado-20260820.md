# Relatório de Teste — Fluxo OCI (Faseado + Integrado + Sequencial/Regulação)

**Data:** 2026-08-20
**Tenant:** mg_vicosa
**Escopo:** fluxo central de OCI (solicitação → regulação → agendamento → confirmação →
exames/laudo → retorno → finalização) mais as ações de cancelar, devolver e reenviar, e o
fluxo completo passando pelo médico regulador. Central de Alertas e telas de importação
**não** foram testadas, conforme solicitado.
**Método:** manipulação real da tela (Browser), com a única exceção documentada (criação
de agenda via API, prática já validada em sessões anteriores).

## Resumo executivo

Os três fluxos de progressão — **Faseado**, **Integrado** e **Sequencial (via médico
regulador)** — foram executados **end-to-end com sucesso**, do zero até `FINALIZADA`, além
das ações **Devolver**, **Reenviar** e **Cancelar**, todas validadas funcionando
corretamente:

| Protocolo | Progressão | Linha de cuidado | Paciente | Resultado |
|---|---|---|---|---|
| **4771** | Faseado | 11 — AVALIAÇÃO CARDIOLÓGICA | Abinael José de Freitas | ✅ Finalizada |
| **4772** | Integrado | 10 — AVALIAÇÃO DE RISCO CIRÚRGICO | Abel Antônio Gouveia | ✅ Finalizada |
| **4770** | Sequencial | 25 — OFTALMOLOGIA 9+ | Adaide Maria Teixeira | Devolvido → Reenviado → Autorizado → **Cancelado** (teste das 3 ações) |
| **4773** | Sequencial | 25 — OFTALMOLOGIA 9+ | Adair Carlos da Silva | Autorizado (regulador) → ✅ **Finalizada** (fluxo completo via regulação) |

RN02 (Faseado/Integrado nunca passam por regulação) foi **confirmada** nos dois primeiros:
ambos nasceram direto em `AGUARDANDO FASE 1` (st_fila=1), sem passar por
`AGUARDANDO AUTORIZAÇÃO`. O fluxo Sequencial (que **exige** regulação) também foi validado
ponta a ponta pelo médico autorizador, incluindo agendamento manual fase a fase (diferente
do agendamento automático em lote do Faseado/Integrado).

Durante o teste foram encontrados **1 bug de ambiente** (corrigido), **1 bug de UI**
(recorrência silenciosa de campo) e **1 inconsistência de regra de negócio** entre dois
caminhos de código que deveriam se comportar igual. As 3 ações novas testadas nesta rodada
(Devolver, Reenviar, Cancelar, Autorizar) **não apresentaram bugs**. Detalhes abaixo.

---

## 0. Ambiente — bug corrigido

**Sintoma:** API e SPA subiam normalmente, mas o navegador (e `curl`) recebiam
`ERR_CONNECTION_REFUSED` ao chamar `http://localhost:8002`, enquanto `http://127.0.0.1:8002`
respondia normalmente.

**Causa:** `uvicorn` (config `api-oci` em `.claude/launch.json`) não tinha `--host` explícito,
então usava o default `127.0.0.1` (IPv4 apenas). Neste ambiente, `localhost` resolve
preferencialmente para `::1` (IPv6), que ninguém escutava.

**Correção aplicada:** adicionado `--host localhost` ao comando do uvicorn em
[.claude/launch.json](../../.claude/launch.json), fazendo o bind cobrir IPv4 e IPv6. Validado
— login e todas as chamadas subsequentes funcionaram normalmente em `localhost:8002`.

**Nota lateral:** cheguei a tentar contornar apontando o SPA para `127.0.0.1:8002`
(`VITE_API_BASE_HOST`) — isso quebrou a autenticação (cookie de sessão não é enviado entre
`localhost` e `127.0.0.1`, tratados como sites diferentes pelo navegador). Revertido antes de
prosseguir; a correção real é o bind dual-stack acima.

---

## 1. Dado de teste desatualizado (não é bug, é aviso para sessões futuras)

Memória de campanhas anteriores (jul/2026) indicava "linha 25 = Faseado". **Não é mais
verdade.** Reconferindo direto no banco (`oci_tb_linha_cuidado.id_progressao`), hoje em
`mg_vicosa`:

- **Faseado (`id_progressao=3`):** só 2 linhas — **id 11** (Avaliação Cardiológica) e
  **id 15** (Avaliação Diagnóstica — Insuficiência Cardíaca), ambas em Cardiologia.
- **Integrado (`id_progressao=1`):** ampla maioria das linhas de Ortopedia, Otorrino,
  Ginecologia, Oftalmologia (exceto 25/23) etc. — inclui a já conhecida **id 10** (Avaliação
  de Risco Cirúrgico).
- **Sequencial (`id_progressao=2`):** linha 25 (a que a memória antiga apontava como
  Faseado) está aqui hoje, junto com a maioria das linhas de Oncologia/Oftalmologia.

Cheguei a criar um protocolo (nº **4770**) pensando estar testando Faseado na linha 25 — na
verdade testei Sequencial sem querer. O resultado ficou consistente com Sequencial
(`st_exige_regulacao=true` → `AGUARDANDO AUTORIZAÇÃO`), então não é um bug, só confirma que a
memória de mapeamento linha→progressão precisa ser sempre reconferida no banco antes de puxar
de memória de sessões antigas (dado de teste muda com o tempo).

---

## 2. Bug — campo "Linha de Cuidado" reverte silenciosamente no formulário "Nova Solicitação"

**Onde:** modal "Nova Solicitação" (botão "Solicitar OCI" na tela Consultar/Cadastrar OCI).

**Sintoma:** depois de selecionar a Linha de Cuidado e então preencher Paciente,
Profissional Solicitante e/ou CID, o campo Linha de Cuidado **volta silenciosamente** para o
valor da **última solicitação criada anteriormente** na mesma sessão — sem nenhum aviso
visual, sem erro, sem indicação de que o valor mudou. O componente troca de "modo nativo
`<select>`" para "modo autocomplete react-select" a cada re-render, e nesses ciclos o valor
correto se perde.

**Como reproduzi:** criei a solicitação da linha 11 (Cardiologia) preenchendo Linha → Paciente
→ Profissional → CID → Justificativa, na ordem normal da tela. Antes de salvar, conferi o
payload real via rede: o campo Linha de Cuidado estava de volta em **25** (a linha da minha
solicitação anterior), não 11. Só percebi porque estava inspecionando a requisição
diretamente — um usuário real não teria como notar e criaria a OCI na linha errada.

**Impacto:** risco real de solicitação criada na especialidade/linha de cuidado errada,
silenciosamente, sempre que o usuário monta o formulário na ordem "linha → paciente →
profissional/CID" (a ordem mais natural da tela). Workaround usado no teste: reselecionar a
Linha de Cuidado como **último campo**, imediatamente antes de clicar Salvar.

**Sugestão:** investigar o componente de `id_linha_cuidado` em `ModalCadOCI`/`NovaSolicitacao`
(ou equivalente) — parece haver um estado derivado que não persiste a seleção do usuário
através dos re-renders disparados pelos campos seguintes.

---

## 3. Bug confirmado (já conhecido, ainda não corrigido) — Anexo "opcional" do laudo é na verdade obrigatório

**Onde:** modal "Registrar Laudo + CID" (tela `/oci/dashboard/resultado_exame_cid`).

**Sintoma:** o rótulo do campo diz **"Anexo (opcional)"**, mas o backend
(`POST /oci/api/laudo/individual`) rejeita a submissão com `422 Unprocessable Content`
(`"arquivo": "Field required"`) se nenhum arquivo for enviado.

Esse bug já tinha sido documentado numa campanha anterior (14/07) e **continua reproduzindo
igual hoje**, mais de um mês depois — não foi corrigido. Contornei com upload sintético
(arquivo PDF gerado via `DataTransfer`/`File` em JS) para poder prosseguir o teste.

**Sugestão:** ou tornar o campo de fato opcional no backend, ou remover "(opcional)" do
rótulo da tela.

---

## 4. Inconsistência de regra de negócio — transição Fase 2 → Fase 3 não reaproveita Retorno pré-agendado quando passa pelo laudo

**Onde:** `saudeinteligente-api/microservicoOCI/service/fila_service.py`.

Existem **dois caminhos de código** que fazem a transição Fase 2 → Fase 3:

1. `confirmar_comparecimento` (PATCH `/oci/fila_comparecimento/{nr_item}/confirmar`), usado
   quando o exame **não exige laudo**: verifica se o Retorno já tem agenda reservada
   (`retorno_ja_agendado`) e, se sim, pula direto para `AGENDADA_FASE_3` (st_fila=6).
2. `salvar_laudo_individual` (POST `/oci/api/laudo/individual`), usado quando o exame
   **exige laudo com CID**: ao consolidar o último laudo pendente, **sempre** manda o
   protocolo para `AGUARDANDO_FASE_3` (st_fila=5) — **sem checar** se o Retorno já tem agenda
   reservada.

**Reproduzido ao vivo:** protocolo 4771 (Faseado, linha 11) teve as 3 fases pré-agendadas
juntas na criação (via "Agendar Fases" → agendamento automático). Ao confirmar o exame
(ELETROCARDIOGRAMA, que exige laudo nesta linha) e salvar o laudo, o protocolo foi parar em
`AGUARDANDO FASE 3` (5), **não** em `AGENDADA FASE 3` (6) — mesmo com a agenda de Retorno já
reservada para ele (`nr_item` 1733, vínculo confirmado no banco). Já o protocolo 4772
(Integrado, linha 10), cujo exame **não exige laudo** nessa linha, seguiu pelo caminho 1 e foi
direto para `AGENDADA_FASE_3`.

**Impacto prático:** não bloqueou o fluxo — a agenda de Retorno pré-reservada continuou
disponível e consegui confirmar a presença normalmente a partir da tela "Confirmação de
Comparecimento", filtro Retorno. Ou seja, é uma **inconsistência de status/rótulo**
(`AGUARDANDO` vs `AGENDADA`), não um travamento — mas pode confundir quem olha o painel
achando que falta agendar o Retorno quando na verdade ele já está reservado.

**Sugestão:** replicar em `salvar_laudo_individual` (routes.py, em torno da linha 6195) a
mesma checagem de `retorno_ja_agendado` já usada em `confirmar_comparecimento`
(`fila_service.py` linha ~1558-1564).

---

## 5. Linha do tempo completa dos dois protocolos

### Protocolo 4771 — Faseado (linha 11, Avaliação Cardiológica)

| st_fila | Rótulo | Como cheguei lá |
|---|---|---|
| 1 | AGUARDANDO FASE 1 | `POST /oci/oci` (tela Nova Solicitação) — nasceu sem regulação (RN02 ok) |
| 2 | AGENDADA FASE 1 | "Agendar Fases" → agendamento automático das 3 fases de uma vez |
| 4 | AGENDADA FASE 2 | Confirmação de presença da Consulta (chave de verificação) |
| 4 → laudo | — | Confirmação de presença do Exame (Eletrocardiograma) + registro de Laudo/CID |
| 5 | AGUARDANDO FASE 3 | Consolidação do laudo (ver item 4 acima sobre o status) |
| **7** | **FINALIZADA** | Confirmação de presença do Retorno + motivo de saída "Alta Curado" |

### Protocolo 4772 — Integrado (linha 10, Avaliação de Risco Cirúrgico)

| st_fila | Rótulo | Como cheguei lá |
|---|---|---|
| 1 | AGUARDANDO FASE 1 | `POST /oci/oci` — nasceu sem regulação (RN02 ok) |
| 2 | AGENDADA FASE 1 | "Agendar Fases" → agendamento automático das 3 fases |
| 4 | AGENDADA FASE 2 | Confirmação de presença da Consulta |
| 6 | AGENDADA FASE 3 | Confirmação de presença do Exame (linha não exige laudo → pulou direto) |
| **7** | **FINALIZADA** | Confirmação de presença do Retorno + motivo de saída "Alta Curado" |

---

## 5b. Regulação (médico autorizador), Devolver, Reenviar, Cancelar — todos validados sem bug

Tela "Regulação de Solicitações de OCI" (`/oci/dashboard/med_autorizador`), ações
Autorizar/Devolver/Cancelar; tela "Consultar/Cadastrar OCI", ação Reenviar Solicitação.

**Devolver** (protocolo 4770): botão "Devolver" no modal "Análise Médico Autorizador" abre um
sub-modal "Devolver Solicitação" com campo "Justificativa da Devolução" — só a submissão desse
sub-modal (botão "Confirmar Devolução") de fato chama a API (`PATCH /oci/oci/4770/detalhar`),
o botão externo só abre o sub-modal. `st_fila` foi para **9 (DEVOLVIDA PARA SOLICITANTE)**,
`ds_justificativa_devolucao` gravada corretamente.

**Reenviar** (protocolo 4770): botão "Reenviar Solicitação" na listagem do solicitante abre
modal mostrando a justificativa da devolução (somente leitura) + campo opcional de
observação. Confirmar Reenvio voltou `st_fila` para **0 (AGUARDANDO AUTORIZAÇÃO)**,
`st_reenviada=true`, `dt_reenvio` e `ds_observacao_reenvio` gravados.

**Autorizar** (protocolos 4770 e 4773): preencher "Parecer do Médico Autorizador" + botão
Autorizar → modal de confirmação ("a APAC será emitida...") → Confirmar Autorização levou
`st_fila` para **1 (AGUARDANDO FASE 1)** nos dois casos. **Observação (não é bug, já
documentado em sessões anteriores de faturamento):** `nr_apac` permanece `null` mesmo após
Finalizada — a numeração real da APAC só é atribuída na geração da remessa em lote
(`microservicoFaturamento`), não na autorização individual; o texto do modal ("a APAC será
emitida") é levemente impreciso quanto ao *momento* real da emissão.

**Cancelar** (protocolo 4770, testado já autorizado): botão "Cancelar" na listagem do
solicitante, modal pede "Justificativa do Cancelamento". `st_fila` foi para **8 (CANCELADA)**,
`ds_justificativa_cancelamento` gravada corretamente.

**Fluxo Sequencial completo via regulador** (protocolo 4773): diferente de Faseado/Integrado,
Sequencial **não** tem o botão "Agendar Fases" (lote automático) — cada fase é agendada
manualmente na tela "Agendamento da Lista de Espera" (`/oci/dashboard/lista_espera`, abas
Consulta Especializada / Exames de Apoio Diagnóstico / Consulta de Retorno Especializada).
Fluxo completo:

| st_fila | Rótulo | Como cheguei lá |
|---|---|---|
| 0 | AGUARDANDO AUTORIZAÇÃO | `POST /oci/oci` — linha 25 exige regulação (RN02: Sequencial checa o flag) |
| 1 | AGUARDANDO FASE 1 | Autorizado pelo médico regulador |
| 2 | AGENDADA FASE 1 | Agendamento manual da Consulta (lista_espera → Selecionar horário → Concluir) |
| 3 | AGUARDANDO FASE 2 | Confirmação de presença da Consulta (sem pré-agendamento de fase 2, diferente do Faseado/Integrado) |
| 4 | AGENDADA FASE 2 | Agendamento manual dos 3 exames obrigatórios (botão único "Agendar Exames" agenda todos de uma vez) |
| 5 | AGUARDANDO FASE 3 | Confirmação de presença dos 3 exames **numa única ação** (1 chave confirma os 3) + 2 laudos registrados (Mapeamento de Retina e Biomicroscopia exigem resultado; Tonometria não) |
| 6 | AGENDADA FASE 3 | Agendamento manual do Retorno |
| **7** | **FINALIZADA** | Confirmação de presença do Retorno + motivo de saída "Alta Curado" |

## 6. Fora de escopo (não testado a pedido do usuário)

- Central de Alertas
- Telas de importação (SISREG, Regfácil, e-SUS PEC)

## 7. Massa de dados criada nesta sessão (mg_vicosa)

- Protocolos: 4770 (Sequencial, devolvido→reenviado→autorizado→**cancelado**), 4771 (Faseado,
  finalizado), 4772 (Integrado, finalizado), 4773 (Sequencial, **finalizado** via regulador)
- Agendas criadas via API para consulta/exame/retorno das linhas 10, 11 e 25 (profissionais
  Eduardo, Emerson, João Bosco, Jordana, Lairton, Samuel — todos pré-existentes na base de
  teste)
- 3 laudos registrados (protocolo 4771: Eletrocardiograma/CID I10; protocolo 4773: Mapeamento
  de Retina e Biomicroscopia/CID H52), todos com anexo PDF sintético
