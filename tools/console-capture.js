// Interceptação de logs do console do navegador e erros de rede — Guardian
// Captura mensagens do console (error, warning, log), exceções de página e respostas HTTP com falha.
// Funções puras (categorizeLogEntry, isNetworkError) exportadas separadamente para testabilidade.

/**
 * @typedef {Object} ConsoleEntry
 * @property {'error'|'warning'|'log'|'info'} type - Categoria da entrada
 * @property {string} text - Texto da mensagem
 * @property {string} timestamp - Data/hora ISO 8601
 * @property {string} [url] - URL da página quando o log ocorreu
 */

/**
 * @typedef {Object} NetworkError
 * @property {string} url - URL da requisição que falhou
 * @property {number} status - Código HTTP da resposta
 * @property {string} method - Método HTTP (GET, POST, etc.)
 * @property {string} timestamp - Data/hora ISO 8601
 */

/**
 * @typedef {Object} ConsoleCapture
 * @property {() => ConsoleEntry[]} getConsoleLogs - Retorna todos os logs capturados
 * @property {() => boolean} hasConsoleErrors - Verifica se há erros JS (type 'error' ou 'pageerror')
 * @property {() => NetworkError[]} getNetworkErrors - Retorna chamadas com status >= 400
 * @property {() => void} clear - Limpa logs e erros acumulados
 */

/**
 * Categoriza uma entrada de log do console por tipo.
 *
 * Regras:
 * - 'error' ou 'pageerror' → 'error'
 * - 'warning' → 'warning'
 * - Qualquer outro tipo → 'log'
 *
 * Função pura — não depende de Playwright.
 *
 * @param {{ type: string, text: string }} entry - Entrada com tipo e texto
 * @returns {'error'|'warning'|'log'} Categoria da entrada
 */
export function categorizeLogEntry(entry) {
  const type = (entry && typeof entry.type === 'string') ? entry.type.toLowerCase() : '';

  if (type === 'error' || type === 'pageerror') {
    return 'error';
  }

  if (type === 'warning') {
    return 'warning';
  }

  return 'log';
}

/**
 * Verifica se uma resposta de rede representa um erro (status >= 400).
 *
 * Função pura — não depende de Playwright.
 *
 * @param {{ status: number }} response - Objeto com código de status HTTP
 * @returns {boolean} true se status >= 400, false caso contrário
 */
export function isNetworkError(response) {
  if (!response || typeof response.status !== 'number') {
    return false;
  }

  return response.status >= 400;
}

/**
 * Configura interceptação de console e rede para uma página Playwright.
 *
 * Escuta os eventos:
 * - `page.on('console')` — mensagens de tipo error, warning e log
 * - `page.on('pageerror')` — exceções JavaScript não tratadas
 * - `page.on('response')` — respostas HTTP com status >= 400
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @returns {ConsoleCapture} Objeto com métodos para consultar logs capturados
 */
export function setupConsoleCapture(page) {
  /** @type {ConsoleEntry[]} */
  const consoleLogs = [];

  /** @type {NetworkError[]} */
  const networkErrors = [];

  // Intercepta mensagens do console (error, warning, log, info)
  page.on('console', (msg) => {
    const rawType = msg.type();
    const category = categorizeLogEntry({ type: rawType, text: '' });

    consoleLogs.push({
      type: category,
      text: msg.text(),
      timestamp: new Date().toISOString(),
      url: page.url(),
    });
  });

  // Intercepta exceções JavaScript não tratadas (pageerror)
  page.on('pageerror', (error) => {
    consoleLogs.push({
      type: 'error',
      text: error.message || String(error),
      timestamp: new Date().toISOString(),
      url: page.url(),
    });
  });

  // Intercepta respostas de rede com status >= 400
  page.on('response', (response) => {
    if (isNetworkError({ status: response.status() })) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
        timestamp: new Date().toISOString(),
      });
    }
  });

  return {
    /**
     * Retorna todos os logs de console capturados.
     * @returns {ConsoleEntry[]}
     */
    getConsoleLogs() {
      return [...consoleLogs];
    },

    /**
     * Verifica se há pelo menos um erro JS (type 'error') nos logs capturados.
     * @returns {boolean}
     */
    hasConsoleErrors() {
      return consoleLogs.some((entry) => entry.type === 'error');
    },

    /**
     * Retorna todas as respostas de rede com status >= 400.
     * @returns {NetworkError[]}
     */
    getNetworkErrors() {
      return [...networkErrors];
    },

    /**
     * Limpa todos os logs e erros acumulados.
     */
    clear() {
      consoleLogs.length = 0;
      networkErrors.length = 0;
    },
  };
}
