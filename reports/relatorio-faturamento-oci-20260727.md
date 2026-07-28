# Relatório — Faturamento no Módulo OCI: Situação Atual e Caminho de Implementação

> Data: 2026-07-27 (v2 — revisado após VPN religada: banco explorado via Guardian,
> teste ao vivo em Viçosa, microservicoFaturamento descoberto, requisitos do
> ClickUp auditados contra as portarias)
> Autor: Claude Code (Spark)
> Solicitante: desenvolvedor (Sebastião Júnio)

---

## 1. Resumo executivo

A primeira versão desta análise concluiu "não existe faturamento". **Estava
incompleta**: existe um `microservicoFaturamento` real na API (fora do
microservicoOCI, por isso escapou do primeiro grep), com o layout de exportação
APAC do DATASUS modelado campo a campo, query de OCIs faturáveis, valores da
SIGTAP por competência e gravação de remessas — já testado em `br_amapa`
(5 remessas de teste no banco). A SIGTAP está **carregada e atualizada**
(competência 202606, com os 36 procedimentos do Grupo 09) e a tabela de motivos
de saída está semeada **corretamente conforme a norma** (flag `st_oci` nos 7
motivos permitidos).

O que falta não é começar do zero — é **terminar e corrigir**:
as telas do SPA nunca foram ligadas nesse backend (rodam 100% em mock, provado
ao vivo em dois tenants), o número de APAC real nunca é gerado (tabelas de
faixas existem e estão vazias), os procedimentos secundários não são exportados,
o arquivo TXT em si não é gerado, e há divergências com a portaria (detalhadas
na seção 5) — além de hardcodes do DF e um bug que esconde silenciosamente
qualquer paciente sem endereço do faturamento.

## 2. O que existe HOJE — visão consolidada (código + banco + teste ao vivo)

### 2.1 Backend real — `microservicoFaturamento` (o achado principal)

Registrado no `main.py` (`/faturamento/*`), com:

- **`models.py`**: `ApacCabecalho` (registro 01 `#APAC`, campos `cbc_*`) e
  `ApacCorpo` (registro 14, campos `apa_*`) — espelham o **layout posicional
  oficial de exportação APAC do DATASUS** (139 posições + CRLF), coluna a
  coluna, com comentários citando as portarias de origem (637/2005, 719/2007).
  `ApacRemessaFaturamento` controla remessas (competência, CNES, valor,
  `arq_gerado S/N`).
- **`faturamentoOciService.py`** (real, ~34KB):
  - `gera_base_faturamento`: seleciona OCIs faturáveis (critério: `nr_apac IS
    NULL` + Retorno com comparecimento confirmado e chave de verificação) e
    monta os campos do layout (paciente, mãe, nascimento, sexo, raça/cor
    convertida para código, endereço, CNS/CPF, procedimento principal da linha).
  - `busca_valores_procedimento_principal`: valores reais de
    `public.sigtap_tb_procedimento` por `dt_competencia` (grupo 09,
    `vl_sa+vl_sh+vl_sp`).
  - `monta_cabecalho_apac`/`monta_corpo_apac` + `_calcula_smt_vrf` (campo de
    controle [1111..2221]).
  - `gera_faturamento`: persiste cabeçalho + corpos + remessa (transacional).
- **Endpoints**: `POST /faturamento/oci/pesquisa_apac_faturaveis` (real),
  `POST /faturamento/oci` (gera remessa, real), `POST /faturamento/oci/
  pesquisa_remessa` (**retorna mock**), `POST /faturamento/oci/lista_remessa`
  (**quebrado** — chama o service com assinatura errada, sem `db_desv`).
- Testes unitários em `test_faturamento_oci_service.py`.

### 2.2 Banco (explorado via Guardian, VPN ativa)

| Grupo | Tabelas | Estado |
|---|---|---|
| Exportação APAC | `apac_cabecalho`, `apac_corpo`, `apac_remessa_faturamento` | Existem em br_amapa, br_distrito_federal, br_minsaude, go_luziania, mg_vicosa. **br_amapa tem 5 remessas de teste** (5 cabeçalhos, 30 corpos); mg_vicosa zeradas |
| Motivos de saída | `apac_motivos_saida` | **Semeada certa**: 21 motivos com flag `st_oci=true` exatamente nos 7 permitidos pela norma (11, 12, 14, 15, 41, 42, 43) |
| Numeração | `numeracao_aih_apac`, `forma_faturamento_aih_apac`, `oci_tb_numeracao_apac` | Existem em todos os tenants, **todas VAZIAS** — a gestão de faixas nunca foi alimentada |
| SIGTAP | `sigtap_tb_procedimento` + ~40 tabelas `sigtap_*` (CID, compatível, regra condicionada, habilitação...) | **Carregada e atualizada** (até competência 202606; grupo 09 com 36 procedimentos — bate com a norma). Rotina de carga existe (`sigtap_carga`, `sigtap_ultima_carga`). Schemas completos em `public`/`br_minsaude`; subconjunto nos tenants |
| Colunas de faturamento na OCI | `oci_tb_fila_espera_oci`: `nr_apac`, `nu_apac`, `id_motivo_saida`, `dt_conclusao`, `dt_autorizacao`, `dt_validade_apac_inicio/fim`, `nm/nu_cns_autorizador` | Existem. **Em mg_vicosa: 22 OCIs, 8 finalizadas (st_fila=7), NENHUMA com nr_apac/motivo de saída, e `dt_conclusao` NULL em todas** (a finalização não preenche) |

### 2.3 Teste ao vivo (Viçosa, admin, 2026-07-27) — telas mock comprovadas

- **"Geração de APAC"** (menu Sala de Situação → abre como "Monitoramento de
  Linha de Cuidado", `GerAPAC.jsx`): o Painel de Alertas de Prazo mostrou
  **exatamente os mesmos números em Viçosa e no Amapá** (Crítico 2 / Alto 8 /
  Moderado 15 / "de 90 solicitações") — Viçosa só tem 22 OCIs no banco. Tabela
  APAC lista SOL001..., nºs `UFAA.71234567/A` (máscara placeholder). Rede:
  nenhuma chamada além de `/oci/oci/filtros` (só os dropdowns são reais).
- **"Integração SIA"** (menu Gestão de OCIs → tela "Faturamento APAC"):
  pesquisa por competência dispara toast "0 APACs encontradas" **sem nenhuma
  requisição a `/faturamento/*`** — filtro roda sobre array mock no front.
- **Endpoint real testado à mão** (console autenticado, `X-Tenant-ID:
  mg_vicosa`, competência 202607): respondeu, mas "Não há dados" — ver bug do
  endereço na seção 4. Detalhe: o 404 de "sem dados" vaza como HTTP 500 (o
  `except Exception` genérico re-empacota o `HTTPException`).
- Achados de menu em Viçosa: existe também tela/rota "Resultado de Exame com
  CID" e "Transmissões RNDS" no flyout de Gestão das Filas; e o card "Complexo
  Regulador" tem um sistema **"Regulação, Controle e Avaliação"** (não
  explorado nesta sessão — pode ser onde o faturamento geral, além de OCI,
  vai morar; confirmar com o dev).

### 2.4 Inventário de telas — aproveitar vs. lixo

| Tela/arquivo | Veredito sugerido |
|---|---|
| `IntegracaoSIA.jsx` (oci) — "Faturamento APAC" | **Aproveitar** — UX pronta (pesquisa, validação, remessa, espelho); trabalho = trocar mocks pelos endpoints `/faturamento/*` |
| `GerAPAC.jsx` — "Monitoramento de Linha de Cuidado" | **Aproveitar** com decisão: virou tela de monitoramento (ClickUp 86adu5w7q); remover a coluna/nº de APAC (só nasce na remessa) e ligar em dados reais |
| `GeracaoApac.jsx` (rota `/geracao_apac/old`) | **Lixo provável** — versão antiga já substituída; confirmar e apagar rota+arquivo |
| `CadastroVinculosPmae.jsx` (rota `/cadastro_vinc_pmae/old`) | **Lixo provável** — idem |
| `CadVinculoPMAE.jsx` (rota atual) | Decidir: sem backend nenhum (zero referência a PMAE no microservicoOCI); ou especifica e implementa, ou remove do menu até ter backend |
| `GestaoFaixasAIHAPAC.jsx` (sistemas/geral) | **Aproveitar** — front pronto (spec 86advc4uv), zero chamadas de API; precisa do backend de faixas (tabelas já existem, vazias) |
| `APACDocument.jsx` | **Aproveitar** — layout do documento APAC pronto |
| Duplicatas em `sistemas/sisrega/` (IntegracaoSIA, GeracaoApac, GerAPAC) | Código ~duplicado do OCI — decidir se Sisrega fatura pelo mesmo motor ou se remove |
| Relatórios `relacaoApacs`/`relacaoProcTerceiros` (`relatorios_service.py`) | Mock hardcoded — reescrever sobre `apac_corpo`/remessas reais |

## 3. Como DEVE funcionar segundo o Ministério da Saúde (normativa)

Regras operacionais (Manual PMAE lido na íntegra + portarias):

1. **APAC única** (Tipo de APAC = 3), sem continuidade; instrumento de registro
   do procedimento OCI (grupo 09) como **principal**; executados entram como
   **secundários com valor zerado** (regras condicionadas 0009/0011) — valor da
   APAC = valor do principal na SIGTAP.
2. **Nº de autorização com 5º dígito 7** (PMAE ambulatorial/OCI).
3. **Validade fixa de 2 competências** (atributo 054): início = **data de
   realização do 1º procedimento** da OCI (não a data da solicitação!); fim
   dentro de 2 competências; apresentação única no período.
4. **Data de saída obrigatória** = data do último procedimento; **motivos de
   saída** restritos a 1.1/1.2/1.4/1.5/4.1/4.2/4.3.
5. **Mínimo 2 secundários**, um deles obrigatoriamente 0301010072 (consulta) ou
   0301010307 (teleconsulta).
6. Identificação por **CPF** (CNS para indígenas, cf. Art. 11 da SAES
   3.200/2025); caráter **eletivo**; oncologia exige data de diagnóstico + CID
   (atributo 055).
7. OCI **não concluída** → procedimentos realizados vão para **BPA-I** (nunca
   na remessa APAC); secundários com atributo 040 também vão ao SISCAN.
8. Estabelecimento precisa da **habilitação 38.01** no CNES; procedimentos
   programados na **FPO**; financiamento **FAEC pós-fixado** (sem APAC aprovada
   no SIA, não há repasse).
9. **Faixas numéricas**: quem estipula e distribui as faixas especiais no
   SIA/SIH é o **gestor estadual** (Art. 16, SAES 3.200/2025).
10. Horizonte: transição para o **CMD/RNDS** (números de 24 dígitos, Anexos V/VI
    da SAES 3.200/2025) — SIA/SIH continuam válidos até a transição concluir.

## 4. Divergências e bugs do que existe vs. a norma (o que corrigir)

| # | Problema | Onde | Gravidade |
|---|---|---|---|
| 1 | **Nº de APAC não é gerado** — `apa_num` recebe `nr_protocolo.zfill(13)`; comentário `#gerar o numero da apac` pendente; tabelas de faixas vazias e não usadas | `gera_faturamento` / `monta_corpo_apac` | Bloqueante — remessa sairia com número inválido (sem faixa, sem 5º dígito 7, sem DV) |
| 2 | **Procedimentos secundários não existem na exportação** — só cabeçalho+corpo; a norma exige mínimo 2 secundários (com consulta/teleconsulta obrigatória) registrados na APAC | `models.py` (não há entidade de procedimento secundário) | Bloqueante — APAC de OCI sem secundários é rejeitada |
| 3 | **Início de validade errado**: usa 1º dia do mês da **solicitação**; norma manda data de realização do **1º procedimento** | `gera_base_faturamento` (`apa_dtiinval`) | Alta — glosa/inconsistência de validade |
| 4 | **INNER JOIN de endereço esconde pacientes silenciosamente** — todos os 6 faturáveis de mg_vicosa têm `co_endereco NULL` e somem do resultado sem aviso (testado ao vivo: "Não há dados") | `gera_base_faturamento` (JOINs `auxiliares.endereco*`) | Alta — trocar por LEFT JOIN + crítica de pendência ("endereço ausente") |
| 5 | **Filtro de OCI concluída desativado** — `st_fila = 7` está comentado; fatura OCI não finalizada (só exige Retorno confirmado) | `gera_base_faturamento` | Alta — só OCI concluída conforme regras vai à remessa |
| 6 | **Hardcodes do DF**: `apa_coduf="53"`, `apa_munpcnte="5300108"` (Brasília), `apa_cdlogr="076"`, `apa_tipate="05"` | `monta_corpo_apac` | Alta — quebra qualquer tenant fora do DF |
| 7 | **Dados de autorização não aproveitados**: `apa_nomediretor`/`apa_cnsdir` (autorizador), `apa_codsol` (CNES solicitante), `apa_codemis` saem em branco — mas o sistema JÁ captura autorizador/órgão emissor no item 4B | `monta_corpo_apac` | Média |
| 8 | **Motivo de saída default "11"** hardcoded quando null (em vez de bloquear a APAC sem motivo informado); UI de finalização não pede motivo/data de saída (0 OCIs com motivo no banco) | `monta_corpo_apac` + fluxo de finalização | Alta |
| 9 | `dt_conclusao` nunca é preenchida na finalização (NULL nas 8 finalizadas de mg_vicosa) | fluxo `st_fila→7` | Média — é a base da data de saída |
| 10 | `retorna_listagem_apacs` lê `item["nr_apac"]` que a query não seleciona → `KeyError` assim que houver dados | `faturamentoOciService.py:169` | Média — quebra a pesquisa quando o bug 4 for corrigido |
| 11 | Arquivo TXT em si não é gerado/serializado (remessa fica `arq_gerado='N'`; não há writer posicional nem download) | service/rotas | Bloqueante para a entrega final |
| 12 | `lista_remessa` chama service sem `db_desv` (500 garantido); `pesquisa_remessa` retorna mock; 404 "sem dados" vira 500 | `routes.py` | Média |
| 13 | Sem validação de: mínimo 2 secundários c/ consulta obrigatória, CPF presente, oncologia (CID+data diagnóstico), habilitação 38.01, compatibilidades da portaria específica | geral | Alta — é o "pré-flight" que evita glosa |

## 5. Auditoria dos requisitos do ClickUp × portarias (ceticismo aplicado)

| Item da spec (ClickUp) | Veredito |
|---|---|
| Máscara 13 posições `UF AA X sequencial(7) DV` (86advc4uv) | **Confere** com a prática oficial de numeração AIH/APAC |
| 5º dígito 7 = PMAE ambulatorial (OCI) | **Confere** (Manual PMAE, pág. 12) |
| 5º dígito 9 = "DEMAIS COMPONENTES PATE/EMENDAS" | **Impreciso/desatualizado**: pela [SAES 3.200/2025, Art. 14](https://www.lex.com.br/portaria-saes-ms-no-3-200-de-2-de-setembro-de-2025/), APAC 5º dígito **9** = Componente prestação de serviços especializados em caráter complementar (Modalidades 1/2/3) do Agora Tem Especialistas (e AIH = 8). Revisar a tabela da spec antes de implementar |
| DV módulo 11 pesos [2..9,2,3,4] | **Plausível, mas a própria spec pede validação** ("ESSE CÁLCULO PRECISA SER VALIDADO"). A observação de que a faixa já vem com DV pronto reduz o risco — validar contra faixa real do gestor antes de confiar |
| "Faixas completas fornecidas pelo REGNET" | **Não é regra federal** — a norma (Art. 16, SAES 3.200/2025) diz que quem estipula/distribui faixas é o **gestor estadual**. "REGNET" deve ser o sistema local de um estado específico; não assumir como fonte universal para todos os tenants |
| APAC nº só na emissão da remessa, pós-conclusão (86adu5w7q) | **Compatível com a norma** (a APAC é apresentada ao final, única) e decisão de negócio já tomada — o item 4B (nu_apac digitado na autorização) precisa ser reconciliado com isso |
| Integração SIA: validações obrigatórias, BPA-I fallback (86adpkwyf) | **Confere** com o Manual PMAE; os anexos da tarefa incluem o `layout_Exportacao_APAC.pdf` oficial — usar como fonte primária do writer TXT |
| Motivos de saída (7 permitidos) | **Confere** — e o seed `apac_motivos_saida.st_oci` no banco já está exatamente assim |

**Conclusão da auditoria**: as specs estão majoritariamente alinhadas à norma,
com 2 pontos a corrigir/validar (tabela do 5º dígito além do 7, e a origem
"REGNET" das faixas) e 1 lacuna estrutural (nada nas specs sobre o registro de
**procedimentos secundários** na exportação — que a norma exige).

## 6. Recomendação de implementação (revisada)

**Fase 0 — Saneamento (rápido)**
Apagar/arquivar telas `/old`; decidir destino das duplicatas sisrega; corrigir
`lista_remessa`/`pesquisa_remessa` e o 404→500; preencher `dt_conclusao` na
finalização.

**Fase 1 — Completar o motor (`microservicoFaturamento`)**
Corrigir os itens da seção 4: numeração real (alimentar `numeracao_aih_apac`
com faixas do gestor + 5º dígito 7 + DV, backend para a tela GestaoFaixasAIHAPAC),
secundários na exportação (a partir de `oci_tb_agenda` + laudos), início de
validade = 1º procedimento realizado, LEFT JOIN de endereço com críticas,
filtro st_fila=7, des-hardcodear DF (UF/município do tenant/paciente),
aproveitar dados do autorizador, motivo/data de saída obrigatórios na
finalização (UI + backend), writer do arquivo TXT posicional (validar contra
`layout_Exportacao_APAC.pdf` anexado na tarefa 86adpkwyf) + download/espelho.

**Fase 2 — Ligar as telas**
`IntegracaoSIA.jsx` → `/faturamento/oci/*` (pesquisa, validação pré-remessa,
geração, download, espelho); `GerAPAC.jsx` (Monitoramento) → dados reais sem nº
de APAC; `GestaoFaixasAIHAPAC.jsx` → CRUD de faixas.

**Fase 3 — Validações pré-glosa + BPA-I**
Pré-flight da remessa (secundários mínimos, CPF, oncologia, habilitação 38.01,
compatibilidades por OCI conforme portaria específica — as tabelas
`sigtap_rl_*` já estão no banco para isso); fluxo BPA-I para OCIs não
concluídas (tarefas 86adery60/86adery94, hoje vazias, são exatamente essas
duas entregas).

**Fase 4 — Conciliação**
Importar retorno do SIA, conciliar apresentado × aprovado × FPO, alertas de
prazo reais (o painel mock do Monitoramento vira painel real), estender
Monitoramento FPO para além do DF.

**Decisões de negócio pendentes com o dev/gestor:**
1. Fonte real das faixas por tenant (SES de cada estado; "REGNET" só se for o
   caso do tenant específico).
2. Quem informa motivo/data de saída e em qual tela (sugestão: na confirmação
   do Retorno).
3. Item 4B (nu_apac na autorização) — remover/ocultar conforme decisão 86adu5w7q.
4. Sisrega fatura pelo mesmo motor ou não.
5. O sistema "Regulação, Controle e Avaliação" (card Complexo Regulador, visto
   em Viçosa) tem relação com este faturamento? Não explorado.

## 7. Fontes oficiais

- [Manual PMAE — Registro da Produção, Controle e Avaliação (MS, 2024)](https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/guias-e-manuais/2024/manual-pmae-registro-da-producao-controle-e-avaliacao.pdf) — lido na íntegra (29 págs.)
- [Portaria GM/MS nº 3.492/2024](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2024/prt3492_11_04_2024.html) — institui o programa e o Grupo 09
- [Portaria SAES/MS nº 1.640/2024](https://bvsms.saude.gov.br/bvs/saudelegis/Saes/2024/prt1640_08_05_2024.html) — habilitação CNES 38.01
- [Portaria SAES/MS nº 1.821/2024](https://bvsms.saude.gov.br/bvs/saudelegis/Saes/2024/prt1821_12_06_2024.html) / [1.822/2024](https://bvsms.saude.gov.br/bvs/saudelegis/Saes/2024/prt1822_12_06_2024.html) — primeiras OCIs na Tabela
- [Portaria GM/MS nº 7.273/2025](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2025/prt7273_23_06_2025.html) — OCIs Saúde da Mulher (detalhe no [Conass 84/2025](https://www.conass.org.br/conass-informa-n-84-2025-publicada-a-portaria-gm-n-7-273-que-inclui-subgrupo-e-forma-de-organizacao-no-grupo-09-na-estrutura-da-tabela-de-procedimentos-medicamentos-orteses-proteses-e/))
- [Portaria SAES/MS nº 3.200/2025](https://www.lex.com.br/portaria-saes-ms-no-3-200-de-2-de-setembro-de-2025/) — lida na íntegra: numerações especiais (Art. 14: AIH 8/APAC 9 no componente complementar), faixas pelo gestor estadual (Art. 16), CPF obrigatório (Art. 11), CMD 24 dígitos (Anexo V)
- [Conass 55/2026 — SAES 3.958](https://www.conass.org.br/conass-informa-n-55-2026-publicada-portaria-saes-n-3-958-que-altera-atributo-complementar-dos-procedimentos-integrantes-do-componente-ambulatorial-do-programa-agora-tem-especialistas-na-t/) — regras seguem mudando; parametrizar, não hardcodear
- [FAQ PMAE](https://www.cosemssp.org.br/wp-content/uploads/2024/06/FAQ_PMAE.pdf) · [SIGTAP Grupo 09](https://unisus.com.br/sigtap/grupo/09-procedimentos-para-ofertas-de-cuidados-integrados) · [NT DGAE/SES-RS 03/2025](https://saude.rs.gov.br/upload/arquivos/202504/30110703-nota-tecnica-dgae-ses-nba-03-2025-orientacoes-sobre-pmae-oci-e-cc-assinado-assinado-assinado.pdf)

---

*Evidências desta sessão: teste ao vivo em `mg_vicosa` e `br_amapa` (admin),
SELECTs via `guardian/tools/db-query.js`, chamada direta autenticada a
`/faturamento/oci/pesquisa_apac_faturaveis`. Requisitos do ClickUp tratados
como hipótese e auditados contra as portarias (seção 5), conforme orientação
do desenvolvedor.*
