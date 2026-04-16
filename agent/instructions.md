# Instruções E2E — Saúde Inteligente

> **Steering file** do Guardian — Agente de Testes E2E.
> Este arquivo é carregado no contexto do LLM sempre que ele trabalha com testes end-to-end.
> Consulte também `knowledge/` para a base de conhecimento incremental do sistema.

---

## 1. Visão Geral do Sistema

O **Saúde Inteligente** é uma plataforma web de gestão em saúde pública composta por múltiplos módulos:

| Módulo | Sigla | Descrição |
|--------|-------|-----------|
| Oferta de Cuidados Integrados | **OCI** | Gestão de solicitações de cuidado especializado (regulação) |
| Atenção Primária à Saúde | **APS** | Acompanhamento de atendimentos na atenção básica |
| Programa de Atenção Especializada | **PATE** | Agrupador de sistemas especializados (OCI, futuros módulos) |

### Stack Tecnológica

| Camada | Tecnologia | Observações |
|--------|-----------|-------------|
| Framework | **React** (Vite) | SPA com roteamento client-side |
| Componentes UI | **react-bootstrap** | Modais (`Modal`), botões, formulários, cards |
| Selects/Dropdowns | **react-select** | Prefixo de classe `Select2__` (classNamePrefix) |
| Formulários | **react-hook-form** | Validação com `.invalid-feedback`, `register`, `handleSubmit` |
| Notificações | **react-toastify** | Toasts em `.Toastify__toast` (success, error, info, warning) |
| Ícones | **Remix Icon** | Classes `ri-*` (ex: `ri-close-circle-line`, `ri-printer-line`) |
| Testes E2E | **Playwright** | Configuração em `playwright.config.js` |

### Arquitetura Frontend

O sistema usa componentes reutilizáveis padronizados:
- **CrudLayout** — layout padrão com título, botão de ação principal e área de conteúdo
- **FormModal** — modal react-bootstrap com formulário react-hook-form integrado
- **ListTable** — tabela com paginação, linhas expandíveis e ações por linha
- **FilterSection** — seção de filtros com formulário de busca e filtros avançados colapsáveis
- **SimpleModal** — modal de confirmação simples com botões de ação
- **ButtonAction** — botão com label e ícone remixicon

---

## 2. Hierarquia de Navegação

O fluxo de navegação do sistema segue uma hierarquia fixa após autenticação:

```
Login (/login)
  │
  ├── Seleção de Município (combo #municipio-select, se auto_selected=false)
  │
  ├── Seleção de Grupo (/select-sistemas)
  │   └── Card PATE ("Atenção Especializada")
  │
  ├── Seleção de Sistema (/sistemas)
  │   └── Card OCI ("Ofertas de Cuidados Integrados")
  │
  └── Módulo OCI (/oci/dashboard)
      ├── Cadastro OCI (/oci/dashboard/cad_oci) — listagem e filtros de solicitações
      └── Cadastro Paciente (/oci/dashboard/cad_paciente) — gestão de pacientes
```

### Rotas Principais

| Rota | Descrição | Page Object |
|------|-----------|-------------|
| `/login` | Página de login com credenciais e seleção de município | `LoginPage.js` |
| `/select-sistemas` | Seleção de grupo (PATE) — cards com animação de 3s | — |
| `/sistemas` | Seleção de sistema (OCI, APS) — cards clicáveis | `MenuSistemasPage.js` |
| `/oci/dashboard` | Dashboard do módulo OCI | — |
| `/oci/dashboard/cad_oci` | Tela principal de solicitações OCI (filtros + tabela) | `CadOCIPage.js` |
| `/oci/dashboard/cad_paciente` | Tela de cadastro de pacientes | — |

### Fluxo de Autenticação Completo

```javascript
// 1. Navegar para /login
await page.goto('/login');

// 2. Selecionar município (se combo visível)
const municipioSelect = page.locator('#municipio-select');
if (await municipioSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
  await municipioSelect.selectOption(process.env.E2E_MUNICIPIO || 'go_luziania');
}

// 3. Preencher credenciais e submeter
await page.locator('#signin-username').fill(username);
await page.locator('#signin-password').fill(password);
await page.locator('button[type="submit"].btn-login').click();

// 4. Aguardar redirecionamento pós-login
await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });

// 5. Selecionar grupo PATE
const cardPATE = page.locator('h4', { hasText: /PATE|Especializada/i });
await cardPATE.waitFor({ state: 'visible', timeout: 10000 });
await cardPATE.click();

// 6. Selecionar sistema OCI
await page.waitForURL(/\/sistemas/, { timeout: 10000 });
const cardOCI = page.locator('.card-link', { hasText: /Ofertas de Cuidados|OCI/i }).first();
await cardOCI.click();

// 7. Aguardar módulo OCI carregar
await page.waitForURL(/\/oci\//, { timeout: 15000 });
```



---

## 3. Convenções de Seletores

Ao localizar elementos no DOM, siga **rigorosamente** esta ordem de prioridade:

| Prioridade | Tipo | Exemplo | Quando usar |
|:----------:|------|---------|-------------|
| 1 | `data-field-name` | `[data-field-name="no_sexo"]` | Campos de formulário com react-select |
| 1 | `data-testid` | `[data-testid="btn-salvar"]` | Elementos com atributo de teste explícito |
| 2 | `name` | `[name="nu_cpf"]` | Inputs HTML nativos (react-hook-form) |
| 3 | `id` | `#signin-username` | Elementos com ID único |
| 4 | Role ARIA | `getByRole('button', { name: /Confirmar/i })` | Botões e elementos interativos sem data-* |
| 5 | Classes CSS estáveis | `.Select2__control`, `.Select2__option` | Componentes react-select (prefixo `Select2__`) |
| 6 | Texto visível | `getByText('Solicitar OCI')` | Último recurso — botões com texto único |

### Regras de Seletores

- **NUNCA** usar seletores baseados em índice de DOM (`:nth-child`) como seletor primário
- **NUNCA** usar classes CSS geradas dinamicamente (hashes, módulos CSS)
- **PREFERIR** `data-field-name` para campos react-select — é o atributo mais estável
- **PREFERIR** `name` para inputs nativos — react-hook-form usa `register('nome_campo')`
- Para **react-select**, o `data-field-name` está no container pai, não no input interno
- Para **modais**, usar `.modal` com filtro de texto: `page.locator('.modal').filter({ hasText: 'Título' })`
- Para **toasts**, usar `.Toastify__toast` com filtro de texto
- Para **ícones de ação**, usar classes `ri-*` do Remix Icon: `[class*="ri-close-circle-line"]`

### Seletores Reais do Sistema (referência rápida)

```javascript
// --- Login ---
page.locator('#signin-username')           // Campo usuário
page.locator('#signin-password')           // Campo senha
page.locator('button.btn-login')           // Botão login
page.locator('#municipio-select')          // Combo município
page.locator('.Toastify__toast--error')    // Toast de erro

// --- Menu de Sistemas ---
page.locator('.card-link', { hasText: /OCI/i })  // Card do sistema OCI
page.locator('.card-title')                       // Títulos dos cards

// --- CadOCI (Filtros) ---
page.locator('[name="co_grupo"]')                 // Filtro especialidade
page.locator('[name="id_linha_cuidado"]')         // Filtro linha de cuidado
page.locator('[name="mun_origem"]')               // Filtro município
page.locator('[name="co_cnes_solicitante"]')      // Filtro unidade solicitante
page.locator('[name="ine"]')                      // Filtro equipe referência
page.locator('[name="st_somente_usuario_logado"]') // Switch minhas solicitações

// --- CadOCI (Tabela e Ações) ---
page.locator('table tbody tr:not(.expanded-row)') // Linhas da tabela
page.locator('[aria-label="Próxima página"]')      // Paginação
page.locator('[aria-label="Página anterior"]')     // Paginação
page.getByText('Solicitar OCI')                    // Botão nova solicitação
page.locator('[class*="ri-close-circle-line"]')    // Ícone cancelar
page.locator('[class*="ri-printer-line"]')         // Ícone imprimir

// --- Modal Especialidades (SimpleModal) ---
page.locator('.modal').filter({ hasText: 'Selecione a Especialidade' })
page.locator('.especialidade-option')              // Cards de especialidade
page.locator('.especialidade-option h6')           // Nomes das especialidades

// --- Modal Nova Solicitação (FormModal) ---
page.locator('.modal').filter({ hasText: 'Nova Solicitação' })
page.locator('[data-field-name="id_linha_cuidado"]')    // Linha de cuidado (Select)
page.locator('[data-field-name="co_pac"]')              // Paciente (Select async)
page.locator('[data-field-name="co_cid"]')              // CID 10 (Select)
page.locator('[data-field-name="nu_cns_solicitante"]')  // Profissional (Select)
page.locator('[data-field-name="co_cnes_solicitante"]') // Unidade (Select)
page.locator('textarea[name="ds_justificativa"]')       // Justificativa (TextArea)

// --- Modal Cadastro Paciente (FormModal) ---
page.locator('.modal').filter({ hasText: 'Novo Usuário Cidadão' })
page.locator('[name="no_pac"]')                    // Nome completo
page.locator('[name="dt_nasc"]')                   // Data nascimento
page.locator('[name="nu_cpf"]')                    // CPF (máscara)
page.locator('[name="nu_cns"]')                    // CNS (máscara)
page.locator('[name="no_mae"]')                    // Nome da mãe
page.locator('[data-field-name="no_sexo"]')        // Sexo (Select)
page.locator('[name="endereco.nr_cep"]')           // CEP (máscara, auto-fill)
page.locator('[data-field-name="endereco.cd_logr"]')    // Logradouro (Select)
page.locator('[data-field-name="endereco.cd_bairro"]')  // Bairro (Select)
page.locator('[data-field-name="endereco.cd_estado"]')  // UF (Select)
page.locator('[data-field-name="endereco.cd_cidade"]')  // Município (Select)

// --- Modal Cancelamento (SimpleModal) ---
page.locator('.modal').filter({ hasText: 'Justificativa do Cancelamento' })
page.locator('#justificativa')                     // Textarea justificativa
```



---

## 4. Padrões de Componentes

### 4.1 React Select (Select2)

O sistema usa `react-select` com `classNamePrefix="Select2"`. Todos os dropdowns seguem este padrão.

**Estrutura DOM:**
```html
<div data-field-name="nome_campo">
  <div class="Select2__control">
    <div class="Select2__value-container">
      <div class="Select2__single-value">Valor selecionado</div>
      <div class="Select2__input-container">
        <input class="Select2__input" />
      </div>
    </div>
    <div class="Select2__indicators">...</div>
  </div>
  <div class="Select2__menu">
    <div class="Select2__menu-list">
      <div class="Select2__option">Opção 1</div>
      <div class="Select2__option Select2__option--is-selected">Opção 2</div>
    </div>
  </div>
</div>
```

**Padrão de interação — Selecionar opção:**
```javascript
// Exemplo real do SolicitacaoModal.js — selecionar linha de cuidado
async selectLinhaCuidado(nome) {
  await this.campoLinhaCuidado.locator('.Select2__control').click();
  await this.page.keyboard.type(nome);
  await this.page.locator('.Select2__option', { hasText: nome }).first().click();
}
```

**Padrão de interação — Ler valor selecionado:**
```javascript
// Exemplo real do CadastroPacienteModal.js — ler valor de Select
const getSelectValue = async (locator) => {
  const singleValue = locator.locator('.Select2__single-value');
  const isVisible = await singleValue.isVisible().catch(() => false);
  if (isVisible) {
    return singleValue.textContent();
  }
  return '';
};
```

**Padrão de interação — Listar opções disponíveis:**
```javascript
// Exemplo real do SolicitacaoModal.js — listar opções de CID
async getCIDsDisponiveis() {
  await this.campoCID.locator('.Select2__control').click();
  await this.page.locator('.Select2__menu').first().waitFor({ state: 'visible', timeout: 5000 });
  const options = this.page.locator('.Select2__menu .Select2__option');
  const textos = await options.allTextContents();
  await this.page.keyboard.press('Escape');
  return textos;
}
```

**Padrão de interação — Autocomplete assíncrono (fetchOptions):**
```javascript
// Exemplo real do SolicitacaoModal.js — busca de paciente com debounce
async searchPaciente(query) {
  await this.campoPaciente.locator('.Select2__control').click();
  await this.page.keyboard.type(query);
  // Aguardar debounce (300ms) e carregamento das opções
  await this.page.waitForTimeout(500);
  await this.page.locator('.Select2__menu').first().waitFor({ state: 'visible', timeout: 10000 });
}
```

### 4.2 FormModal

Modal do react-bootstrap com formulário react-hook-form integrado. Usado para criação/edição de registros.

**Características:**
- Container: `.modal` com título identificável no `.modal-title`
- Formulário: `react-hook-form` com `register` e `handleSubmit`
- Validação: erros renderizados em `.invalid-feedback`
- Submissão: `button[type="submit"]` dentro do modal
- Campos: inputs com `name` e selects com `data-field-name`

**Padrão de interação:**
```javascript
// Verificar se modal está aberto
async isOpen() {
  return this.modal.isVisible();
}

// Submeter formulário
async submit() {
  await this.btnSalvar.click();  // this.modal.locator('button[type="submit"]')
}

// Coletar erros de validação
async getValidationErrors() {
  await this.page.waitForTimeout(300);
  const errors = this.modal.locator('.invalid-feedback');
  const count = await errors.count();
  if (count === 0) return [];
  return errors.allTextContents();
}
```

### 4.3 ListTable

Tabela de dados com paginação, linhas expandíveis e ações por linha.

**Características:**
- Linhas de dados: `table tbody tr:not(.expanded-row)`
- Paginação: botões com `aria-label` ("Primeira página", "Página anterior", "Próxima página", "Última página")
- Expansão: click no primeiro `td` da linha para expandir detalhes
- Ações: ícones Remix Icon na última coluna (`ri-close-circle-line`, `ri-printer-line`)

**Padrão de interação:**
```javascript
// Contar linhas
async getTableRowCount() {
  await this.tableRows.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  return this.tableRows.count();
}

// Expandir linha por índice
async expandRow(index) {
  const row = this.tableRows.nth(index);
  const expandButton = row.locator('td:first-child button, td:first-child i, td:first-child [role="button"]').first();
  await expandButton.click();
}

// Navegar paginação
async goToNextPage() {
  await this.btnProximaPagina.click();  // [aria-label="Próxima página"]
  await this.page.waitForLoadState('networkidle');
}
```

### 4.4 FilterSection

Seção de filtros com formulário de busca e filtros avançados colapsáveis.

**Características:**
- Filtros principais: campos `name` ou `data-field-name` dentro de `<form>`
- Botão buscar: `button[type="submit"]` do formulário
- Filtros avançados: botão "Filtros Avançados" que expande campos adicionais
- Labels: `form label:visible` para identificar filtros visíveis

**Padrão de interação:**
```javascript
// Selecionar filtro (react-select)
async selectEspecialidade(nome) {
  await this.filtroEspecialidade.click();
  await this.page.keyboard.type(nome);
  await this.page.locator('[class*="option"]', { hasText: nome }).first().click();
}

// Submeter busca
async submitSearch() {
  await this.btnBuscar.first().click();
  await this.page.waitForLoadState('networkidle');
}

// Expandir filtros avançados
async expandAdvancedFilters() {
  await this.btnFiltrosAvancados.click();  // page.getByText('Filtros Avançados')
}
```

### 4.5 SimpleModal

Modal de confirmação simples com botões de ação. Usado para cancelamento, exclusão, etc.

**Características:**
- Container: `.modal` com filtro de texto identificador
- Campos: podem conter textarea ou inputs simples
- Botões: "Confirmar", "Cancelar" dentro do modal

**Padrão de interação:**
```javascript
// Modal de cancelamento
this.modalCancelamento = page.locator('.modal').filter({ hasText: 'Justificativa do Cancelamento' });
this.textareaJustificativa = page.locator('#justificativa');
this.btnConfirmarCancelamento = this.modalCancelamento.locator('button', { hasText: 'Confirmar' });

async fillJustificativaCancelamento(text) {
  await this.textareaJustificativa.waitFor({ state: 'visible', timeout: 10000 });
  await this.textareaJustificativa.fill(text);
}

async confirmCancelamento() {
  const confirmBtn = this.modalCancelamento.locator('button').filter({ hasText: /Confirmar/i });
  await confirmBtn.click();
}
```

### 4.6 Toast (react-toastify)

Notificações visuais exibidas no canto superior direito da tela.

**Tipos de toast:**
- Sucesso: `.Toastify__toast--success`
- Erro: `.Toastify__toast--error`
- Info: `.Toastify__toast--info`
- Warning: `.Toastify__toast--warning`
- Genérico: `.Toastify__toast`

**Padrão de interação (usar helper existente):**
```javascript
// Helper existente em tools/helpers.js
import { waitForToast } from '../tools/helpers.js';

// Aguardar toast de sucesso
await waitForToast(page, 'Solicitação criada com sucesso');

// Aguardar toast de erro
await waitForToast(page, 'Erro ao salvar');
```

### 4.7 ButtonAction

Botão com label e ícone Remix Icon. Usado para ações principais e ações por linha na tabela.

**Padrão de interação:**
```javascript
// Botão com texto — usar getByText ou getByRole
this.btnNovaSolicitacao = page.getByText('Solicitar OCI');
this.btnCadastrarNovoPaciente = page.getByRole('button', { name: /Adicionar Cidadão/i });

// Botão com ícone (ações na tabela) — usar classe do ícone
const cancelBtn = row.locator('[class*="ri-close-circle-line"]').first();
const printBtn = row.locator('[class*="ri-printer-line"]').first();
```

### 4.8 CrudLayout

Layout padrão que envolve as telas de CRUD. Contém título, botão de ação principal e área de conteúdo.

**Características:**
- Título da página no header
- Botão de ação principal (ex: "Solicitar OCI") configurável via `newButtonLabel`
- Área de conteúdo com FilterSection + ListTable

**Padrão de navegação:**
```javascript
// Navegar para tela com CrudLayout
async goto() {
  await this.page.goto('/oci/dashboard/cad_oci');
  await this.page.waitForLoadState('networkidle');
}
```



---

## 5. Estrutura de Diretórios

```
saudeinteligente-testes/
├── package.json                          # Dependências (Playwright, dotenv, fast-check)
├── playwright.config.js                  # Configuração do Playwright (baseURL, storageState, projetos)
├── global-setup.js                       # Login automático + navegação até OCI (salva sessão)
├── .env                                  # Variáveis de ambiente (credenciais, URL, município) — gitignored
├── .env.example                          # Template documentado das variáveis de ambiente
├── .gitignore                            # node_modules/, .auth/, .env, reports/, test-results/
│
├── .auth/                                # Estado de autenticação (gerado automaticamente) — gitignored
│   ├── storage-state.json                # Cookies e storage salvos pelo global-setup
│   └── login-debug.png                   # Screenshot de debug se login falhar
│
├── agent/                                # Steering files do Guardian
│   ├── agent.md                          # Identidade + regras globais do Guardian
│   ├── instructions.md                   # ← ESTE ARQUIVO — convenções e padrões do SPA
│   └── workflows/                        # Workflows separados por responsabilidade
│       ├── explore.md                    # Workflow de exploração (DOM, screenshots, seletores)
│       ├── test.md                       # Workflow de teste (passo zero, gerar, executar, validar)
│       └── learn.md                      # Workflow de aprendizado (registrar, sugerir, consolidar)
│
├── knowledge/                            # Base de conhecimento incremental
│   ├── core/                             # Regras globais (sempre carregado)
│   │   ├── rules.md                      # Regras globais do sistema (autenticação, navegação, componentes)
│   │   ├── flows.md                      # Fluxos globais (login, seleção de município, navegação, logout)
│   │   └── selectors.md                  # Seletores de componentes comuns (login, menu, toasts, paginação)
│   └── modules/
│       └── oci/                          # Regras específicas do módulo OCI
│           ├── rules.md                  # Regras de negócio do OCI
│           ├── flows.md                  # Fluxos validados (listagem, solicitação, cadastro, cancelamento)
│           ├── selectors.md              # Dicionário de seletores do módulo OCI
│           ├── errors.md                 # Erros encontrados e resoluções
│           └── lessons.md                # Pulos do Gato — padrões não óbvios
│
├── tools/                                # Scripts Playwright genéricos (ferramentas do Guardian)
│   ├── helpers.js                        # Helpers genéricos (waitForToast, waitForTableLoad, sanitizeFilename, parsing de knowledge)
│   ├── dom-inspector.js                  # Inspeção de DOM (inspectPage, extractSelectors, highlightElement, getPageStructure)
│   ├── screenshot-helper.js              # Captura de screenshots (captureScreenshot, captureElementScreenshot)
│   ├── component-helpers.js              # Interação com componentes React (selectReactSelectOption, waitForModalOpen, fillMaskedInput)
│   └── console-capture.js               # Interceptação de logs do console e rede (setupConsoleCapture)
│
├── page-objects/                         # Page Objects (padrão POM)
│   ├── LoginPage.js                      # Página de login (#signin-username, #signin-password, button.btn-login)
│   ├── MenuSistemasPage.js               # Menu de seleção de sistemas (.card-link, .card-title)
│   ├── CadOCIPage.js                     # Tela principal OCI — filtros, tabela, paginação, ações
│   ├── SolicitacaoModal.js               # Modal de nova solicitação OCI (FormModal com react-select)
│   └── CadastroPacienteModal.js          # Modal de cadastro de paciente (FormModal com inputs mascarados)
│
├── tests/                                # Specs de teste organizados por módulo
│   ├── core/
│   │   └── core-autenticacao.spec.js     # Autenticação e acesso (login válido/inválido, seleção OCI)
│   ├── oci/
│   │   ├── oci-listagem-filtragem.spec.js      # Listagem e filtros (filtros, paginação, minhas solicitações)
│   │   ├── oci-nova-solicitacao.spec.js        # Nova solicitação (modal, formulário, criação completa)
│   │   ├── oci-cadastro-paciente.spec.js       # Cadastro de paciente (modal, CEP auto-fill, validação)
│   │   ├── oci-cancelamento-solicitacao.spec.js # Cancelamento (modal confirmação, justificativa)
│   │   └── oci-detalhes-impressao.spec.js      # Detalhes e impressão (expandir linha, PDF)
│   └── __properties__/                   # Testes de propriedade (fast-check)
│       ├── sanitize.property.test.js     # Propriedade 1: Sanitização de nomes de arquivo
│       ├── selectors.property.test.js    # Propriedade 2: Prioridade de seletores
│       ├── knowledge-parsing.property.test.js  # Propriedade 3: Round-trip de knowledge
│       └── console-capture.property.test.js    # Propriedade 4: Categorização de logs
│
├── fixtures/                             # Dados de teste compartilhados
│   └── test-data.js                      # Credenciais, paciente, solicitação, rotas
│
└── reports/                              # Relatórios de execução — gitignored
    ├── screenshots/                      # Screenshots de execução ({contexto}-{descricao}-{timestamp}.png)
    └── console-logs/                     # Logs de console por execução ({spec}-{timestamp}.json)
```

### Responsabilidades por Arquivo

| Arquivo | Responsabilidade | Quem modifica |
|---------|-----------------|---------------|
| `playwright.config.js` | Configuração global do Playwright | Somente manual (não alterar automaticamente) |
| `global-setup.js` | Autenticação reutilizável pré-suíte | Somente manual |
| `fixtures/test-data.js` | Dados de teste centralizados | Guardian pode adicionar novos exports |
| `tools/helpers.js` | Helpers genéricos e parsing de knowledge | Guardian mantém |
| `tools/dom-inspector.js` | Inspeção de DOM para exploração | Guardian mantém |
| `tools/screenshot-helper.js` | Captura de screenshots padronizada | Guardian mantém |
| `tools/component-helpers.js` | Interação com componentes do sistema | Guardian mantém |
| `tools/console-capture.js` | Interceptação de logs do console e rede | Guardian mantém |
| `page-objects/*.js` | Encapsulamento de seletores e ações | Guardian cria/atualiza |
| `tests/{modulo}/*.spec.js` | Testes E2E executáveis | Guardian cria/atualiza |
| `tests/__properties__/*.test.js` | Testes de propriedade (fast-check) | Guardian mantém |
| `agent/agent.md` | Identidade e regras globais do Guardian | Guardian atualiza quando descobre novos padrões |
| `agent/instructions.md` | Convenções e padrões do SPA (este arquivo) | Guardian atualiza quando descobre novos padrões |
| `agent/workflows/*.md` | Workflows de exploração, teste e aprendizado | Guardian atualiza com aprovação do desenvolvedor |
| `knowledge/core/*.md` | Regras, fluxos e seletores globais | Guardian atualiza com aprovação do desenvolvedor |
| `knowledge/modules/{modulo}/*.md` | Regras, fluxos, seletores, erros e lições do módulo | Guardian atualiza com aprovação do desenvolvedor |



---

## 6. Regras de Geração de Código

### 6.1 Page Objects

**Padrão obrigatório:**
- Classe ES6 com `export default class NomePage`
- Construtor recebe `page` (instância do Playwright)
- Locators definidos como propriedades no construtor (`this.campo = page.locator(...)`)
- Métodos assíncronos para ações (`async nomeAcao()`)
- Pelo menos um método de verificação de estado (`isOpen()`, `isVisible()`, `isClosed()`)
- Documentação JSDoc em pt-BR para classe, construtor e cada método público
- Comentário de cabeçalho com nome do Page Object e módulo

**Exemplo real (baseado em CadastroPacienteModal.js):**
```javascript
// Page Object — Modal de Cadastro de Paciente (Novo Usuário Cidadão)
// Saúde Inteligente — Suíte E2E do módulo OCI

import { expect } from '@playwright/test';

/**
 * Encapsula a interação com o modal de Cadastro de Paciente.
 * O formulário é renderizado dentro de um FormModal (react-bootstrap Modal)
 * com título "Novo Usuário Cidadão" e utiliza react-hook-form.
 *
 * Campos de dados pessoais (FormDadosPessoais.jsx):
 * - nu_cns: Número CNS (Input, mask 15 dígitos, obrigatório)
 * - no_pac: Nome Completo (Input, obrigatório)
 * - dt_nasc: Data de Nascimento (Input type="date", obrigatório)
 * - no_sexo: Sexo (Select, obrigatório)
 * - nu_cpf: CPF (Input, mask 000.000.000-00, obrigatório)
 * - no_mae: Nome da Mãe (Input, obrigatório)
 */
export default class CadastroPacienteModal {
  /**
   * @param {import('playwright').Page} page — instância da página do Playwright
   */
  constructor(page) {
    this.page = page;

    // --- Modal container ---
    this.modal = page.locator('.modal').filter({ hasText: 'Novo Usuário Cidadão' });

    // --- Campos de dados pessoais (Input com atributo name) ---
    this.campoNome = page.locator('[name="no_pac"]');
    this.campoDataNascimento = page.locator('[name="dt_nasc"]');
    this.campoCPF = page.locator('[name="nu_cpf"]');

    // --- Campos de dados pessoais (Select com data-field-name) ---
    this.campoSexo = page.locator('[data-field-name="no_sexo"]');

    // --- Botão de salvar do FormModal ---
    this.btnSalvar = this.modal.locator('button[type="submit"]');

    // --- Mensagens de validação ---
    this.validationErrors = this.modal.locator('.invalid-feedback');
  }

  // ==================== Estado do Modal ====================

  /**
   * Verifica se o modal de cadastro de paciente está visível.
   * @returns {Promise<boolean>} true se o modal está aberto
   */
  async isOpen() {
    return this.modal.isVisible();
  }

  // ==================== Ações ====================

  /**
   * Preenche o campo Nome Completo (no_pac).
   * @param {string} nome — nome completo do paciente
   */
  async fillNome(nome) {
    await this.campoNome.waitFor({ state: 'visible', timeout: 5000 });
    await this.campoNome.fill(nome);
  }

  /**
   * Seleciona o sexo no campo Select (no_sexo).
   * Usa o padrão click + type + selecionar opção do react-select.
   * @param {string} sexo — texto da opção de sexo a selecionar (ex: "Masculino")
   */
  async selectSexo(sexo) {
    await this.campoSexo.locator('.Select2__control').click();
    await this.page.keyboard.type(sexo);
    await this.page.locator('.Select2__option', { hasText: sexo }).first().click();
  }

  // ==================== Submissão ====================

  /** Clica no botão "Salvar" do FormModal para submeter o formulário. */
  async submit() {
    await this.btnSalvar.click();
  }
}
```

### 6.2 Specs de Teste

**Padrão obrigatório:**
- Usar `test.describe()` para agrupar testes relacionados
- Usar `test.beforeEach()` para setup comum (navegação, instanciação de Page Objects)
- Nomes de teste no formato `'Req X.Y - Descrição em pt-BR'`
- Importar Page Objects, helpers e fixtures necessários
- Pelo menos uma asserção `expect()` por bloco `test()`
- Specs que testam login devem usar `test.use({ storageState: undefined })`

**Exemplo real (baseado nos specs existentes):**
```javascript
// Spec — Autenticação e Acesso ao Módulo OCI
// Saúde Inteligente — Suíte E2E

import { test, expect } from '@playwright/test';
import LoginPage from '../page-objects/LoginPage.js';
import MenuSistemasPage from '../page-objects/MenuSistemasPage.js';
import { credentials, routes } from '../fixtures/test-data.js';

// Desabilita storageState para testar login do zero
test.use({ storageState: undefined });

test.describe('Autenticação e Acesso — Módulo Core', () => {
  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('Req 1.1 - Login com credenciais válidas redireciona para seleção de sistemas', async ({ page }) => {
    await loginPage.login(credentials.valid.username, credentials.valid.password);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Req 1.2 - Login com credenciais inválidas exibe toast de erro', async ({ page }) => {
    await loginPage.login(credentials.invalid.username, credentials.invalid.password);
    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toBeTruthy();
  });
});
```

### 6.3 Helpers

**Padrão obrigatório:**
- Export nomeado (`export async function nomeFuncao(...)`)
- Documentação JSDoc em pt-BR com `@param` tipados e `@returns`
- Parâmetro `page` como primeiro argumento quando necessário
- Comentário de cabeçalho com descrição do módulo

**Exemplo real (baseado em helpers.js):**
```javascript
// Funções auxiliares compartilhadas para testes E2E — Saúde Inteligente

import { expect } from '@playwright/test';

/**
 * Aguarda um toast do react-toastify contendo o texto especificado.
 * O projeto usa ToastContainer com theme="colored" e position="top-right".
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @param {string} text - Texto (ou trecho) esperado no toast
 * @param {number} [timeout=10000] - Tempo máximo de espera em ms
 * @returns {Promise<import('@playwright/test').Locator>} Locator do toast encontrado
 */
export async function waitForToast(page, text, timeout = 10000) {
  const toastLocator = page.locator('.Toastify__toast', { hasText: text });
  await expect(toastLocator.first()).toBeVisible({ timeout });
  return toastLocator.first();
}
```

### 6.4 Fixtures

**Padrão obrigatório:**
- Export nomeado em `fixtures/test-data.js`
- Usar getters para variáveis de ambiente (lidas após dotenv carregar)
- Comentários JSDoc em pt-BR
- Não alterar dados existentes ao adicionar novos

**Exemplo real (baseado em test-data.js):**
```javascript
/**
 * Credenciais de autenticação para testes.
 * Usa getters para ler process.env no momento do acesso (após dotenv carregar).
 */
export const credentials = {
  get valid() {
    return {
      username: process.env.E2E_USERNAME || 'usuario_teste',
      password: process.env.E2E_PASSWORD || 'senha_teste',
    };
  },
  invalid: {
    username: 'usuario_inexistente',
    password: 'senha_errada',
  },
};

/** Rotas principais do sistema utilizadas nos testes. */
export const routes = {
  login: '/login',
  menuSistemas: '/sistemas',
  cadOCI: '/oci/dashboard/cad_oci',
  cadPaciente: '/oci/dashboard/cad_paciente',
};
```



---

## 7. Variáveis de Ambiente

As variáveis de ambiente são definidas em `.env` na raiz do projeto e carregadas automaticamente pelo `playwright.config.js` e `global-setup.js` via `dotenv`.

| Variável | Descrição | Valor padrão | Obrigatória |
|----------|-----------|-------------|:-----------:|
| `E2E_BASE_URL` | URL base da aplicação | `http://localhost:5173` | Sim |
| `E2E_USERNAME` | Usuário para autenticação | `usuario_teste` | Sim |
| `E2E_PASSWORD` | Senha para autenticação | `senha_teste` | Sim |
| `E2E_MUNICIPIO` | Tenant/schema do município | `go_luziania` | Sim |
| `E2E_HEADLESS` | Modo headless (sem navegador visível) | `false` | Não |
| `E2E_SLOW_MO` | Delay entre ações em ms (modo visual) | `300` | Não |

### Arquivo `.env` (template)

```dotenv
# Guardian — Variáveis de Ambiente para Testes E2E
# Copie .env.example para .env e preencha com seus valores reais

E2E_BASE_URL=http://localhost:5173
E2E_USERNAME=seu_usuario
E2E_PASSWORD=sua_senha
E2E_MUNICIPIO=go_luziania

# Modo headless — executa sem abrir navegador (para CI/CD)
# Padrão: false (headed — abre navegador para acompanhar visualmente)
E2E_HEADLESS=false

# Delay entre ações em ms (modo visual)
E2E_SLOW_MO=300
```

### Uso no Código

```javascript
// playwright.config.js — carrega .env da raiz do projeto
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(import.meta.dirname, '.env') });

// Acesso às variáveis
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const isHeadless = process.env.E2E_HEADLESS === 'true' ? true : false;
const slowMo = parseInt(process.env.E2E_SLOW_MO || '300', 10);
```

---

## 8. Autenticação Reutilizável

O sistema de autenticação E2E segue o padrão de **storageState** do Playwright, evitando repetir o login em cada teste.

### Fluxo

```
global-setup.js (executa ANTES de todos os specs)
  │
  ├── 1. Lança Chromium
  ├── 2. Navega para /login
  ├── 3. Seleciona município (se combo visível)
  ├── 4. Preenche credenciais (E2E_USERNAME / E2E_PASSWORD)
  ├── 5. Submete login
  ├── 6. Aguarda redirecionamento
  ├── 7. Navega: /select-sistemas → PATE → /sistemas → OCI → /oci/dashboard
  ├── 8. Salva storageState em .auth/storage-state.json
  └── 9. Fecha navegador
```

### Configuração no `playwright.config.js`

```javascript
export default defineConfig({
  // Setup global — autenticação reutilizável
  globalSetup: './global-setup.js',

  use: {
    // Estado de autenticação reutilizável (gerado pelo global-setup)
    storageState: './.auth/storage-state.json',
  },
});
```

### Padrão para Specs Autenticados (maioria)

Specs que precisam de autenticação **não fazem nada especial** — o `storageState` é aplicado automaticamente:

```javascript
// Spec autenticado — usa storageState automaticamente
import { test, expect } from '@playwright/test';
import CadOCIPage from '../page-objects/CadOCIPage.js';

test.describe('Listagem e Filtragem — Módulo OCI', () => {
  test.beforeEach(async ({ page }) => {
    const cadOCI = new CadOCIPage(page);
    await cadOCI.goto();  // Já está autenticado via storageState
  });

  test('Req 2.1 - Filtros visíveis na tela de solicitações OCI', async ({ page }) => {
    // ... teste aqui
  });
});
```

### Padrão para Specs de Login (exceção)

O `core-autenticacao.spec.js` desabilita o `storageState` para testar o fluxo de login do zero:

```javascript
// core-autenticacao.spec.js — desabilita storageState
import { test, expect } from '@playwright/test';
import LoginPage from '../page-objects/LoginPage.js';

test.use({ storageState: undefined });  // ← Desabilita autenticação automática

test.describe('Autenticação e Acesso — Módulo Core', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('Req 1.1 - Login válido redireciona para seleção de sistemas', async ({ page }) => {
    // ... teste de login aqui
  });
});
```

### Helpers de Autenticação Disponíveis

```javascript
// tools/helpers.js — verificar token armazenado
import { getStorageToken } from '../tools/helpers.js';

const token = await getStorageToken(page);
// Retorna o JWT de localStorage.authToken ou sessionStorage.authToken
```



---

## 9. Workflow do Agente

O Guardian segue um ciclo estruturado para cada tarefa E2E. O LLM é o agente — não há runtime separado.

### Ciclo de Trabalho

```
┌─────────────────────────────────────────────────────────────────┐
│  1. RECEBER SOLICITAÇÃO                                         │
│     Desenvolvedor descreve a tarefa em linguagem natural         │
│     Ex: "Criar testes E2E para o fluxo de cadastro de paciente" │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  2. CONSULTAR BASE DE CONHECIMENTO                              │
│     Carregar knowledge/core/ + knowledge/modules/{modulo}/      │
│     - Fluxo já mapeado? → Reutilizar seletores e passos        │
│     - Seletores conhecidos? → Usar sem re-explorar              │
│     - Erros anteriores? → Evitar abordagens que falharam        │
│     - Lições aprendidas? → Aplicar padrões conhecidos           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  3. EXPLORAR (se necessário)                                    │
│     Se o fluxo NÃO está na base de conhecimento:               │
│     a) Navegar até a tela via Playwright                        │
│     b) Executar tools/dom-inspector.js para extrair seletores   │
│     c) Capturar screenshot via tools/screenshot-helper.js       │
│     d) Registrar descobertas na knowledge base (com aprovação)  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  4. GERAR / ATUALIZAR CÓDIGO                                    │
│     a) Criar ou atualizar Page Object (se necessário)           │
│     b) Criar ou atualizar Spec de teste                         │
│     c) Criar ou atualizar Helpers (se padrão repetitivo)        │
│     d) Adicionar dados em fixtures (se necessário)              │
│     Seguir TODAS as regras da seção 6 (Regras de Geração)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  5. VALIDAR                                                     │
│     a) Verificar sintaxe com getDiagnostics                     │
│     b) Executar teste: npx playwright test <spec>               │
│     c) Se falhou → ciclo de auto-correção (seção 10)            │
│     d) Se passou → prosseguir                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  6. ATUALIZAR BASE DE CONHECIMENTO                              │
│     Sugerir atualizações em knowledge/:                         │
│     - Novos seletores descobertos → selectors.md                │
│     - Fluxo mapeado → flows.md                                  │
│     - Erros encontrados → errors.md                             │
│     - Lições aprendidas → lessons.md                            │
│     Aguardar aprovação do desenvolvedor antes de persistir      │
└─────────────────────────────────────────────────────────────────┘
```

### Ferramentas do LLM

O Guardian usa as ferramentas padrão do LLM para executar cada etapa:

| Etapa | Ferramenta | Uso |
|-------|-----------|-----|
| Consultar knowledge | `readFile` | Ler `knowledge/core/` e `knowledge/modules/{modulo}/` |
| Consultar steering | `readFile` | Ler `agent/agent.md` e `agent/instructions.md` |
| Explorar DOM | `executePwsh` | Executar scripts Playwright via `npx playwright test` |
| Ler código existente | `readCode` / `readFile` | Ler Page Objects, specs, helpers existentes |
| Gerar código | `fsWrite` / `fsAppend` | Criar novos arquivos |
| Atualizar código | `strReplace` | Modificar arquivos existentes |
| Validar sintaxe | `getDiagnostics` | Verificar erros de compilação |
| Executar testes | `executePwsh` | `npx playwright test <spec>` |
| Atualizar knowledge | `strReplace` / `fsAppend` | Atualizar arquivos em `knowledge/` (com aprovação) |

### Comandos Playwright Úteis

```bash
# Executar todos os testes (a partir da raiz do projeto saudeinteligente-testes/)
npx playwright test

# Executar spec específico
npx playwright test tests/oci/oci-nova-solicitacao.spec.js

# Executar testes de um módulo
npx playwright test tests/oci/

# Modo headless (sem navegador visível)
E2E_HEADLESS=true npx playwright test

# Com relatório HTML
npx playwright test --reporter=html

# Ver traces de falhas
npx playwright show-trace test-results/<nome>/trace.zip

# Executar testes de propriedade (fast-check, via Node)
npx playwright test tests/__properties__/
```

---

## 10. Auto-Correção

Quando um teste falha, o Guardian segue um ciclo de auto-correção com **máximo de 3 tentativas**.

### Ciclo de Auto-Correção

```
Teste falhou
  │
  ├── Tentativa 1: Correção direta
  │   - Analisar mensagem de erro
  │   - Capturar screenshot do estado atual
  │   - Identificar causa provável:
  │     • Seletor desatualizado → atualizar no Page Object
  │     • Timing (timeout) → adicionar waitFor ou aumentar timeout
  │     • Estado inesperado → verificar pré-condições
  │   - Re-executar teste
  │
  ├── Tentativa 2: Abordagem alternativa
  │   - Usar seletor alternativo (próximo na ordem de prioridade)
  │   - Ajustar estratégia de espera (networkidle, waitForSelector)
  │   - Verificar se há overlay/modal bloqueando interação
  │   - Re-executar teste
  │
  ├── Tentativa 3: Re-exploração completa
  │   - Navegar até a tela e re-inspecionar o DOM
  │   - Extrair novos seletores via tools/dom-inspector.js
  │   - Atualizar Page Object com seletores descobertos
  │   - Re-executar teste
  │
  └── Após 3 falhas: Registrar e reportar
      - Registrar problema detalhado em knowledge/modules/{modulo}/errors.md
      - Incluir: descrição, seletores tentados, screenshots, abordagens tentadas
      - Reportar ao desenvolvedor com sugestões de investigação manual
```

### Registro de Falhas na Base de Conhecimento

Ao encontrar um erro, registrar na seção correspondente do `knowledge/modules/{modulo}/errors.md`:

```markdown
### [2025-01-15] Seletor do botão "Solicitar OCI" desatualizado
- **Descrição**: O botão mudou de texto "Solicitar OCI" para "Nova Solicitação OCI"
- **Seletor que falhou**: `page.getByText('Solicitar OCI')`
- **Abordagem alternativa**: `page.getByText('Nova Solicitação OCI')`
- **Resultado**: resolvido — Page Object atualizado
- **Screenshot**: `reports/screenshots/cad-oci-botao-erro-20250115-143022.png`
```

### Registro de Correções Bem-Sucedidas

Ao corrigir uma falha, registrar em `knowledge/modules/{modulo}/lessons.md`:

```markdown
### [2025-01-15] Botões com texto dinâmico — usar regex
- **Contexto**: Botão "Solicitar OCI" mudou para "Nova Solicitação OCI"
- **Padrão**: Usar regex para textos de botão que podem mudar: `page.getByText(/Solicit/i)`
- **Aplicação**: Todos os botões de ação principal em CrudLayout
```

---

## 11. Modo Visual

O modo visual permite ao desenvolvedor acompanhar em tempo real as ações do Guardian no navegador.

### Ativação

O modo visual é o **padrão** do Guardian. Para desativar (modo headless), configure:

```bash
# Via variável de ambiente no .env
E2E_HEADLESS=true

# Via flag do Playwright na linha de comando
npx playwright test --headed  # Força headed mesmo com E2E_HEADLESS=true
```

### Comportamento no Modo Visual

| Aspecto | Comportamento |
|---------|--------------|
| Navegador | Abre visível na tela (`headless: false`) |
| Velocidade | Reduzida com `slowMo: 300ms` (configurável via `E2E_SLOW_MO`) |
| Highlight | Elementos inspecionados são destacados com borda colorida temporária |
| Console | Descrição de cada passo antes de executar |
| Erro | Pausa execução, captura screenshot, aguarda instrução |

### Highlight de Elementos

No modo visual, o Guardian usa `highlightElement()` do `tools/dom-inspector.js` para destacar elementos:

```javascript
// Exemplo de uso do highlight durante exploração
import { highlightElement } from '../tools/dom-inspector.js';

// Destacar elemento sendo inspecionado (borda vermelha por 2 segundos)
await highlightElement(page, '[data-field-name="co_pac"]', {
  color: 'red',
  duration: 2000,
});
```

### Console Narrativo

No modo visual, o Guardian imprime no console uma descrição de cada passo:

```
[GUARDIAN] Navegando para /oci/dashboard/cad_oci...
[GUARDIAN] Clicando no botão 'Solicitar OCI'...
[GUARDIAN] Aguardando modal de especialidades...
[GUARDIAN] Selecionando especialidade 'Cardiologia'...
[GUARDIAN] Preenchendo campo 'Linha de Cuidado'...
[GUARDIAN] ✅ Solicitação criada com sucesso
```



---

## Referência Rápida — Helpers Disponíveis

### Helpers Genéricos (`tools/helpers.js`)

| Função | Descrição | Uso |
|--------|-----------|-----|
| `waitForToast(page, text, timeout?)` | Aguarda toast do react-toastify com texto | Validar feedback de ações |
| `waitForTableLoad(page, timeout?)` | Aguarda tabela ter pelo menos uma linha | Após filtros ou navegação |
| `interceptNetworkErrors(page)` | Captura erros 5xx da rede | Diagnóstico de falhas de backend |
| `getStorageToken(page)` | Retorna JWT do localStorage/sessionStorage | Verificar autenticação |
| `sanitizeFilename(input)` | Sanitiza string para nome de arquivo seguro | Nomenclatura de screenshots e relatórios |
| `parseSelectorsTable(markdown)` | Parseia tabela de seletores de knowledge | Leitura de selectors.md |
| `formatSelectorsTable(entries)` | Formata entradas como tabela markdown | Escrita de selectors.md |
| `parseFlowBlock(markdown)` | Parseia bloco de fluxo de knowledge | Leitura de flows.md |
| `formatFlowBlock(flow)` | Formata fluxo como bloco markdown | Escrita de flows.md |
| `generateExecutionReport(testResults, consoleLogs)` | Gera relatório JSON de execução | Relatórios em reports/ |

### Inspeção de DOM (`tools/dom-inspector.js`)

| Função | Descrição | Uso |
|--------|-----------|-----|
| `inspectPage(page, options?)` | Varre DOM e retorna elementos interativos | Exploração de telas |
| `extractSelectors(page, element)` | Extrai seletores na ordem de prioridade | Descoberta de seletores |
| `highlightElement(page, selector, options?)` | Destaca elemento visualmente | Modo visual |
| `getPageStructure(page)` | Retorna estrutura simplificada da página | Entender layout |

### Captura de Screenshots (`tools/screenshot-helper.js`)

| Função | Descrição | Uso |
|--------|-----------|-----|
| `captureScreenshot(page, context, description)` | Captura screenshot full-page padronizado | Documentar telas |
| `captureElementScreenshot(page, selector, context, description)` | Captura screenshot de elemento | Documentar componentes |

### Interação com Componentes (`tools/component-helpers.js`)

| Função | Descrição | Uso |
|--------|-----------|-----|
| `selectReactSelectOption(page, fieldName, optionText)` | Seleciona opção em react-select | Interação com Select2 |
| `getReactSelectValue(locator)` | Lê valor selecionado | Verificação de estado |
| `waitForModalOpen(page, titleText)` | Aguarda modal abrir | Interação com modais |
| `waitForModalClose(page, titleText)` | Aguarda modal fechar | Verificação pós-ação |
| `fillMaskedInput(page, selector, value)` | Preenche input com máscara | CPF, CEP, CNS |
| `getFormValidationErrors(modalLocator)` | Coleta erros de validação | Verificar formulários |

### Interceptação de Console (`tools/console-capture.js`)

| Função | Descrição | Uso |
|--------|-----------|-----|
| `setupConsoleCapture(page)` | Configura interceptação de console e rede | Início de cada teste |
| `categorizeLogEntry(entry)` | Categoriza entrada de log por tipo | Classificação de logs |
| `isNetworkError(response)` | Verifica se resposta é erro de rede (>= 400) | Detecção de falhas de API |

---

## Referência Rápida — Page Objects Existentes

| Page Object | Arquivo | Tela/Modal | Seletores Principais |
|-------------|---------|-----------|---------------------|
| `LoginPage` | `page-objects/LoginPage.js` | `/login` | `#signin-username`, `#signin-password`, `button.btn-login`, `#municipio-select` |
| `MenuSistemasPage` | `page-objects/MenuSistemasPage.js` | `/sistemas` | `.card-link`, `.card-title` |
| `CadOCIPage` | `page-objects/CadOCIPage.js` | `/oci/dashboard/cad_oci` | `[name="co_grupo"]`, `table tbody tr`, `[aria-label="Próxima página"]`, `getByText('Solicitar OCI')` |
| `SolicitacaoModal` | `page-objects/SolicitacaoModal.js` | Modal "Nova Solicitação" | `[data-field-name="id_linha_cuidado"]`, `[data-field-name="co_pac"]`, `textarea[name="ds_justificativa"]` |
| `CadastroPacienteModal` | `page-objects/CadastroPacienteModal.js` | Modal "Novo Usuário Cidadão" | `[name="no_pac"]`, `[name="nu_cpf"]`, `[data-field-name="no_sexo"]`, `[name="endereco.nr_cep"]` |

---

## Referência Rápida — Specs Existentes

| Spec | Arquivo | Requisito | Testes |
|------|---------|-----------|--------|
| Autenticação e Acesso | `tests/core/core-autenticacao.spec.js` | Req 1 | Login válido, login inválido, acesso sem auth, seleção OCI |
| Listagem e Filtragem | `tests/oci/oci-listagem-filtragem.spec.js` | Req 2 | Filtros visíveis, filtro especialidade, minhas solicitações, paginação, filtros avançados |
| Nova Solicitação | `tests/oci/oci-nova-solicitacao.spec.js` | Req 3 | Modal especialidades, formulário, criação completa, validação, autocomplete, CIDs |
| Cadastro de Paciente | `tests/oci/oci-cadastro-paciente.spec.js` | Req 4 | Abertura modal, cadastro completo, auto-preenchimento CEP, validação |
| Cancelamento | `tests/oci/oci-cancelamento-solicitacao.spec.js` | Req 5 | Modal confirmação, cancelamento com justificativa, validação sem justificativa |
| Detalhes e Impressão | `tests/oci/oci-detalhes-impressao.spec.js` | Req 6 | Expandir detalhes, impressão de comprovante PDF |
