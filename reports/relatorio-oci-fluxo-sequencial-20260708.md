# Relatório de Execução — OCI Fluxo Sequencial

> Teste guiado por LLM (`guardian/llm-tests/oci-fluxos-progressao.md`), não é spec Playwright.

```
Data/hora da execução: 2026-07-08
Ambiente / tenant: br_amapa (Amapá)

Linha de cuidado usada:
- Sequencial: id_linha_cuidado=3 "AVALIACAO DE ESTRABISMO" (st_exige_regulacao: sim)
- Protocolo: 37590 (paciente DEBORA PACIENTE MENOR TESTE)

Resultado por etapa:
- Regulação manual (autorização antes de agendar): PASSOU — validado em sessão anterior (st_fila 0→1)
- Bloqueio Fase1→Fase2 (Fase2 não aparece antes de agendar/confirmar Fase1): PASSOU — protocolo ausente da aba Exames enquanto st_fila=1 e st_fila=2
- Agendamento da Fase 1: PASSOU — st_fila 1→2 (Agendada Fase 1), horário 15/07/2026 09:00, profissional HILKIAS ADACHI ARAUJO
- Chave de verificação (comparecimento só grava com chave certa): PASSOU — chave errada rejeitada com toast claro ("Chave de confirmação incorreta"), chave certa (J1ZWUIHB) aceita ("Comparecimento confirmado com sucesso!")
- Confirmação de comparecimento → liberação da Fase 2: PASSOU — st_fila 2→3 (Aguardando Fase 2), protocolo passou a aparecer na aba "Exames de Apoio Diagnóstico"

Bugs encontrados nesta sessão:
1. [CORRIGIDO] saudeinteligente-api/microservicoOCI/service/fila_service.py:1596 — print(f"...→...")
   com seta Unicode quebrava no console Windows (cp1252), causando 500 em TODO agendamento de
   Fase 1 no fluxo Sequencial (não específico deste caso de teste). Corrigido trocando "→" por "->".
   Confirmado 500→200 após reiniciar a API manualmente.
2. [NÃO CORRIGIDO — registrado como tarefa separada] POST /scraping/insere_vinculos/{co_ibge}
   não popula oci_tb_vinculo apesar do nome — só grava oci_tb_profissionais. Nenhum código do
   repositório escreve em oci_tb_vinculo (confirmado por busca exaustiva). Tabela parece populada
   só por carga legada/manual.

Dados/telas descobertas que viraram conhecimento útil (sugestão — não persistido em
guardian/knowledge/ sem aprovação):
- Tela "Consulta e Cadastro de Agendas" (`Gestão de Agendamentos > Consulta e Cadastro de Agendas`,
  rota `/oci/dashboard/consulta_cadastro_agenda/`) permite criar novas vagas de agenda (Primeira
  Consulta / Exame / Retorno) por linha de cuidado + profissional + intervalo de dias + horário
  por dia da semana. Modal "Cadastrar Nova Agenda" é frágil a manipulação via script no seletor
  de intervalo de datas (react-date-range) — precisa clicar via elemento real (não apenas
  `.click()` sintético) para o estado interno sincronizar corretamente; e os campos do formulário
  resetam ao reabrir o modal (exceto o intervalo de datas, que persiste).
- Tela "Confirmação de Atendimento" tem abas por fase (Consulta Especializada / Exames de Apoio
  Diagnóstico / Consulta de Retorno Especializada) e busca por "ID da Solicitação" (nr_protocolo).
  Botão com `title="Confirmar presença do paciente no agendamento"` abre modal pedindo a chave de
  verificação (input `placeholder="Insira a chave de confirmação"`).
- Exclusão de agenda ("Exames de Apoio Diagnóstico" > lixeira na linha) remove TODOS os horários
  (livres e agendados) daquele profissional, naquela data, para os procedimentos daquele grupo —
  ação irreversível, usar com cautela.

Pendências para próxima sessão:
- Bloqueio Fase2→Fase3 no Sequencial (ainda não testado).
- Modo Integrado do zero.
- Modo Faseado do zero.
- Bloqueio por cota zerada.
```
