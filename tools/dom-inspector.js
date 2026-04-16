// Inspeção de DOM para exploração do Guardian — Agente de Testes E2E
// Utilitário que permite ao agente inspecionar o DOM da aplicação via Playwright,
// extrair seletores na ordem de prioridade definida no instructions.md,
// destacar elementos visualmente e obter a estrutura simplificada da página.
// Todas as funções de página usam page.evaluate() para executar no contexto do navegador.

/**
 * Extrai seletores a partir de um objeto de atributos de elemento DOM.
 * Função pura (sem dependência de Playwright) — usada para testes de propriedade.
 *
 * Hierarquia de prioridade:
 *   1. data-field-name / data-testid (prioridade máxima)
 *   2. name
 *   3. id
 *   4. role ARIA (com aria-label quando disponível)
 *   5. classes CSS estáveis — prefixo Select2__ (prioridade mínima)
 *
 * @param {object} attributes - Objeto com atributos do elemento
 * @param {string} [attributes['data-field-name']] - Valor do atributo data-field-name
 * @param {string} [attributes['data-testid']] - Valor do atributo data-testid
 * @param {string} [attributes.name] - Valor do atributo name
 * @param {string} [attributes.id] - Valor do atributo id
 * @param {string} [attributes.role] - Valor do atributo role ARIA
 * @param {string} [attributes['aria-label']] - Valor do atributo aria-label
 * @param {string[]} [attributes.classList] - Array de classes CSS do elemento
 * @returns {{ primary: string|null, alternatives: string[] }}
 *   Objeto com seletor primário (maior prioridade) e alternativas em ordem decrescente
 */
export function extractSelectorsFromElement(attributes) {
  if (!attributes || typeof attributes !== 'object') {
    return { primary: null, alternatives: [] };
  }

  const selectors = [];

  // Prioridade 1: data-field-name
  const fieldName = attributes['data-field-name'];
  if (fieldName && typeof fieldName === 'string' && fieldName.trim()) {
    selectors.push(`[data-field-name="${fieldName}"]`);
  }

  // Prioridade 1: data-testid (mesma prioridade que data-field-name)
  const testId = attributes['data-testid'];
  if (testId && typeof testId === 'string' && testId.trim()) {
    selectors.push(`[data-testid="${testId}"]`);
  }

  // Prioridade 2: name
  const name = attributes.name;
  if (name && typeof name === 'string' && name.trim()) {
    selectors.push(`[name="${name}"]`);
  }

  // Prioridade 3: id
  const id = attributes.id;
  if (id && typeof id === 'string' && id.trim()) {
    selectors.push(`#${id}`);
  }

  // Prioridade 4: role ARIA (com aria-label quando disponível)
  const role = attributes.role;
  const ariaLabel = attributes['aria-label'];
  if (role && typeof role === 'string' && role.trim()) {
    if (ariaLabel && typeof ariaLabel === 'string' && ariaLabel.trim()) {
      selectors.push(`[role="${role}"][aria-label="${ariaLabel}"]`);
    } else {
      selectors.push(`[role="${role}"]`);
    }
  }

  // Prioridade 5: classes CSS estáveis — prefixo Select2__
  const classList = attributes.classList;
  if (Array.isArray(classList)) {
    const select2Classes = classList.filter(
      (c) => typeof c === 'string' && c.startsWith('Select2__')
    );
    if (select2Classes.length > 0) {
      selectors.push(`.${select2Classes[0]}`);
    }
  }

  return {
    primary: selectors[0] || null,
    alternatives: selectors.slice(1),
  };
}

/**
 * Varre o DOM da página e retorna uma estrutura com todos os elementos interativos,
 * formulários, modais e tabelas visíveis. Aceita `options.scope` para limitar
 * a inspeção a um container específico (seletor CSS).
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @param {object} [options={}] - Opções de inspeção
 * @param {string} [options.scope] - Seletor CSS de um container para limitar a inspeção
 * @returns {Promise<{url: string, title: string, elements: object[], forms: object[], modals: object[], tables: object[]}>}
 *   Estrutura com URL, título, elementos interativos, formulários, modais e tabelas
 */
export async function inspectPage(page, options = {}) {
  const url = page.url();
  const title = await page.title();

  const { elements, forms, modals, tables } = await page.evaluate((scope) => {
    const root = scope ? document.querySelector(scope) : document;
    if (!root) return { elements: [], forms: [], modals: [], tables: [] };

    /**
     * Verifica se um elemento está visível no viewport.
     */
    function isVisible(el) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    /**
     * Extrai seletores de um elemento na ordem de prioridade:
     * data-field-name > data-testid > name > id > role ARIA > classes CSS (Select2__)
     */
    function extractSelectorsFromEl(el) {
      const selectors = [];

      const fieldName = el.getAttribute('data-field-name');
      if (fieldName) selectors.push(`[data-field-name="${fieldName}"]`);

      const testId = el.getAttribute('data-testid');
      if (testId) selectors.push(`[data-testid="${testId}"]`);

      const name = el.getAttribute('name');
      if (name) selectors.push(`[name="${name}"]`);

      const id = el.getAttribute('id');
      if (id) selectors.push(`#${id}`);

      const role = el.getAttribute('role');
      const ariaLabel = el.getAttribute('aria-label');
      if (role && ariaLabel) {
        selectors.push(`[role="${role}"][aria-label="${ariaLabel}"]`);
      } else if (role) {
        selectors.push(`[role="${role}"]`);
      }

      const classList = Array.from(el.classList);
      const select2Classes = classList.filter((c) => c.startsWith('Select2__'));
      if (select2Classes.length > 0) {
        selectors.push(`.${select2Classes[0]}`);
      }

      return selectors;
    }

    /**
     * Coleta informações de um elemento interativo.
     */
    function elementInfo(el) {
      const tag = el.tagName.toLowerCase();
      const type = el.getAttribute('type') || tag;
      const sels = extractSelectorsFromEl(el);
      const text = (el.innerText || el.textContent || '').trim().substring(0, 100);

      return {
        tag,
        type,
        selectors: {
          primary: sels[0] || null,
          alternatives: sels.slice(1),
        },
        text,
        isVisible: isVisible(el),
        isInteractive: true,
      };
    }

    // --- Elementos interativos ---
    const interactiveSelectors =
      'input, select, textarea, button, a[href], [role="button"], [role="link"], [role="tab"], [role="menuitem"]';
    const interactiveEls = Array.from(root.querySelectorAll(interactiveSelectors));

    // Incluir containers react-select (data-field-name com Select2__)
    const reactSelectContainers = Array.from(root.querySelectorAll('[data-field-name]'));
    const allInteractive = [...interactiveEls, ...reactSelectContainers];

    // Deduplicar por referência
    const seen = new Set();
    const elements = [];
    for (const el of allInteractive) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (isVisible(el)) {
        elements.push(elementInfo(el));
      }
    }

    // --- Formulários ---
    const formEls = Array.from(root.querySelectorAll('form'));
    const forms = formEls.map((form) => {
      const action = form.getAttribute('action') || '';
      const method = (form.getAttribute('method') || 'get').toUpperCase();
      const fields = Array.from(form.querySelectorAll('input, select, textarea, [data-field-name]'))
        .filter(isVisible)
        .map(elementInfo);
      return { action, method, fields };
    });

    // --- Modais (react-bootstrap) ---
    const modalEls = Array.from(document.querySelectorAll('.modal'));
    const modals = modalEls.map((modal) => {
      const titleEl = modal.querySelector('.modal-title');
      const modalTitle = titleEl ? (titleEl.innerText || '').trim() : '';
      const modalVisible = isVisible(modal);
      const fields = Array.from(modal.querySelectorAll('input, select, textarea, [data-field-name]'))
        .filter(isVisible)
        .map(elementInfo);
      return { title: modalTitle, isVisible: modalVisible, fields };
    });

    // --- Tabelas ---
    const tableEls = Array.from(root.querySelectorAll('table'));
    const tables = tableEls.map((table) => {
      const headerEls = Array.from(table.querySelectorAll('thead th'));
      const headers = headerEls.map((th) => (th.innerText || '').trim());
      const rows = table.querySelectorAll('tbody tr:not(.expanded-row)');
      const rowCount = rows.length;
      const hasPagination = !!root.querySelector(
        '[aria-label="Próxima página"], [aria-label="Next page"], .pagination'
      );
      return { headers, rowCount, hasPagination };
    });

    return { elements, forms, modals, tables };
  }, options.scope || null);

  return { url, title, elements, forms, modals, tables };
}


/**
 * Para um elemento específico identificado por seletor, extrai seletores na ordem
 * de prioridade definida no instructions.md:
 * `data-field-name` > `data-testid` > `name` > `id` > role ARIA > classes CSS estáveis (Select2__).
 * Retorna o seletor primário (maior prioridade presente) e alternativas em ordem decrescente.
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @param {string} element - Seletor CSS do elemento a ser analisado
 * @returns {Promise<{primary: string|null, alternatives: string[], type: string, text: string, isInteractive: boolean}>}
 *   Objeto com seletor primário, alternativas, tipo do elemento, texto visível e flag de interatividade
 */
export async function extractSelectors(page, element) {
  const result = await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) {
      return { primary: null, alternatives: [], type: 'unknown', text: '', isInteractive: false };
    }

    const tag = el.tagName.toLowerCase();
    const type = el.getAttribute('type') || tag;
    const text = (el.innerText || el.textContent || '').trim().substring(0, 100);

    // Determinar se é interativo
    const interactiveTags = ['input', 'select', 'textarea', 'button', 'a'];
    const interactiveRoles = ['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'switch', 'combobox'];
    const role = el.getAttribute('role');
    const isInteractive =
      interactiveTags.includes(tag) ||
      (role && interactiveRoles.includes(role)) ||
      el.hasAttribute('data-field-name') ||
      el.hasAttribute('onclick');

    // Extrair seletores na ordem de prioridade:
    // 1. data-field-name / data-testid (prioridade 1)
    // 2. name (prioridade 2)
    // 3. id (prioridade 3)
    // 4. role ARIA (prioridade 4)
    // 5. classes CSS estáveis — Select2__ (prioridade 5)
    const selectors = [];

    const fieldName = el.getAttribute('data-field-name');
    if (fieldName) selectors.push(`[data-field-name="${fieldName}"]`);

    const testId = el.getAttribute('data-testid');
    if (testId) selectors.push(`[data-testid="${testId}"]`);

    const name = el.getAttribute('name');
    if (name) selectors.push(`[name="${name}"]`);

    const id = el.getAttribute('id');
    if (id) selectors.push(`#${id}`);

    const ariaLabel = el.getAttribute('aria-label');
    if (role && ariaLabel) {
      selectors.push(`[role="${role}"][aria-label="${ariaLabel}"]`);
    } else if (role) {
      selectors.push(`[role="${role}"]`);
    }

    const classList = Array.from(el.classList);
    const select2Classes = classList.filter((c) => c.startsWith('Select2__'));
    if (select2Classes.length > 0) {
      selectors.push(`.${select2Classes[0]}`);
    }

    return {
      primary: selectors[0] || null,
      alternatives: selectors.slice(1),
      type,
      text,
      isInteractive,
    };
  }, element);

  return result;
}

/**
 * Injeta CSS temporário via `page.evaluate()` para destacar visualmente um elemento
 * no navegador. Adiciona borda colorida e background semi-transparente.
 * Usado no modo visual (headed) para que o desenvolvedor veja quais
 * elementos o agente está analisando.
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @param {string} selector - Seletor CSS do elemento a destacar
 * @param {object} [options={}] - Opções de destaque
 * @param {string} [options.color='red'] - Cor da borda e do background (nome CSS ou hex)
 * @param {number} [options.duration=2000] - Duração do destaque em milissegundos
 * @returns {Promise<void>}
 */
export async function highlightElement(page, selector, options = {}) {
  const color = options.color || 'red';
  const duration = options.duration || 2000;

  await page.evaluate(
    ({ selector, color, duration }) => {
      const el = document.querySelector(selector);
      if (!el) return;

      // Salvar estilos originais
      const originalOutline = el.style.outline;
      const originalBackground = el.style.backgroundColor;
      const originalTransition = el.style.transition;

      // Aplicar destaque com borda colorida
      el.style.transition = 'outline 0.2s ease, background-color 0.2s ease';
      el.style.outline = `3px solid ${color}`;
      el.style.backgroundColor = `${color}20`; // 20 = ~12% opacidade em hex

      // Remover destaque após a duração
      setTimeout(() => {
        el.style.outline = originalOutline;
        el.style.backgroundColor = originalBackground;
        el.style.transition = originalTransition;
      }, duration);
    },
    { selector, color, duration }
  );
}

/**
 * Retorna uma visão simplificada da estrutura da página: headings (h1-h6),
 * navegação (nav, sidebar, breadcrumbs), área principal, formulários e modais.
 * Útil para o agente entender rapidamente o layout da tela antes de explorar
 * elementos individuais.
 *
 * @param {import('@playwright/test').Page} page - Instância da página Playwright
 * @returns {Promise<{headings: object[], navigation: object[], main: object|null, forms: object[], modals: object[]}>}
 *   Estrutura simplificada com headings, navegação, área principal, formulários e modais
 */
export async function getPageStructure(page) {
  const structure = await page.evaluate(() => {
    function isVisible(el) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    // --- Headings (h1-h6) ---
    const headingEls = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const headings = headingEls.filter(isVisible).map((h) => ({
      level: parseInt(h.tagName.substring(1), 10),
      text: (h.innerText || '').trim().substring(0, 200),
    }));

    // --- Navegação (nav, sidebar, breadcrumbs) ---
    const navEls = Array.from(
      document.querySelectorAll(
        'nav, [role="navigation"], .sidebar, .breadcrumb, [aria-label*="breadcrumb"], [aria-label*="navegação"]'
      )
    );
    const navigation = navEls.filter(isVisible).map((nav) => {
      const tag = nav.tagName.toLowerCase();
      const ariaLabel = nav.getAttribute('aria-label') || '';
      const classList = Array.from(nav.classList);

      let type = 'nav';
      if (classList.some((c) => c.toLowerCase().includes('sidebar'))) type = 'sidebar';
      if (
        classList.some((c) => c.toLowerCase().includes('breadcrumb')) ||
        ariaLabel.toLowerCase().includes('breadcrumb')
      )
        type = 'breadcrumb';

      const links = Array.from(nav.querySelectorAll('a'))
        .map((a) => ({ text: (a.innerText || '').trim(), href: a.getAttribute('href') || '' }))
        .filter((l) => l.text);

      return { tag, type, ariaLabel, links };
    });

    // --- Área principal ---
    const mainEl = document.querySelector(
      'main, [role="main"], .main-content, #main-content, .content-area'
    );
    let main = null;
    if (mainEl && isVisible(mainEl)) {
      const mainHeadings = Array.from(mainEl.querySelectorAll('h1, h2, h3'))
        .filter(isVisible)
        .map((h) => (h.innerText || '').trim())
        .slice(0, 5);
      const formCount = mainEl.querySelectorAll('form').length;
      const tableCount = mainEl.querySelectorAll('table').length;
      const buttonCount = mainEl.querySelectorAll('button').length;

      main = {
        tag: mainEl.tagName.toLowerCase(),
        headings: mainHeadings,
        formCount,
        tableCount,
        buttonCount,
      };
    }

    // --- Formulários ---
    const formEls = Array.from(document.querySelectorAll('form'));
    const forms = formEls.filter(isVisible).map((form) => {
      const action = form.getAttribute('action') || '';
      const method = (form.getAttribute('method') || 'get').toUpperCase();
      const inputCount = form.querySelectorAll('input, select, textarea, [data-field-name]').length;
      const hasSubmit = !!form.querySelector('button[type="submit"], input[type="submit"]');
      return { action, method, inputCount, hasSubmit };
    });

    // --- Modais (react-bootstrap) ---
    const modalEls = Array.from(document.querySelectorAll('.modal'));
    const modals = modalEls.map((modal) => {
      const titleEl = modal.querySelector('.modal-title');
      const title = titleEl ? (titleEl.innerText || '').trim() : '';
      const modalVisible = isVisible(modal);
      const inputCount = modal.querySelectorAll('input, select, textarea, [data-field-name]').length;
      const hasSubmit = !!modal.querySelector('button[type="submit"]');
      return { title, isVisible: modalVisible, inputCount, hasSubmit };
    });

    return { headings, navigation, main, forms, modals };
  });

  return structure;
}
