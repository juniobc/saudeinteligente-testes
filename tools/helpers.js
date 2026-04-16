// Funções utilitárias compartilhadas para testes E2E — Guardian
// Utilizadas por todos os specs para operações comuns (toasts, tabela, rede, auth, sanitização, relatórios)

import { expect } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Sanitiza uma string para uso como nome de arquivo ou parte de caminho.
 * Produz saída contendo apenas caracteres alfanuméricos minúsculos e hífens.
 *
 * Regras:
 * - Converte para minúsculas
 * - Remove acentos e diacríticos (normalização NFD)
 * - Substitui espaços e caracteres não-alfanuméricos por hífen
 * - Colapsa hífens consecutivos em um único hífen
 * - Remove hífens no início e no fim
 * - Retorna 'sem-nome' se o resultado for vazio
 *
 * @param {string} input - String de entrada (pode conter Unicode, espaços, caracteres especiais)
 * @returns {string} Nome sanitizado contendo apenas [a-z0-9-], nunca vazio
 */
export function sanitizeFilename(input) {
  if (typeof input !== 'string') {
    return 'sem-nome';
  }

  const sanitized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return sanitized || 'sem-nome';
}

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

/**
 * Aguarda o carregamento da tabela de resultados na página.
 * Espera que o elemento <tbody> contenha pelo menos uma linha (<tr>) visível,
 * indicando que os dados foram carregados com sucesso.
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @param {number} [timeout=15000] - Tempo máximo de espera em ms
 */
export async function waitForTableLoad(page, timeout = 15000) {
  const firstRow = page.locator('tbody tr').first();
  await expect(firstRow).toBeVisible({ timeout });
}

/**
 * Registra um listener para interceptar erros de servidor (5xx) nas respostas de rede.
 * Loga no console do Node os detalhes de cada resposta com status >= 500.
 * Útil para diagnosticar falhas de backend durante a execução dos testes.
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @returns {string[]} Array mutável que acumula as URLs com erro 5xx
 */
export function interceptNetworkErrors(page) {
  const errors = [];

  page.on('response', (response) => {
    if (response.status() >= 500) {
      const entry = `[ERRO 5xx] ${response.status()} — ${response.url()}`;
      console.error(entry);
      errors.push(entry);
    }
  });

  return errors;
}

/**
 * Retorna o token de autenticação armazenado no navegador.
 * O projeto salva o token como 'authToken' em localStorage ou sessionStorage.
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @returns {Promise<string|null>} Token JWT ou null se não encontrado
 */
export async function getStorageToken(page) {
  const token = await page.evaluate(() => {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  });
  return token;
}

// ---------------------------------------------------------------------------
// Funções de parsing de knowledge — round-trip markdown ↔ objetos JS
// Utilizadas para ler e escrever selectors.md e flows.md programaticamente
// ---------------------------------------------------------------------------

/**
 * Faz o parse de uma tabela markdown de seletores (formato `selectors.md`).
 *
 * Espera colunas: Tela | Campo | Tipo | Seletor Primário | Seletor Alternativo | Status
 * Remove backticks dos seletores e converte "—" em string vazia.
 * Pula a linha de cabeçalho e a linha separadora (`|---|`).
 *
 * @param {string} markdown - String markdown contendo uma ou mais tabelas de seletores
 * @returns {Array<{tela: string, campo: string, tipo: string, seletorPrimario: string, seletorAlternativo: string, status: string}>}
 */
export function parseSelectorsTable(markdown) {
  if (typeof markdown !== 'string') return [];

  const lines = markdown.split('\n');
  const entries = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Pular linhas que não são linhas de tabela
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;

    // Pular linha separadora (ex: |---|---|---|)
    if (/^\|[\s-:|]+\|$/.test(trimmed)) continue;

    const cells = trimmed
      .slice(1, -1) // remove | inicial e final
      .split('|')
      .map((c) => c.trim());

    if (cells.length < 6) continue;

    // Pular cabeçalho — detecta pela presença exata dos nomes de coluna
    const primeiraColuna = cells[0].toLowerCase();
    if (primeiraColuna === 'tela') continue;

    const stripBackticks = (s) => s.replace(/^`|`$/g, '');

    const seletorAlt = cells[4];
    const isVazio = seletorAlt === '—' || seletorAlt === '-' || seletorAlt === '';

    entries.push({
      tela: cells[0],
      campo: cells[1],
      tipo: cells[2],
      seletorPrimario: stripBackticks(cells[3]),
      seletorAlternativo: isVazio ? '' : stripBackticks(seletorAlt),
      status: cells[5],
    });
  }

  return entries;
}

/**
 * Formata um array de objetos de seletor como tabela markdown (formato `selectors.md`).
 *
 * Envolve seletores em backticks e usa "—" para alternativas vazias.
 * Gera cabeçalho e linha separadora automaticamente.
 *
 * @param {Array<{tela: string, campo: string, tipo: string, seletorPrimario: string, seletorAlternativo: string, status: string}>} entries
 * @returns {string} Tabela markdown formatada
 */
export function formatSelectorsTable(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return '';

  const header = '| Tela | Campo | Tipo | Seletor Primário | Seletor Alternativo | Status |';
  const separator = '|------|-------|------|------------------|---------------------|--------|';

  const rows = entries.map((e) => {
    const primario = e.seletorPrimario ? `\`${e.seletorPrimario}\`` : '—';
    const alternativo = e.seletorAlternativo ? `\`${e.seletorAlternativo}\`` : '—';
    return `| ${e.tela} | ${e.campo} | ${e.tipo} | ${primario} | ${alternativo} | ${e.status} |`;
  });

  return [header, separator, ...rows].join('\n');
}

/**
 * Faz o parse de um bloco de fluxo markdown (formato `flows.md`).
 *
 * Espera o formato:
 * ```
 * ### nome-do-fluxo
 * - **Pré-condições**: ...
 * - **Rota**: ...
 * - **Passos**:
 *   1. Passo um
 *   2. Passo dois
 * - **Resultado esperado**: ...
 * - **Page Object**: ...
 * - **Spec**: ...
 * - **Status**: ...
 * ```
 *
 * @param {string} markdown - String markdown contendo um bloco de fluxo
 * @returns {{nome: string, preCondicoes: string, rota: string, passos: string[], resultadoEsperado: string, pageObject: string, spec: string, status: string} | null}
 */
export function parseFlowBlock(markdown) {
  if (typeof markdown !== 'string') return null;

  const lines = markdown.split('\n');

  let nome = '';
  let preCondicoes = '';
  let rota = '';
  const passos = [];
  let resultadoEsperado = '';
  let pageObject = '';
  let spec = '';
  let status = '';
  let inPassos = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Captura nome do fluxo (### nome)
    const nomeMatch = trimmed.match(/^###\s+(.+)$/);
    if (nomeMatch) {
      nome = nomeMatch[1].trim();
      inPassos = false;
      continue;
    }

    // Captura campos com **Label**: Valor
    const campoMatch = trimmed.match(/^-\s+\*\*(.+?)\*\*:\s*(.*)$/);
    if (campoMatch) {
      const label = campoMatch[1].toLowerCase().trim();
      const valor = campoMatch[2].trim();

      if (label === 'pré-condições' || label === 'pre-condições' || label === 'pré-condicões' || label === 'pre-condicoes') {
        preCondicoes = valor;
        inPassos = false;
      } else if (label === 'rota') {
        rota = valor;
        inPassos = false;
      } else if (label === 'passos') {
        inPassos = true;
      } else if (label === 'resultado esperado') {
        resultadoEsperado = valor;
        inPassos = false;
      } else if (label === 'page object') {
        pageObject = valor;
        inPassos = false;
      } else if (label === 'spec') {
        spec = valor;
        inPassos = false;
      } else if (label === 'status') {
        status = valor;
        inPassos = false;
      } else {
        inPassos = false;
      }
      continue;
    }

    // Captura passos numerados (ex: "  1. Passo um")
    if (inPassos) {
      const passoMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (passoMatch) {
        passos.push(passoMatch[1].trim());
      }
    }
  }

  if (!nome) return null;

  return {
    nome,
    preCondicoes,
    rota,
    passos,
    resultadoEsperado,
    pageObject,
    spec,
    status,
  };
}

/**
 * Formata um objeto de fluxo como bloco markdown (formato `flows.md`).
 *
 * Gera o formato:
 * ```
 * ### nome-do-fluxo
 * - **Pré-condições**: ...
 * - **Rota**: ...
 * - **Passos**:
 *   1. Passo um
 * - **Resultado esperado**: ...
 * - **Page Object**: ...
 * - **Spec**: ...
 * - **Status**: ...
 * ```
 *
 * @param {{nome: string, preCondicoes: string, rota: string, passos: string[], resultadoEsperado: string, pageObject: string, spec: string, status: string}} flow
 * @returns {string} Bloco markdown formatado
 */
export function formatFlowBlock(flow) {
  if (!flow || typeof flow.nome !== 'string') return '';

  const lines = [];
  lines.push(`### ${flow.nome}`);
  lines.push('');
  lines.push(`- **Pré-condições**: ${flow.preCondicoes || ''}`);
  lines.push(`- **Rota**: ${flow.rota || ''}`);
  lines.push('- **Passos**:');

  const passos = Array.isArray(flow.passos) ? flow.passos : [];
  for (let i = 0; i < passos.length; i++) {
    lines.push(`  ${i + 1}. ${passos[i]}`);
  }

  lines.push(`- **Resultado esperado**: ${flow.resultadoEsperado || ''}`);
  lines.push(`- **Page Object**: ${flow.pageObject || ''}`);
  lines.push(`- **Spec**: ${flow.spec || ''}`);
  lines.push(`- **Status**: ${flow.status || ''}`);

  return lines.join('\n');
}


// ---------------------------------------------------------------------------
// Relatório de execução — gera JSON consolidado da suíte de testes
// ---------------------------------------------------------------------------

/**
 * Gera um relatório consolidado de execução da suíte de testes em formato JSON.
 *
 * O relatório é salvo em `reports/{YYYY-MM-DD}-execucao.json` e contém:
 * data/hora da execução, duração total, contagem de testes (total/passou/falhou),
 * detalhes de cada teste com screenshots antes/depois, e logs de console agrupados.
 *
 * @param {Array<{spec: string, nome: string, status: 'passou'|'falhou', duracao: string, screenshotAntes?: string, screenshotDepois?: string, consoleLogs?: Array<*>, consoleErrors?: boolean, erro?: string}>} testResults - Array de resultados individuais de cada teste
 * @param {{errosJS?: string[], warnings?: string[], falhasAPI?: string[]}} consoleLogs - Logs de console consolidados da execução, agrupados por categoria
 * @returns {Promise<string>} Caminho absoluto do arquivo de relatório gerado
 */
export async function generateExecutionReport(testResults, consoleLogs) {
  const results = Array.isArray(testResults) ? testResults : [];
  const logs = consoleLogs && typeof consoleLogs === 'object' ? consoleLogs : {};

  // Calcular duração total a partir das durações individuais dos testes
  let totalSegundos = 0;
  for (const t of results) {
    if (typeof t.duracao === 'string') {
      const valor = parseFloat(t.duracao);
      if (!Number.isNaN(valor)) {
        totalSegundos += valor;
      }
    }
  }
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = Math.round(totalSegundos % 60);
  const duracao = minutos > 0 ? `${minutos}m ${segundos}s` : `${segundos}s`;

  // Contagens
  const totalTestes = results.length;
  const passou = results.filter((t) => t.status === 'passou').length;
  const falhou = results.filter((t) => t.status === 'falhou').length;

  const relatorio = {
    dataExecucao: new Date().toISOString(),
    duracao,
    totalTestes,
    passou,
    falhou,
    testes: results.map((t) => ({
      spec: t.spec || '',
      nome: t.nome || '',
      status: t.status || 'falhou',
      duracao: t.duracao || '0s',
      screenshotAntes: t.screenshotAntes || '',
      screenshotDepois: t.screenshotDepois || '',
      consoleLogs: Array.isArray(t.consoleLogs) ? t.consoleLogs : [],
      consoleErrors: Boolean(t.consoleErrors),
      ...(t.erro ? { erro: t.erro } : {}),
    })),
    logsConsole: {
      errosJS: Array.isArray(logs.errosJS) ? logs.errosJS : [],
      warnings: Array.isArray(logs.warnings) ? logs.warnings : [],
      falhasAPI: Array.isArray(logs.falhasAPI) ? logs.falhasAPI : [],
    },
  };

  // Resolver __dirname via import.meta.url (ESM)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const reportsDir = join(__dirname, '..', 'reports');

  // Criar diretório reports/ se não existir
  await mkdir(reportsDir, { recursive: true });

  // Nome do arquivo: {YYYY-MM-DD}-execucao.json
  const hoje = new Date().toISOString().slice(0, 10);
  const filePath = join(reportsDir, `${hoje}-execucao.json`);

  await writeFile(filePath, JSON.stringify(relatorio, null, 2), 'utf-8');

  return filePath;
}
