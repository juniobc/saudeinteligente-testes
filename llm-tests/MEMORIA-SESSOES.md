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
