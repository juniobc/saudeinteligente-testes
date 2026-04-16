# Workflow de Exploração

Este workflow define os passos que o Guardian segue ao explorar uma tela do sistema para mapear seletores, capturar screenshots e construir conhecimento sobre a interface.

## Quando Usar

- Quando o desenvolvedor solicitar exploração de uma tela nova ou desconhecida.
- Quando o Guardian precisar mapear seletores de um módulo ainda não documentado.
- Quando houver suspeita de que os seletores registrados estão desatualizados.

## Ferramentas Utilizadas

- `tools/dom-inspector.js` — Inspeção de DOM e extração de seletores (`inspectPage()`, `extractSelectors()`, `highlightElement()`, `getPageStructure()`)
- `tools/screenshot-helper.js` — Captura padronizada de screenshots (`captureScreenshot()`, `captureElementScreenshot()`)

## Passos do Workflow

### Passo 1 — Receber Instrução

1. Receber do desenvolvedor a instrução de exploração (qual tela, qual módulo, qual objetivo).
2. Confirmar o entendimento: "Vou explorar a tela {X} do módulo {Y}. Está correto?"
3. Aguardar confirmação explícita antes de prosseguir.

### Passo 2 — Consultar Knowledge

1. Carregar `knowledge/core/rules.md`, `knowledge/core/flows.md` e `knowledge/core/selectors.md`.
2. Se o módulo-alvo existir em `knowledge/modules/{modulo}/`, carregar também seus arquivos (`rules.md`, `flows.md`, `selectors.md`, `errors.md`, `lessons.md`).
3. Verificar se já existem seletores mapeados para a tela-alvo.
4. Verificar se existe um fluxo de navegação documentado até a tela-alvo.

### Passo 3 — Navegar até a Tela

1. Utilizar o fluxo de navegação definido na Base de Conhecimento para chegar à tela-alvo.
2. Se não houver fluxo documentado, perguntar ao desenvolvedor: "Como chego até essa tela? Qual menu, qual rota?"
3. Capturar screenshot ao chegar na tela usando `captureScreenshot(page, contexto, 'navegacao-tela-alvo')`.
4. Descrever textualmente o que vê na tela (títulos, campos, botões, tabelas, modais) para confirmar com o desenvolvedor se está na tela correta.

### Passo 4 — Executar Inspeção de DOM

1. Executar `inspectPage(page)` para obter a estrutura geral da página.
2. Executar `extractSelectors(page)` para extrair todos os elementos interativos.
3. Para cada elemento encontrado, usar `highlightElement(page, selector)` para destacar visualmente.
4. Capturar screenshot com elementos destacados.

### Passo 5 — Capturar Screenshots

1. Capturar screenshot da tela completa usando `captureScreenshot(page, modulo, 'exploracao-visao-geral')`.
2. Para modais ou seções relevantes, capturar screenshots específicos com `captureElementScreenshot(page, selector, modulo, descricao)`.
3. Salvar todos os screenshots em `reports/screenshots/` com nomenclatura padronizada `{contexto}-{descricao}-{timestamp}.png`.

### Passo 6 — Apresentar Seletores ao Desenvolvedor

1. Organizar os seletores encontrados em formato de tabela:
   - Tela, Campo, Tipo, Seletor Primário, Seletor Alternativo, Status
2. Apresentar ao desenvolvedor com os screenshots capturados.
3. Perguntar: "Estes são os elementos corretos? Há algum que faltou ou que está errado?"
4. Aguardar aprovação ou correções.

### Passo 7 — Aguardar Aprovação

1. O desenvolvedor pode:
   - **Aprovar** — Prosseguir para o registro.
   - **Corrigir** — Ajustar seletores, nomes ou tipos conforme orientação.
   - **Complementar** — Adicionar elementos que o Guardian não encontrou.
2. Aplicar todas as correções antes de registrar.

### Passo 8 — Registrar em Knowledge

1. Após aprovação explícita, sugerir atualização no `selectors.md` do módulo correspondente.
2. Se novos fluxos de navegação foram descobertos, sugerir atualização no `flows.md`.
3. Se padrões não óbvios foram descobertos (timing, dependências), registrar como Pulo do Gato em `lessons.md`.
4. **Nunca** persistir sem aprovação explícita do desenvolvedor.

## Gatilho de Dúvida — Elementos sem Seletores Estáveis

Durante a inspeção de DOM (Passo 4), se o Guardian encontrar elementos interativos **sem seletores estáveis** (sem `data-field-name`, `data-testid`, `name` ou `id`):

1. **Parar** a exploração do elemento.
2. **Capturar screenshot** do elemento problemático usando `captureElementScreenshot()`.
3. **Reportar ao desenvolvedor** com a seguinte mensagem:
   > "Encontrei o elemento [{descrição}] sem seletor estável. Os únicos identificadores disponíveis são classes CSS dinâmicas ou posição no DOM, que são frágeis para testes.
   > Sugestão: adicionar `data-testid="{nome-sugerido}"` no código-fonte do componente."
4. **Registrar** o elemento como `⚠️ instável` no `selectors.md` com nota sobre a ausência de seletor estável.
5. **Aguardar orientação** do desenvolvedor antes de usar o seletor frágil em testes.

## Tratamento de Divergência — DOM vs Knowledge

Se durante a exploração o Guardian detectar que o DOM real diverge do que está documentado na Base de Conhecimento (ex: campo renomeado, botão removido, nova seção adicionada):

1. **Parar** a exploração.
2. **Capturar screenshots** do estado atual (DOM real) e referenciar o que está documentado (Knowledge).
3. **Reportar a divergência** ao desenvolvedor:
   > "Encontrei divergência entre a Base de Conhecimento e o DOM real:
   > - **Documentado**: {o que está no selectors.md/flows.md}
   > - **Encontrado**: {o que o DOM mostra}
   > Como devo proceder? Atualizo a base de conhecimento?"
4. **Aguardar orientação** antes de atualizar qualquer arquivo de knowledge.
5. Se aprovado, registrar a atualização e marcar o seletor/fluxo antigo como `❌ desatualizado`.

## Notas

- A exploração é sempre **assistida** — o Guardian nunca registra seletores sem aprovação.
- Screenshots capturados durante exploração servem como referência visual para o desenvolvedor e para futuras sessões.
- O workflow de exploração alimenta diretamente o workflow de teste: seletores mapeados aqui são usados na geração de Page Objects e Specs.
- Ao concluir a exploração, considerar se há lições aprendidas que devem ser registradas via workflow de aprendizado (`learn.md`).
