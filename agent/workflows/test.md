# Workflow de Teste

Este workflow define os passos que o Guardian segue ao criar, executar e validar testes E2E. O passo zero — perguntar ao desenvolvedor — é **obrigatório** e precede qualquer ação de implementação.

## Quando Usar

- Quando o desenvolvedor solicitar a criação de um novo teste E2E.
- Quando o desenvolvedor solicitar a execução de testes existentes.
- Quando o Guardian precisar atualizar testes após mudanças no sistema.

## Ferramentas Utilizadas

- `tools/helpers.js` — Funções utilitárias (`waitForToast()`, `waitForTableLoad()`, `interceptNetworkErrors()`, `getStorageToken()`, `generateExecutionReport()`)
- `tools/component-helpers.js` — Interação com componentes React (`selectReactSelectOption()`, `waitForModalOpen()`, `fillMaskedInput()`, etc.)
- `tools/screenshot-helper.js` — Captura de screenshots antes/depois (`captureScreenshot()`, `captureElementScreenshot()`)
- `tools/console-capture.js` — Interceptação de logs do console e rede (`setupConsoleCapture()`)
- `tools/dom-inspector.js` — Re-exploração de DOM em caso de falha (`extractSelectors()`, `highlightElement()`)

## Passos do Workflow

### ⚠️ PASSO ZERO — Perguntar ao Desenvolvedor (OBRIGATÓRIO)

> **Este passo é obrigatório e não pode ser pulado em nenhuma circunstância.**
> O Guardian NUNCA cria ou executa testes sem antes confirmar o fluxo com o desenvolvedor.

1. **Descrever o entendimento** sobre o teste solicitado:
   - Qual módulo? Qual funcionalidade? Qual fluxo?
2. **Perguntar ao desenvolvedor o fluxo correto passo a passo:**
   - Onde o usuário começa? (qual tela, qual menu)
   - O que clica e em que ordem?
   - Quais campos preenche? Com quais valores?
   - O que acontece ao salvar/submeter?
   - Quais regras de negócio existem? (campos obrigatórios, validações, dependências entre campos)
   - Qual o resultado esperado de sucesso? E de erro?
3. **Apresentar o plano de ação:**
   > "Este é o fluxo que vou testar: {descrição}. Há alguma regra de negócio que devo observar?"
4. **Aguardar confirmação explícita** do desenvolvedor antes de prosseguir.
5. **Nunca assumir que testes existentes estão corretos** — eles são rascunhos e podem conter rotas erradas, seletores desatualizados ou fluxos incorretos.

### Passo 1 — Consultar Knowledge

1. Carregar `knowledge/core/` (rules.md, flows.md, selectors.md).
2. Carregar `knowledge/modules/{modulo}/` se existir (rules.md, flows.md, selectors.md, errors.md, lessons.md).
3. Verificar se o fluxo confirmado pelo desenvolvedor já está documentado em `flows.md`.
4. Verificar se os seletores necessários estão mapeados em `selectors.md`.
5. Consultar `errors.md` para erros conhecidos no fluxo.
6. Consultar `lessons.md` para Pulos do Gato relevantes (timings, dependências, padrões não óbvios).

### Passo 2 — Gerar/Atualizar Page Objects e Specs

1. Verificar se já existem Page Objects para as telas envolvidas em `page-objects/`.
2. Se necessário, criar ou atualizar Page Objects seguindo o padrão:
   - Classe ES6 com `export default`
   - Construtor recebe `page` (instância Playwright)
   - Locators como propriedades no construtor
   - Métodos assíncronos para ações
   - JSDoc em pt-BR
3. Criar ou atualizar Spec em `tests/{modulo}/` seguindo o padrão:
   - Arquivo: `{modulo}-{funcionalidade}.spec.js`
   - Describe: `{Funcionalidade} — Módulo {Módulo}`
   - Test: `Req X.Y - {Descrição com contexto do módulo}`
4. Reutilizar helpers de `tools/` e Page Objects existentes — nunca criar código inline nos specs.
5. Adicionar dados de teste em `fixtures/` se necessário — nunca alterar dados existentes.

### Passo 3 — Configurar Captura de Console e Screenshots

1. No `beforeEach` do spec, configurar `setupConsoleCapture(page)` para interceptar logs do console e erros de rede.
2. No `beforeEach`, capturar screenshot do estado inicial: `captureScreenshot(page, contexto, 'antes')`.
3. No `afterEach`, capturar screenshot do estado final: `captureScreenshot(page, contexto, 'depois')`.
4. No `afterEach`, verificar se houve erros de console durante o teste.

### Passo 4 — Executar Testes

1. Executar o spec com Playwright.
2. Monitorar a execução visualmente (modo headed por padrão).
3. Para cada teste:
   - Capturar screenshot antes da ação principal.
   - Executar a ação.
   - Capturar screenshot depois da ação.
   - Verificar logs de console capturados.

### Passo 5 — Validar Resultados

1. Para cada teste executado, verificar:
   - **Asserções passaram?** — O teste fez o que deveria?
   - **Console limpo?** — Houve erros JavaScript ou falhas de API (status >= 400)?
   - **Screenshots consistentes?** — O estado visual antes/depois é o esperado?
2. Se o console registrou erros durante um teste que passou nas asserções, marcar com flag `console_errors: true`.
3. Se houve erro JavaScript ou API 4xx/5xx, acionar Gatilho de Dúvida (parar e perguntar ao desenvolvedor).

### Passo 6 — Ciclo de Auto-Correção (máximo 3 tentativas)

Se um teste falhar, o Guardian tenta corrigir automaticamente antes de reportar ao desenvolvedor:

**Tentativa 1 — Seletor alternativo:**
- Verificar se existe seletor alternativo no `selectors.md`.
- Substituir o seletor que falhou pelo alternativo.
- Re-executar o teste.

**Tentativa 2 — Ajuste de timing:**
- Aumentar timeouts progressivamente (waitForToast: 5s → 10s → 15s).
- Adicionar waits explícitos para animações ou carregamentos.
- Re-executar o teste.

**Tentativa 3 — Re-exploração de DOM:**
- Executar `extractSelectors(page)` para verificar se o DOM mudou.
- Comparar seletores encontrados com os documentados.
- Se houver divergência, reportar ao desenvolvedor.

**Após 3 tentativas sem sucesso:**
- Registrar o erro em `knowledge/modules/{modulo}/errors.md` (como sugestão, aguardando aprovação).
- Capturar screenshot do momento da falha.
- Reportar ao desenvolvedor com: screenshot, mensagem de erro, logs de console, seletores tentados.

### Passo 7 — Reportar Resultados

1. Gerar relatório de execução usando `generateExecutionReport()` em `reports/{data}-execucao.json`.
2. Incluir no relatório:
   - Data/hora da execução e duração total.
   - Total de testes: passou / falhou.
   - Para cada teste: status, duração, screenshots antes/depois, logs de console.
   - Erros encontrados com screenshots e stack traces.
3. Apresentar resumo ao desenvolvedor:
   > "Execução concluída: {X} testes passaram, {Y} falharam. {Detalhes dos falhos}."

### Passo 8 — Sugerir Atualizações em Knowledge

1. Se novos seletores foram descobertos durante a execução, sugerir atualização em `selectors.md`.
2. Se o fluxo foi validado com sucesso, sugerir atualização do status em `flows.md` para `✅ validado`.
3. Se padrões não óbvios foram descobertos (timing, ordem de preenchimento), sugerir registro como Pulo do Gato em `lessons.md`.
4. Se erros foram encontrados e resolvidos, sugerir registro em `errors.md`.
5. **Nunca** persistir atualizações sem aprovação explícita do desenvolvedor.

## Integração com Console Capture

Durante toda a execução dos testes, o `console-capture.js` monitora:

- **`page.on('console')`** — Mensagens de tipo `error`, `warning` e `log`.
- **`page.on('pageerror')`** — Exceções JavaScript não tratadas.
- **`page.on('response')`** — Respostas de API com status >= 400.

### Comportamento ao Detectar Erros

- **Erro JavaScript ou exceção não tratada:** Interromper a tarefa, capturar screenshot, registrar o erro e perguntar ao desenvolvedor como proceder.
- **API retorna 4xx/5xx:** Interromper a tarefa, registrar URL e status, perguntar ao desenvolvedor.
- **Warning no console:** Registrar no relatório mas não interromper a execução.
- **Teste passou mas console tem erros:** Marcar teste com `console_errors: true` no relatório.

## Screenshots Antes/Depois

O Guardian captura screenshots em momentos-chave para análise visual:

| Momento | Tipo | Nomenclatura |
|---------|------|-------------|
| Início do teste | Estado inicial | `{spec}-{teste}-antes-{timestamp}.png` |
| Antes de ação principal | Pré-ação | `{spec}-{teste}-pre-acao-{timestamp}.png` |
| Depois de ação principal | Pós-ação | `{spec}-{teste}-pos-acao-{timestamp}.png` |
| Fim do teste | Estado final | `{spec}-{teste}-depois-{timestamp}.png` |
| Falha detectada | Erro | `{spec}-{teste}-erro-{timestamp}.png` |
| Gatilho de Dúvida | Dúvida | `{spec}-{teste}-duvida-{timestamp}.png` |

Todos os screenshots são salvos em `reports/screenshots/` e referenciados no relatório de execução.

## Notas

- O Passo Zero é a regra mais importante deste workflow — sem confirmação do desenvolvedor, nenhum teste é criado ou executado.
- O ciclo de auto-correção evita interrupções desnecessárias para problemas simples (seletor alternativo, timing).
- Após 3 tentativas de auto-correção, o Guardian sempre reporta ao desenvolvedor — nunca tenta indefinidamente.
- Logs de console capturados são essenciais para detectar bugs invisíveis na interface (erros JS que não afetam a UI visualmente).
- Ao concluir, considerar se há lições aprendidas que devem ser registradas via workflow de aprendizado (`learn.md`).
