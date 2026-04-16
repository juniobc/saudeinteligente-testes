// Utilitário de captura de screenshots para o Guardian — Agente de Testes E2E
// Fornece funções para captura padronizada de screenshots de página inteira
// e de elementos específicos, salvando em reports/screenshots/ com nomenclatura
// padronizada: {contexto}-{descricao}-{YYYYMMDD-HHmmss}.png

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { sanitizeFilename } from './helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Caminho absoluto do diretório de screenshots: reports/screenshots/ */
const SCREENSHOTS_DIR = resolve(__dirname, '..', 'reports', 'screenshots');

/**
 * Gera um timestamp no formato YYYYMMDD-HHmmss.
 *
 * @returns {string} Timestamp formatado (ex: 20260415-160000)
 */
function generateTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}${MM}${dd}-${HH}${mm}${ss}`;
}

/**
 * Garante que o diretório de screenshots existe, criando-o se necessário.
 */
function ensureScreenshotsDir() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

/**
 * Captura um screenshot de página inteira e salva em `reports/screenshots/`
 * com nomenclatura padronizada: `{contexto}-{descricao}-{YYYYMMDD-HHmmss}.png`.
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @param {string} context - Contexto da captura (ex: nome do fluxo, spec, etapa)
 * @param {string} description - Descrição breve da captura (ex: 'antes', 'depois', 'erro')
 * @returns {Promise<{path: string, timestamp: string, description: string}>}
 *   Objeto com caminho do arquivo salvo, timestamp da captura e descrição original
 */
export async function captureScreenshot(page, context, description) {
  const safeContext = sanitizeFilename(context || 'sem-contexto');
  const safeDescription = sanitizeFilename(description || 'screenshot');
  const timestamp = generateTimestamp();

  ensureScreenshotsDir();

  const fileName = `${safeContext}-${safeDescription}-${timestamp}.png`;
  const filePath = resolve(SCREENSHOTS_DIR, fileName);

  await page.screenshot({ path: filePath, fullPage: true });

  return { path: filePath, timestamp, description: description || 'screenshot' };
}

/**
 * Captura um screenshot de um elemento específico identificado pelo seletor
 * e salva em `reports/screenshots/` com nomenclatura padronizada.
 * Útil para documentar componentes individuais (modais, formulários, tabelas).
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @param {string} selector - Seletor CSS do elemento a ser capturado
 * @param {string} context - Contexto da captura (ex: nome do fluxo, spec, etapa)
 * @param {string} description - Descrição breve da captura (ex: 'modal-aberto', 'tabela-filtrada')
 * @returns {Promise<{path: string, timestamp: string, selector: string}>}
 *   Objeto com caminho do arquivo salvo, timestamp da captura e seletor do elemento
 */
export async function captureElementScreenshot(page, selector, context, description) {
  const safeContext = sanitizeFilename(context || 'sem-contexto');
  const safeDescription = sanitizeFilename(description || 'elemento');
  const timestamp = generateTimestamp();

  ensureScreenshotsDir();

  const fileName = `${safeContext}-${safeDescription}-${timestamp}.png`;
  const filePath = resolve(SCREENSHOTS_DIR, fileName);

  const element = page.locator(selector);
  await element.screenshot({ path: filePath });

  return { path: filePath, timestamp, selector };
}
