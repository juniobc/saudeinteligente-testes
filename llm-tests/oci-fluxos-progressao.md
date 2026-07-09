---
titulo: OCI — Fluxos de Progressão (Integrado / Sequencial / Faseado) — Teste Guiado por LLM
modulo: OCI
status: piloto — método experimental de teste via browser real, complementa (não substitui) os specs Playwright de guardian/tests/
ultima_atualizacao: 2026-07-08
---

# Como usar este arquivo

Este é um **briefing de conhecimento**, não um script de cliques. Você (agente
LLM com acesso a ferramenta de browser, ex. tools `preview_*` do Claude Code)
deve usar as informações abaixo para **decidir por conta própria** como navegar,
o que clicar e o que verificar — como um analista de QA faria, não como um
robô seguindo um roteiro fixo. Roteiros passo a passo engessam o teste e
escondem exatamente os desvios de comportamento que valem a pena encontrar.

Princípios gerais (herdados do teste `oci-cadastro-solicitacao.md` e do
Guardian):

- **Nunca navegue digitando rotas/URLs diretamente.** Só `/login` pode ser
  acessado direto; todo o resto é clique em menu/botão/link.
- **Selecione a unidade de trabalho ativa no header antes de criar solicitações**
  (combo Município → combo Unidade, canto superior). Sem isso, "Unidade
  Responsável" no formulário de Nova Solicitação fica vazio/travado — não é
  bug. Ver `guardian/llm-tests/MEMORIA-SESSOES.md`.
- **Rotas de menu já confirmadas nesta suíte** (Gestão das Filas de Espera):
  "Regulação" (`/oci/dashboard/med_autorizador`) para autorizar solicitações
  com `st_exige_regulacao=true`; "Agendamento da Lista de Espera"
  (`/oci/dashboard/lista_espera`) tem 3 abas (Consulta Especializada / Exames
  de Apoio Diagnóstico / Consulta de Retorno Especializada) que filtram por
  `st_fila` (1/3/5 respectivamente) — o campo "Nº Autorização" busca por
  `nr_protocolo`. "Confirmação de Atendimento"
  (`/oci/dashboard/confirm_comparecimento`) é onde se grava o comparecimento
  com a chave de verificação.
- **Escope seletores ao contexto certo** (modal ativo, dialog aberto) — a
  mesma tela pode ter campos duplicados com o mesmo `data-field-name` atrás
  de um modal.
- **Confirme visualmente cada ação** (snapshot/screenshot) antes de assumir
  que funcionou.
- **Backend precisa estar no ar** (`localhost:8002`, ver
  `saudeinteligente-api/README.md`) — "Network Error" no console geralmente
  é isso, não um bug do fluxo.
- **Investigue o banco antes de testar na UI** (`guardian/tools/db-query.js`,
  somente leitura, credenciais em `guardian/.env`) para achar dados de teste
  reais em vez de adivinhar — ver seção de dados abaixo.
- Divergência entre o que este arquivo descreve como regra de negócio e o
  que a UI realmente faz **pode ser um bug real** (essas regras já foram
  validadas com o desenvolvedor, diferente de suposições sobre fluxo de
  tela). Documente com evidência clara e pare — não decida sozinho se é bug.
- Elemento não mapeado, resultado ambíguo, ou UI que não bate com nada aqui
  descrito → Gatilho de Dúvida: pare, descreva, pergunte.
- Relate em pt-BR.

---

## Objetivo

Validar que o sistema respeita o comportamento esperado de cada um dos
**3 modos de progressão** de uma Linha de Cuidado, ao longo do ciclo completo
de uma solicitação OCI: Consulta Inicial → Exames de Apoio → Retorno.

## Conceitos de negócio (ler também `guardian/knowledge/modules/oci/about.md`)

Uma OCI percorre 3 etapas (`oci_tb_fase`: cd_fase 1/2/3 = Primeira/Segunda/Terceira
Fase — na prática: Consulta Inicial, Exames, Retorno). O comportamento entre
etapas depende do **modo de progressão** da Linha de Cuidado
(`oci_tb_linha_cuidado.id_progressao`):

**Distinção crucial (esclarecida pelo desenvolvedor em 2026-07-09): AGENDAMENTO e
CONFIRMAÇÃO DE COMPARECIMENTO são dois gates diferentes.** A progressão controla
quando cada etapa pode ser **agendada**; a **confirmação de comparecimento é sempre
sequencial nos 3 modos** (só pode confirmar a etapa N depois de confirmada a N-1) —
isso NÃO diferencia Integrado/Faseado/Sequencial.

| id_progressao | Modo | Quando cada etapa pode ser AGENDADA | Quando pode ser CONFIRMADA (comparecimento) |
|---|---|---|---|
| 1 | **Integrado** | As 3 etapas (Consulta, Exames, Retorno) são agendadas **de uma vez, na criação da OCI** — não espera nada. | Sempre sequencial: Etapa 2 só confirma depois da Etapa 1 confirmada; Etapa 3 só depois da Etapa 2. |
| 2 | **Sequencial** | Cada etapa só é **agendada** depois que a etapa anterior foi **confirmada** — agendamento em si é bloqueado, uma etapa de cada vez. | Mesma regra sequencial acima (decorre naturalmente, já que nem dá pra agendar antes). É o **único** modo em que `st_exige_regulacao = true` faz sentido (regulação manual antes de liberar o agendamento da 1ª etapa). |
| 3 | **Faseado** | Etapa 1 (Consulta) e Etapa 2 (Exames) são agendadas **juntas, na criação da OCI** (igual ao Integrado, só que sem a Etapa 3 junto). Etapa 3 (Retorno) só é agendada depois. | Sequencial: Etapa 2 só confirma depois da Etapa 1 confirmada; Etapa 3 fica bloqueada até que **todos os procedimentos obrigatórios** da Etapa 2 tenham comparecimento confirmado (opcionais não bloqueiam). |

Nenhum dos 3 modos passa por regulação (`st_exige_regulacao`) exceto Sequencial —
Integrado/Faseado agendam automaticamente na criação, então regulação nunca se aplica.

**Bug do §2.8 CORRIGIDO em 2026-07-09** (relatório
`relatorio-conformidade-ate-oci-20260709.md`): a causa raiz não era falta de UI, era
a máquina de estados em `fila_service.py::confirmar_comparecimento` — ao confirmar
comparecimento da Etapa 1, o código sempre gravava `AGUARDANDO_FASE_2` (st_fila=3),
mesmo quando a Etapa 2 já tinha agenda reservada desde a criação (caso de
Faseado/Integrado, via agendamento automático). Mesmo problema na transição
Etapa2→Etapa3 (sempre `AGUARDANDO_FASE_3`, ignorando Retorno pré-agendado no
Integrado). Corrigido: agora checa se a próxima etapa já tem agenda em
`oci_tb_agenda` antes de decidir entre "aguardando agendar" e "já agendada". **Ao
retestar RN08**, esperar que uma OCI Faseada criada com agenda disponível para
Etapa 1+2 pule direto para `st_fila=4` (Agendada Fase 2) ao confirmar a Etapa 1, sem
precisar reagendar os exames. Se a linha não tinha agenda de Etapa 1 no momento da
criação (fallback para fluxo manual, sem pré-agendamento), o comportamento
"aguardando agendar" continua correto — a diferenciação só existe quando o
agendamento automático conseguiu reservar as fases juntas.

> Desde 2026-07-09 (RNO2), `st_exige_regulacao` também é gravado como snapshot
> em `oci_tb_fila_espera_oci` no momento da criação da solicitação (não só na
> linha de cuidado) — útil para conferir no banco sob qual config aquele
> protocolo específico nasceu, mesmo que a linha seja reconfigurada depois. Ver
> `guardian/llm-tests/MEMORIA-SESSOES.md`.

Vocabulário útil (confirmado no banco, schema pode variar por tenant):

- `oci_tb_fila_espera_oci.st_fila` — status da solicitação, conferir contra
  `oci_tb_status_fila` (cd_status/nm_status): 0=Aguardando Autorização,
  1=Aguardando Fase 1, 2=Agendada Fase 1, 3=Aguardando Fase 2, 4=Agendada
  Fase 2, 5=Aguardando Fase 3, 6=Agendada Fase 3, 7=Finalizada, 8=Cancelada,
  9=Devolvida para Solicitante. Esses códigos são um bom sinal de progresso
  real, mesmo que a UI mostre texto diferente.
- Cota: `oci_cota_solicitante` / `oci_cota_executante` — colunas
  `qt_cota`, `qt_disponivel`, `qt_utilizada`, `qt_reserva_tecnica`,
  `qt_max`, `qt_min`, `st_ativo`. Uma linha/unidade com `qt_disponivel = 0`
  não deve permitir novo agendamento — se a UI permitir mesmo assim, é bug.
- Regulação manual: quando `st_exige_regulacao = true` na linha de cuidado, a
  solicitação deve passar pela tela de Regulação (ver `about.md`, rota
  conceitual "Regulação"/`med_autorizador`) antes de poder ser agendada —
  procure o menu correspondente, não adivinhe a URL.
- Confirmação de comparecimento usa uma **chave de verificação** gerada no
  agendamento — sem a chave certa, o comparecimento não deve ser gravado.

## Dados de teste — descubra, não hardcode

Cada execução deste teste deve começar consultando o banco (schema do tenant
em uso) para achar Linhas de Cuidado reais em cada modo, e confirmar se há
saldo de cota. Exemplos de queries (somente leitura, via `dbQuery`):

```sql
-- Uma linha de cuidado de cada modo de progressão
SELECT id_linha_cuidado, no_grupo, id_progressao, st_exige_regulacao
FROM oci_tb_linha_cuidado
WHERE id_progressao = 1 -- trocar para 2 e 3
LIMIT 3;

-- Unidade solicitante com profissionais vinculados (mesma lógica do teste de cadastro)
SELECT c.co_cnes, c.no_fantasia, COUNT(v.co_profs) AS qtd_profissionais
FROM cnes_base_estabelecimentos c
JOIN oci_tb_vinculo v ON v.co_cnes = c.co_cnes
WHERE c.st_solicitante = true
GROUP BY c.co_cnes, c.no_fantasia
HAVING COUNT(v.co_profs) > 0
ORDER BY qtd_profissionais DESC LIMIT 5;

-- Situação de cota de uma linha/unidade candidata
SELECT * FROM oci_cota_solicitante WHERE co_procd_medc = '<procedimento da linha>' AND st_ativo = true;

-- Status atual de solicitações já existentes, para reaproveitar em vez de criar novas
SELECT nr_protocolo, st_fila, id_linha_cuidado FROM oci_tb_fila_espera_oci
WHERE id_linha_cuidado = <id> ORDER BY dt_hr_solicitacao DESC LIMIT 5;
```

Reaproveitar uma solicitação já existente em estado intermediário (ex: já
"Agendada Fase 1", esperando confirmação) pode ser mais rápido do que criar
uma nova do zero para testar a etapa 2 — use o bom senso.

Se não existir nenhuma Linha de Cuidado configurada em algum dos 3 modos no
tenant que você está usando, ou se não houver cota disponível em nenhuma
linha/unidade candidata, isso é um Gatilho de Dúvida — reporte a ausência de
massa de teste em vez de tentar contornar (o Guardian não cria dados via
banco, só lê).

## Onde a configuração de progressão pode ser vista/ajustada na UI

Existe uma tela de configuração do módulo (ver `about.md`: "Configuração de
OCIs" no menu "Gestão de OCIs"). Se precisar confirmar visualmente o modo de
uma linha antes de testar, ou se o desenvolvedor pedir para você mudar o modo
de progressão via UI para observar o efeito (ex: linha muda de Sequencial
para Integrado e a exigência de regulação deveria desligar sozinha — regra
já documentada em `about.md`), essa é a tela. Não adivinhe os campos dela —
explore e reporte o que encontrar antes de interagir, é território novo (o
Guardian ainda não documentou seletores desta tela).

## O que validar em cada modo (critério de sucesso — o "como chegar lá" é com você)

**Integrado**: crie/reaproveite uma solicitação nessa linha. As 3 etapas devem
poder ser agendadas sem que o sistema exija comparecimento confirmado da
etapa anterior. Não deve haver bloqueio de Retorno por falta de Consulta.

**Sequencial**: tente agendar a Etapa 2 (Exames) de uma solicitação que ainda
não teve a Etapa 1 confirmada — a UI deve impedir (botão desabilitado,
etapa não listada como agendável, ou mensagem clara). Depois confirme o
comparecimento da Etapa 1 (chave de verificação) e verifique que a Etapa 2
libera. Repita a lógica entre Etapa 2 e 3. Se a linha tiver
`st_exige_regulacao = true`, valide que a solicitação passa por autorização
antes de poder ser agendada.

**Exame opcional (RN10)** — confirmado pelo desenvolvedor em 2026-07-09: a tela/ação
para incluir um exame opcional na Fase 1 **só fica disponível depois de confirmar a
presença do paciente na primeira consulta** — não durante o agendamento da Fase 1,
nem antes da confirmação de comparecimento. O relatório `relatorio-conformidade-
ate-oci-20260709.md` (§2.9) não encontrou essa tela porque testou o agendamento de
exames (Fase 2) sem ter confirmado presença da Fase 1 primeiro. Ao retestar RN10-12,
o roteiro correto é: agendar Fase 1 → **confirmar comparecimento da Fase 1** → só
então procurar a tela/ação de incluir exame opcional (provavelmente ligada ao
registro da consulta/atendimento, não à tela de agendamento de exames).

**Faseado**: confirme que Etapas 1 e 2 podem ser agendadas juntas. Tente
agendar a Etapa 3 antes de confirmar todos os procedimentos **obrigatórios**
da Etapa 2 — deve ser bloqueado. Confirme os obrigatórios (não precisa
confirmar os opcionais) e verifique que a Etapa 3 libera.

Para cada modo testado, capture evidência (screenshot + estado relevante,
ex: `st_fila` antes/depois) do momento em que o sistema permitiu ou bloqueou
uma ação — isso é o que importa no relatório, mais do que a sequência exata
de cliques usada para chegar lá.

---

## Relatório de Execução (adaptar às linhas efetivamente testadas)

```
Data/hora da execução: <preencher>
Ambiente / tenant: <preencher>

Linhas de cuidado usadas:
- Integrado: <id_linha_cuidado / nome>
- Sequencial: <id_linha_cuidado / nome> (st_exige_regulacao: <sim/não>)
- Faseado: <id_linha_cuidado / nome>

Resultado por modo:
- Integrado: PASSOU / FALHOU / NÃO TESTADO — <evidência/observação>
- Sequencial (bloqueio Fase1→Fase2): PASSOU / FALHOU / NÃO TESTADO — <evidência>
- Sequencial (bloqueio Fase2→Fase3): PASSOU / FALHOU / NÃO TESTADO — <evidência>
- Sequencial (regulação manual, se aplicável): PASSOU / FALHOU / NÃO TESTADO — <evidência>
- Faseado (Fase1+2 juntas): PASSOU / FALHOU / NÃO TESTADO — <evidência>
- Faseado (bloqueio Fase3 até obrigatórios): PASSOU / FALHOU / NÃO TESTADO — <evidência>
- Cota (bloqueio quando qt_disponivel = 0, se testado): PASSOU / FALHOU / NÃO TESTADO — <evidência>
- Chave de verificação (comparecimento só grava com chave certa, se testado): PASSOU / FALHOU / NÃO TESTADO

Possíveis bugs encontrados (divergência real de regra de negócio, não desatualização de roteiro):
<listar com evidência, ou "nenhum">

Dados/telas descobertos que valem virar knowledge permanente do Guardian
(sugestão — não persistir sem aprovação):
<ex: seletores da tela de Agendamento/Lista de Espera, seletores da tela de
Regulação, seletores da tela de Confirmação de Comparecimento>
```
