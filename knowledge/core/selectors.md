# Seletores Globais — Knowledge Core

> Seletores de componentes comuns a **todos os módulos** do Saúde Inteligente.
> Carregado automaticamente pelo Guardian em toda tarefa.
> Última atualização: 2025-07-14

---

## Login

| Tela | Campo | Tipo | Seletor Primário | Seletor Alternativo | Status |
|------|-------|------|------------------|---------------------|--------|
| Login | Município | select | `#municipio-select` | — | ✅ ativo |
| Login | Usuário | input | `#signin-username` | — | ✅ ativo |
| Login | Senha | input | `#signin-password` | — | ✅ ativo |
| Login | Botão Login | button | `button.btn-login` | `button[type="submit"].btn-login` | ✅ ativo |
| Login | Toast Erro | toast | `.Toastify__toast--error` | `.Toastify__toast` | ✅ ativo |

## Menu de Sistemas

| Tela | Campo | Tipo | Seletor Primário | Seletor Alternativo | Status |
|------|-------|------|------------------|---------------------|--------|
| SeleçãoGrupo | Card PATE | link | `h4` (hasText /PATE\|Especializada/i) | — | ✅ ativo |
| MenuSistemas | Card Sistema | link | `.card-link` (hasText do módulo) | — | ✅ ativo |
| MenuSistemas | Títulos dos Cards | text | `.card-title` | — | ✅ ativo |

## Toasts (react-toastify)

| Tela | Campo | Tipo | Seletor Primário | Seletor Alternativo | Status |
|------|-------|------|------------------|---------------------|--------|
| Global | Toast Genérico | toast | `.Toastify__toast` | — | ✅ ativo |
| Global | Toast Sucesso | toast | `.Toastify__toast--success` | — | ✅ ativo |
| Global | Toast Erro | toast | `.Toastify__toast--error` | — | ✅ ativo |
| Global | Toast Info | toast | `.Toastify__toast--info` | — | ✅ ativo |
| Global | Toast Warning | toast | `.Toastify__toast--warning` | — | ✅ ativo |

## Paginação (ListTable)

| Tela | Campo | Tipo | Seletor Primário | Seletor Alternativo | Status |
|------|-------|------|------------------|---------------------|--------|
| Global | Primeira Página | button | `[aria-label="Primeira página"]` | — | ✅ ativo |
| Global | Página Anterior | button | `[aria-label="Página anterior"]` | — | ✅ ativo |
| Global | Próxima Página | button | `[aria-label="Próxima página"]` | — | ✅ ativo |
| Global | Última Página | button | `[aria-label="Última página"]` | — | ✅ ativo |
| Global | Linhas da Tabela | table | `table tbody tr:not(.expanded-row)` | `table tbody tr` | ✅ ativo |
| Global | Conteúdo Expandido | table | `.expanded-row` | `[class*="expandido"], [class*="PacienteExpandido"]` | ✅ ativo |

## Componentes Comuns (React Select)

| Tela | Campo | Tipo | Seletor Primário | Seletor Alternativo | Status |
|------|-------|------|------------------|---------------------|--------|
| Global | Select Container | select | `[data-field-name="{nome}"]` | — | ✅ ativo |
| Global | Select Control | select | `.Select2__control` | — | ✅ ativo |
| Global | Select Valor | text | `.Select2__single-value` | — | ✅ ativo |
| Global | Select Input | input | `.Select2__input` | — | ✅ ativo |
| Global | Select Menu | menu | `.Select2__menu` | — | ✅ ativo |
| Global | Select Opção | option | `.Select2__option` | — | ✅ ativo |
| Global | Select Opção Selecionada | option | `.Select2__option--is-selected` | — | ✅ ativo |

## Componentes Comuns (Modais)

| Tela | Campo | Tipo | Seletor Primário | Seletor Alternativo | Status |
|------|-------|------|------------------|---------------------|--------|
| Global | Modal Container | modal | `.modal` (hasText do título) | — | ✅ ativo |
| Global | Modal Título | text | `.modal-title` | — | ✅ ativo |
| Global | Modal Botão Salvar | button | `button[type="submit"]` (dentro do modal) | — | ✅ ativo |
| Global | Erros de Validação | text | `.invalid-feedback` | — | ✅ ativo |

## Componentes Comuns (Filtros)

| Tela | Campo | Tipo | Seletor Primário | Seletor Alternativo | Status |
|------|-------|------|------------------|---------------------|--------|
| Global | Botão Buscar | button | `button[type="submit"]` | — | ✅ ativo |
| Global | Filtros Avançados | button | `getByText('Filtros Avançados')` | — | ✅ ativo |
