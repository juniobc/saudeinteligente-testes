# Regras Globais — Knowledge Core

> Regras que se aplicam a **todos os módulos** do Saúde Inteligente.
> Carregado automaticamente pelo Guardian em toda tarefa.
> Última atualização: 2025-07-14

---

### autenticacao-obrigatoria

- **Contexto**: Toda sessão de teste requer autenticação prévia
- **Regra**: O sistema exige login com credenciais válidas (usuário + senha) e seleção de município antes de acessar qualquer módulo. O `global-setup.js` persiste o `storageState` em `.auth/storage-state.json` para reutilização entre specs.
- **Impacto no teste**: Specs que testam o fluxo de login devem usar `test.use({ storageState: undefined })` para desabilitar a sessão salva. Todos os demais specs herdam a sessão autenticada automaticamente via `playwright.config.js`.
- **Validado em**: 2025-07-14

### selecao-municipio-condicional

- **Contexto**: Tela de login (`/login`)
- **Regra**: O combo de seleção de município (`#municipio-select`) pode ou não estar visível dependendo da configuração do tenant. Quando `auto_selected=true`, o município é pré-selecionado e o combo não aparece. Quando visível, o município deve ser selecionado antes de preencher credenciais.
- **Impacto no teste**: Sempre verificar visibilidade do combo antes de tentar interagir: `if (await municipioSelect.isVisible({ timeout: 5000 }).catch(() => false))`. Usar a variável de ambiente `E2E_MUNICIPIO` para o valor.
- **Validado em**: 2025-07-14

### navegacao-por-menu-nunca-por-url

- **Contexto**: Navegação entre telas do sistema após autenticação
- **Regra**: Rotas internas podem mudar sem aviso (ex: `/oci/dashboard/cad_oci` foi substituída por `/oci/dashboard/consulta_cadastro`). A navegação correta é sempre pelo menu lateral do sistema, como um usuário real faria. Nunca usar `page.goto()` com rotas internas diretamente.
- **Impacto no teste**: Page Objects devem implementar navegação via cliques no menu lateral em vez de `goto()` com URL direta. Exceção: `/login` é a única rota que pode ser acessada diretamente.
- **Validado em**: 2025-07-14

### hierarquia-pos-login

- **Contexto**: Fluxo de navegação após login bem-sucedido
- **Regra**: Após o login, o sistema segue uma hierarquia fixa de seleção: (1) Seleção de Grupo — cards com animação de ~3s, selecionar PATE; (2) Seleção de Sistema — cards clicáveis, selecionar o módulo desejado (ex: OCI); (3) Dashboard do módulo. Cada etapa requer aguardar carregamento e redirecionamento.
- **Impacto no teste**: O `global-setup.js` deve percorrer toda a hierarquia. Timeouts generosos são necessários: 20s para redirecionamento pós-login, 10s para cards de grupo, 15s para carregamento do módulo.
- **Validado em**: 2025-07-14

### toasts-react-toastify

- **Contexto**: Notificações visuais em qualquer tela do sistema
- **Regra**: O sistema usa `react-toastify` com `theme="colored"` e `position="top-right"`. Tipos: sucesso (`.Toastify__toast--success`), erro (`.Toastify__toast--error`), info (`.Toastify__toast--info`), warning (`.Toastify__toast--warning`). Toasts aparecem temporariamente e desaparecem após alguns segundos.
- **Impacto no teste**: Usar o helper `waitForToast(page, texto, timeout)` para aguardar toasts. Timeout padrão de 10s. Se o toast não aparecer, aumentar progressivamente (5s → 10s → 15s) antes de reportar falha.
- **Validado em**: 2025-07-14

### componente-react-select

- **Contexto**: Todos os dropdowns/selects customizados do sistema
- **Regra**: O sistema usa `react-select` com `classNamePrefix="Select2"`. A estrutura DOM segue: container com `data-field-name` → `.Select2__control` → `.Select2__value-container` → `.Select2__input-container`. O menu de opções aparece em `.Select2__menu` → `.Select2__menu-list` → `.Select2__option`. Alguns selects são assíncronos (fetchOptions) com debounce de ~300ms.
- **Impacto no teste**: (1) Localizar pelo `data-field-name` no container pai; (2) Clicar em `.Select2__control` para abrir; (3) Digitar via `page.keyboard.type()`; (4) Aguardar e clicar na opção em `.Select2__option`. Para selects assíncronos, aguardar 500ms após digitar antes de buscar opções.
- **Validado em**: 2025-07-14

### componente-form-modal

- **Contexto**: Modais de criação/edição de registros (FormModal)
- **Regra**: Modais usam `react-bootstrap Modal` com formulário `react-hook-form`. Container: `.modal` com título em `.modal-title`. Campos: inputs com `name` (react-hook-form `register`) e selects com `data-field-name`. Validação: erros em `.invalid-feedback`. Submissão: `button[type="submit"]` dentro do modal.
- **Impacto no teste**: Localizar modal por `.modal` com filtro de texto (`hasText`). Aguardar animação de abertura antes de interagir. Verificar erros de validação em `.invalid-feedback` após submissão.
- **Validado em**: 2025-07-14

### componente-simple-modal

- **Contexto**: Modais de confirmação simples (cancelamento, exclusão)
- **Regra**: Modais simples usam `.modal` com texto identificador. Podem conter textarea ou inputs simples. Botões de ação: "Confirmar", "Cancelar" dentro do modal.
- **Impacto no teste**: Localizar por `.modal` com `hasText` do título. Aguardar visibilidade antes de preencher campos e clicar em botões de ação.
- **Validado em**: 2025-07-14

### componente-inputs-mascarados

- **Contexto**: Campos com máscara de entrada (CPF, CNS, CEP, telefone)
- **Regra**: Inputs mascarados usam bibliotecas de máscara que interceptam a digitação. CPF: `000.000.000-00`, CNS: 15 dígitos, CEP: `00000-000`. O preenchimento via `fill()` pode não funcionar corretamente — usar `fillMaskedInput()` do `component-helpers.js` que digita caractere por caractere.
- **Impacto no teste**: Nunca usar `locator.fill()` diretamente em campos mascarados. Usar `fillMaskedInput(page, selector, value)` que limpa o campo e digita via `page.keyboard.type()`.
- **Validado em**: 2025-07-14

### componente-list-table

- **Contexto**: Tabelas de dados com paginação e ações
- **Regra**: Tabelas usam `<table>` com linhas de dados em `tbody tr:not(.expanded-row)`. Paginação via botões com `aria-label`: "Primeira página", "Página anterior", "Próxima página", "Última página". Linhas podem ser expandidas clicando no primeiro `td`. Ações por linha via ícones Remix Icon (`ri-*`).
- **Impacto no teste**: Usar `table tbody tr:not(.expanded-row)` para contar linhas (exclui linhas expandidas). Aguardar `networkidle` após navegar páginas. Ícones de ação: `[class*="ri-close-circle-line"]` (cancelar), `[class*="ri-printer-line"]` (imprimir).
- **Validado em**: 2025-07-14

### prioridade-seletores

- **Contexto**: Localização de elementos no DOM em qualquer tela
- **Regra**: Hierarquia obrigatória de prioridade: (1) `data-field-name` / `data-testid`; (2) `name`; (3) `id`; (4) Role ARIA (`getByRole`); (5) Classes CSS estáveis (`Select2__`); (6) Texto visível (`getByText`) como último recurso. NUNCA usar `:nth-child` como seletor primário. NUNCA usar classes CSS geradas dinamicamente.
- **Impacto no teste**: Ao mapear seletores, sempre buscar na ordem de prioridade. Registrar seletor primário (maior prioridade encontrada) e seletor alternativo (próximo na hierarquia) no `selectors.md`.
- **Validado em**: 2025-07-14

### icones-remix-icon

- **Contexto**: Ícones de ação em botões e tabelas
- **Regra**: O sistema usa a biblioteca Remix Icon com classes no formato `ri-{nome}-{estilo}` (ex: `ri-close-circle-line`, `ri-printer-line`, `ri-search-line`). Ícones são renderizados como `<i>` ou `<span>` dentro de botões.
- **Impacto no teste**: Localizar ícones por `[class*="ri-{nome}"]`. Quando o ícone está dentro de um botão, clicar no elemento pai ou no próprio ícone.
- **Validado em**: 2025-07-14
