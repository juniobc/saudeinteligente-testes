# Fluxos Globais — Knowledge Core

> Fluxos que se aplicam a **todos os módulos** do Saúde Inteligente.
> Carregado automaticamente pelo Guardian em toda tarefa.
> Última atualização: 2025-07-14

---

### login-completo

- **Pré-condições**: Nenhuma (fluxo de entrada do sistema)
- **Rota**: `/login` → `/select-sistemas` → `/sistemas`
- **Passos**:
  1. Navegar para `/login` — aguardar `networkidle`
  2. Verificar visibilidade do combo de município — seletor: `#municipio-select`
  3. Se combo visível, selecionar município — valor: `process.env.E2E_MUNICIPIO || 'go_luziania'`
  4. Preencher campo usuário — seletor: `#signin-username`
  5. Preencher campo senha — seletor: `#signin-password`
  6. Clicar no botão de login — seletor: `button.btn-login`
  7. Aguardar redirecionamento (URL não contém `/login`) — timeout: 20s
- **Resultado esperado**: Usuário autenticado e redirecionado para seleção de grupo/sistema
- **Page Object**: `LoginPage.js`
- **Spec**: `tests/core/core-autenticacao.spec.js`
- **Status**: ✅ validado

### selecao-grupo-pate

- **Pré-condições**: Usuário autenticado, redirecionado para `/select-sistemas`
- **Rota**: `/select-sistemas` → `/sistemas`
- **Passos**:
  1. Aguardar cards de grupo visíveis — timeout: 10s (cards têm animação de ~3s)
  2. Localizar card PATE — seletor: `page.locator('h4', { hasText: /PATE|Especializada/i })`
  3. Clicar no card PATE
  4. Aguardar redirecionamento para `/sistemas` — timeout: 10s
- **Resultado esperado**: Usuário redirecionado para tela de seleção de sistema dentro do grupo PATE
- **Page Object**: —
- **Spec**: `tests/core/core-autenticacao.spec.js`
- **Status**: ✅ validado

### selecao-sistema

- **Pré-condições**: Grupo PATE selecionado, tela `/sistemas` carregada
- **Rota**: `/sistemas` → `/{modulo}/dashboard`
- **Passos**:
  1. Aguardar cards de sistema visíveis — seletor: `.card-link`
  2. Localizar card do módulo desejado — seletor: `.card-link` com `hasText` do nome do módulo (ex: `/Ofertas de Cuidados|OCI/i`)
  3. Clicar no card do módulo
  4. Aguardar navegação para `/{modulo}/` — timeout: 15s
- **Resultado esperado**: Usuário redirecionado para o dashboard do módulo selecionado
- **Page Object**: `MenuSistemasPage.js`
- **Spec**: `tests/core/core-autenticacao.spec.js`
- **Status**: ✅ validado

### navegacao-menu-lateral

- **Pré-condições**: Usuário autenticado e dentro de um módulo
- **Rota**: Variável conforme item do menu
- **Passos**:
  1. Localizar menu lateral do módulo
  2. Clicar no item de menu desejado (ex: "Gestão de OCIs")
  3. Se houver submenu, clicar no subitem (ex: "Consultar ou Cadastrar OCI")
  4. Aguardar carregamento da tela — `networkidle`
- **Resultado esperado**: Tela correspondente ao item de menu é carregada
- **Page Object**: Específico do módulo
- **Spec**: Específico do módulo
- **Status**: ⚠️ parcial — seletores do menu lateral ainda não mapeados globalmente

### logout

- **Pré-condições**: Usuário autenticado em qualquer tela do sistema
- **Rota**: Qualquer rota → `/login`
- **Passos**:
  1. Localizar botão/ícone de logout no header — seletor: a ser mapeado (geralmente ícone de usuário ou botão "Sair")
  2. Clicar no botão de logout
  3. Aguardar redirecionamento para `/login` — timeout: 10s
  4. Verificar que a tela de login está visível — seletor: `#signin-username`
- **Resultado esperado**: Sessão encerrada, usuário redirecionado para tela de login, `storageState` invalidado
- **Page Object**: —
- **Spec**: `tests/core/core-autenticacao.spec.js`
- **Status**: ⚠️ parcial — seletores do botão de logout ainda não mapeados

### auth-global-setup

- **Pré-condições**: Variáveis de ambiente configuradas (`E2E_USERNAME`, `E2E_PASSWORD`, `E2E_MUNICIPIO`, `E2E_BASE_URL`)
- **Rota**: `/login` → `/select-sistemas` → `/sistemas` → `/{modulo}/dashboard`
- **Passos**:
  1. Executar fluxo `login-completo`
  2. Executar fluxo `selecao-grupo-pate`
  3. Executar fluxo `selecao-sistema` (módulo OCI por padrão)
  4. Salvar `storageState` em `.auth/storage-state.json`
- **Resultado esperado**: Arquivo `.auth/storage-state.json` gerado com cookies e storage da sessão autenticada. Todos os specs subsequentes herdam esta sessão.
- **Page Object**: `LoginPage.js`, `MenuSistemasPage.js`
- **Spec**: Executado via `globalSetup` no `playwright.config.js`
- **Status**: ✅ validado
