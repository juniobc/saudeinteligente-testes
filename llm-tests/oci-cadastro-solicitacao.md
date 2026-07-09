---
titulo: Nova Solicitação OCI — Teste Guiado por LLM
modulo: OCI
status: piloto — método experimental, ainda não substitui os specs Playwright de guardian/tests/
ultima_atualizacao: 2026-07-08
---

# Como usar este arquivo

Este arquivo **não é código** — é um roteiro em linguagem natural para um agente LLM
com acesso a uma ferramenta de browser (ex.: as tools `preview_*` do Claude Code)
executar o teste **navegando de verdade pela tela**, como um usuário faria, em vez
de rodar um script Playwright.

Você (o agente executando este teste) deve:

1. Ler este arquivo inteiro antes de começar.
2. Executar os passos **na ordem**, um de cada vez.
3. Depois de cada ação, **observar o resultado real** (snapshot/screenshot/console)
   antes de decidir o próximo passo — não assuma que funcionou.
4. Se algo na tela não bater com o que este arquivo descreve (elemento não existe,
   texto diferente, comportamento inesperado, erro no console, toast vermelho),
   **pare, registre o que encontrou e reporte ao desenvolvedor** em vez de improvisar
   uma solução. Não é uma falha do teste tentar se adaptar — é sinal de que este
   roteiro pode estar desatualizado e precisa ser corrigido por um humano.
5. Ao final, produza o **Relatório de Execução** no formato da seção correspondente
   deste arquivo.

## Regras que você deve seguir (herdadas do Guardian)

- **Selecione a unidade de trabalho ativa antes de criar qualquer solicitação.**
  O header tem até 2 combos: Município e Unidade (ex: "Macapá (3 unidades)" →
  "3523845 - ADACHI OFTALM..."). Se o usuário tiver mais de uma lotação, esses
  combos podem vir vazios ("Selecione um município") mesmo após o login. Sem
  isso selecionado, o campo "Unidade Responsável" do formulário de Nova
  Solicitação fica vazio/travado e **não é um bug** — é só um passo de fluxo
  não óbvio. Ver `guardian/llm-tests/MEMORIA-SESSOES.md` para o caso completo
  que motivou esta regra.
- **Nunca navegue digitando rotas/URLs diretamente** (nunca `page.goto('/oci/...')`
  nem editar a URL da aba manualmente). O sistema muda rotas internas sem aviso —
  a navegação correta é sempre clicando em menus/botões/links, como um usuário real.
  A única exceção é a URL inicial de login.
- Nunca considere um passo "provavelmente funcionou" sem confirmar visualmente
  (snapshot ou screenshot) — isso é o ponto central de testar via browser real.
- Se você tiver que adivinhar um seletor ou texto porque o roteiro está impreciso,
  isso é um Gatilho de Dúvida: pare e pergunte, não adivinhe silenciosamente.
- Todo o relatório final deve estar em pt-BR.

---

## Pré-requisitos

1. **SPA rodando localmente** em modo OCI. Se não estiver rodando, inicie com a
   tool de preview do harness usando o comando `npm run dev:oci` dentro de
   `saudeinteligente-spa/` (porta padrão do Vite: `5173`).
2. **Backend rodando localmente**. A SPA em modo OCI espera a API em
   `http://localhost:8002` (ver `saudeinteligente-spa/.env.oci_development`,
   variável `VITE_API_BASE_HOST`). Se as chamadas de API falharem com
   "Network Error" no console, a API provavelmente não está no ar — suba com
   `uvicorn main:app --reload --port 8002` a partir do venv em
   `saudeinteligente-api/` (ver `saudeinteligente-api/README.md`). Isso não é
   um bug do teste, é um pré-requisito de ambiente.
3. **Credenciais de teste**: leia o arquivo `guardian/.env` (não versionado) para
   obter `E2E_USERNAME`, `E2E_PASSWORD` e `E2E_MUNICIPIO`. Nunca escreva os valores
   reais neste arquivo markdown nem no relatório final — apenas use-os para
   preencher os campos de login.

## Etapa 0 — Investigar dados de teste válidos no banco (antes de abrir o browser)

**Não assuma dados de teste fixos.** Cada tenant/schema (`E2E_MUNICIPIO`) tem uma
base diferente, e o que existe hoje pode não existir amanhã (dados de homologação
mudam). Antes de navegar, consulte o banco com `guardian/tools/db-query.js`
(somente leitura, credenciais já em `guardian/.env`) para descobrir, **no schema
do tenant que você vai usar**, quais unidades realmente têm dado suficiente para
o teste passar:

1. Unidades **solicitantes** (`cnes_base_estabelecimentos.st_solicitante = true`)
   que também tenham **profissionais vinculados** (`JOIN oci_tb_vinculo` pelo
   `co_cnes`) — sem isso, o campo "Profissional Solicitante" fica vazio no
   formulário (Gatilho de Dúvida garantido, não vale a pena descobrir isso só na
   UI). Prefira a unidade com mais profissionais vinculados.
2. Se o fluxo que você for testar também precisar de unidade **executante**
   (`st_executante = true`) ou **reguladora** (`st_regulador = true`), levante
   essas também antes de começar.
3. Guarde os resultados (CNES + nome) para usar nas Etapas 6+ — não hardcode um
   CNES específico neste arquivo, porque ele pode não existir no ambiente onde
   o teste está rodando agora. Descubra a cada execução.

Isso é investigação, não é alteração de dado — nunca rode INSERT/UPDATE/DELETE.
Se a query não encontrar nenhuma unidade solicitante com profissionais em
nenhum schema plausível, isso é um Gatilho de Dúvida — pare e reporte ao
desenvolvedor em vez de seguir para o browser sem dados viáveis.

Exemplo de query (ajuste o schema para o tenant em uso — `dbQuery(sql, params, schema)`):

```sql
SELECT c.co_cnes, c.no_fantasia, COUNT(v.co_profs) AS qtd_profissionais
FROM cnes_base_estabelecimentos c
JOIN oci_tb_vinculo v ON v.co_cnes = c.co_cnes
WHERE c.st_solicitante = true
GROUP BY c.co_cnes, c.no_fantasia
HAVING COUNT(v.co_profs) > 0
ORDER BY qtd_profissionais DESC
LIMIT 10;
```

---

## Passo a passo

### Etapa 1 — Login

1. Abra a URL de login (`/login`) — esta é a única navegação direta por URL permitida.
2. Tire um snapshot da página. Verifique se existe o combo `#municipio-select`.
   - Se visível, selecione o valor de `E2E_MUNICIPIO`.
   - Se não visível, siga adiante (município já pré-selecionado pelo tenant).
3. Preencha usuário (`#signin-username`) e senha (`#signin-password`) com as
   credenciais de `guardian/.env`.
4. Clique no botão de login (`button.btn-login`).
5. Aguarde a URL sair de `/login`. Se não sair em ~20s, ou se aparecer um
   `.Toastify__toast--error`, é um Gatilho de Dúvida — pare e reporte.

**Resultado esperado:** redirecionado para a tela de seleção de grupo.

### Etapa 2 — Seleção de Grupo (PATE)

1. Tire um snapshot. Deve haver um card com texto contendo "PATE" ou "Especializada".
2. Clique nesse card.
3. Aguarde a navegação para a tela de seleção de sistemas.

**Resultado esperado:** tela com cards de sistemas (ex: OCI, APS).

### Etapa 3 — Seleção de Sistema OCI

1. Tire um snapshot. Localize o card com texto contendo "OCI" ou "Ofertas de
   Cuidados Integrados".
2. Clique nesse card.
3. Aguarde o carregamento do dashboard do módulo OCI.

**Resultado esperado:** dashboard do OCI carregado, com menu lateral visível.

### Etapa 4 — Navegar até a tela de Cadastro de OCI (via menu, nunca por URL)

1. No menu lateral, localize o item "Gestão de OCIs" (ou equivalente).
2. Clique nele. Se abrir um submenu, clique no subitem "Consultar ou Cadastrar OCI".
3. Aguarde o carregamento da tela.

**Resultado esperado:** tela de listagem/filtros de solicitações OCI, com um
botão de ação para criar nova solicitação (texto pode variar: "Solicitar OCI",
"Nova Solicitação OCI" etc. — procure o botão de ação principal da tela, não
assuma o texto exato).

> Se o item "Gestão de OCIs" não existir no menu com esse nome exato, isso é um
> Gatilho de Dúvida — tire um screenshot do menu completo e pergunte ao
> desenvolvedor antes de adivinhar qual item clicar.

### Etapa 5 — Abrir modal de seleção de especialidade

1. Clique no botão de ação principal identificado na Etapa 4.
2. Tire um snapshot. Deve abrir um modal pedindo para escolher a especialidade.
3. Selecione qualquer especialidade disponível (não há uma "certa" — o objetivo
   é validar o fluxo).

**Resultado esperado:** modal "Nova Solicitação" é aberto após escolher a
especialidade.

### Etapa 6 — Preencher o formulário de Nova Solicitação

Dentro do modal (escope todos os seletores ao modal, não à página inteira —
pode haver campos com o mesmo nome atrás do modal):

1. **Unidade Responsável** — pode ser um `<select>` HTML nativo (preencha com
   `preview_fill` direto, não clique+digite) ou um react-select, dependendo da
   tela — inspecione o DOM antes de assumir. Fica **desabilitado** para
   usuários sem `st_administrador`/`st_regulador`, populado só pela unidade
   selecionada no combo do header (ver regra geral acima). Se vier vazio
   mesmo após configurar a unidade no header, troque-a pela unidade validada
   na Etapa 0.
2. **Linha de Cuidado** — campo react-select. Abra e escolha qualquer opção
   disponível (a lista depende da especialidade escolhida na Etapa 5).
3. **Cidadão Usuário** — campo react-select assíncrono. Clique, digite ao menos
   3 caracteres de um nome comum (ex: "Maria"), aguarde o carregamento
   (autocomplete com debounce, pode levar até alguns segundos) e selecione o
   primeiro resultado.
4. **Profissional Solicitante** — campo react-select, populado a partir da
   unidade escolhida no passo 1. Selecione qualquer opção disponível. Se
   aparecer "Nenhuma opção encontrada" mesmo tendo escolhido uma unidade
   validada na Etapa 0, é um Gatilho de Dúvida de verdade (divergência entre
   banco e API) — não é mais "dado ausente esperado".
5. **CID 10** — campo react-select. Escolha qualquer opção disponível.
6. **Justificativa** — campo de texto livre. Preencha com um texto plausível,
   ex: "Paciente encaminhado para avaliação especializada — teste guiado por LLM."

Depois de cada campo preenchido, tire um snapshot rápido para confirmar que o
valor foi realmente selecionado (não só que o menu abriu) antes de seguir para
o próximo campo.

### Etapa 7 — Salvar

1. Clique no botão de submissão do modal (geralmente "Salvar" ou o botão
   `type="submit"` dentro do `.modal`).
2. Observe:
   - Um toast de sucesso (`.Toastify__toast--success`) deve aparecer.
   - O modal deve fechar.
   - Mensagens de erro de validação (`.invalid-feedback`) NÃO devem aparecer.
3. Verifique o console do navegador (`preview_console_logs`) e a aba de rede
   (`preview_network`) — não deve haver erros 4xx/5xx relacionados à submissão.

**Resultado esperado:** solicitação criada com sucesso, toast de confirmação
visível, modal fechado, sem erros no console/rede.

### Etapa 8 — Confirmar na listagem

1. Após o modal fechar, tire um snapshot da tela de listagem.
2. Verifique se uma nova linha correspondente à solicitação recém-criada
   aparece na tabela (pode ser necessário aguardar recarregamento da lista).

**Resultado esperado:** a nova solicitação está visível na listagem.

---

## O que fazer em caso de falha

Se qualquer etapa falhar (elemento não encontrado, erro no console, resultado
divergente do esperado):

1. Pare imediatamente — não tente "pular" a etapa e continuar.
2. Tire um screenshot do estado atual da tela.
3. Capture os logs de console e de rede relevantes.
4. Descreva no relatório: em qual etapa falhou, o que era esperado, o que
   aconteceu de fato, e evidências (screenshot/logs).
5. Não corrija código nem tente uma segunda abordagem sozinho — isso é decisão
   do desenvolvedor, igual à Regra Zero do Guardian.

---

## Relatório de Execução (preencher ao final)

```
Data/hora da execução: <preencher>
Ambiente: <URL base usada>
Município/tenant: <preencher>

Resultado geral: PASSOU / FALHOU / PARCIAL

Etapas executadas:
1. Login .......................... OK / FALHOU — <observação>
2. Seleção de Grupo PATE .......... OK / FALHOU — <observação>
3. Seleção de Sistema OCI ......... OK / FALHOU — <observação>
4. Navegação até Cadastro OCI ..... OK / FALHOU — <observação>
5. Modal de Especialidade ......... OK / FALHOU — <observação>
6. Preenchimento do Formulário .... OK / FALHOU — <observação>
7. Salvar / Toast de Sucesso ...... OK / FALHOU — <observação>
8. Confirmação na Listagem ........ OK / FALHOU — <observação>

Erros de console/rede encontrados: <listar ou "nenhum">
Screenshots capturados: <listar caminhos/descrições>

Divergências do roteiro (sugestões de atualização deste arquivo):
<preencher se algo neste markdown estava desatualizado>
```
