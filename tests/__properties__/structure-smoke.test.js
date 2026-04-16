// Smoke tests — Verificação de estrutura do projeto Guardian
// Valida existência de diretórios, arquivos, dependências e configurações obrigatórias.
//
// **Valida: Requisitos 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 6.1**

import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Raiz do projeto saudeinteligente-testes/
const ROOT = join(__dirname, '..', '..');

/**
 * Verifica se um caminho relativo à raiz do projeto existe.
 * @param {string} relativePath - Caminho relativo à raiz
 * @returns {boolean}
 */
function existe(relativePath) {
  return existsSync(join(ROOT, relativePath));
}

/**
 * Verifica se um arquivo existe e não está vazio (tamanho > 0 bytes).
 * @param {string} relativePath - Caminho relativo à raiz
 * @returns {boolean}
 */
function existeENaoVazio(relativePath) {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return false;
  const stats = statSync(fullPath);
  return stats.size > 0;
}

/**
 * Lê conteúdo de um arquivo relativo à raiz do projeto.
 * @param {string} relativePath - Caminho relativo à raiz
 * @returns {string}
 */
function lerArquivo(relativePath) {
  return readFileSync(join(ROOT, relativePath), 'utf-8');
}

test.describe('Smoke Tests — Estrutura do Projeto Guardian', () => {

  // ─── 1. Req 1.4: Todos os diretórios obrigatórios existem ───

  test('1 — todos os diretórios obrigatórios existem', () => {
    const diretorios = [
      'agent',
      'knowledge/core',
      'knowledge/modules/oci',
      'tools',
      'tests/core',
      'tests/oci',
      'tests/__properties__',
      'page-objects',
      'fixtures',
      'reports',
      'reports/screenshots',
      'reports/console-logs',
    ];

    for (const dir of diretorios) {
      expect(existe(dir), `Diretório ausente: ${dir}`).toBe(true);
    }
  });

  // ─── 2. Req 1.2: package.json com dependências e type corretos ───

  test('2 — package.json contém dependências corretas e type: "module"', () => {
    const pkgPath = join(ROOT, 'package.json');
    expect(existsSync(pkgPath), 'package.json não encontrado').toBe(true);

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    // ES modules obrigatório
    expect(pkg.type).toBe('module');

    // Dependências obrigatórias
    expect(pkg.dependencies).toHaveProperty('@playwright/test');
    expect(pkg.dependencies).toHaveProperty('dotenv');
    expect(pkg.dependencies).toHaveProperty('fast-check');
  });

  // ─── 3. Req 1.3, 10.1, 10.2, 16.1, 16.3, 16.4: playwright.config.js ───

  test('3 — playwright.config.js existe e contém configurações corretas', () => {
    const configPath = join(ROOT, 'playwright.config.js');
    expect(existsSync(configPath), 'playwright.config.js não encontrado').toBe(true);

    const conteudo = readFileSync(configPath, 'utf-8');

    // testDir aponta para ./tests
    expect(conteudo).toContain("testDir: './tests'");

    // workers: 1 — execução serial (Req 16.3)
    expect(conteudo).toContain('workers: 1');

    // fullyParallel: false (Req 16.3)
    expect(conteudo).toContain('fullyParallel: false');

    // headless configurável via E2E_HEADLESS (Req 10.1, 10.5)
    expect(conteudo).toContain('E2E_HEADLESS');

    // baseURL configurável via E2E_BASE_URL (Req 1.3, 16.1)
    expect(conteudo).toContain('E2E_BASE_URL');

    // slowMo configurável via E2E_SLOW_MO (Req 10.2)
    expect(conteudo).toContain('E2E_SLOW_MO');

    // globalSetup referenciado
    expect(conteudo).toContain('globalSetup');

    // storageState configurado
    expect(conteudo).toContain('storageState');
  });

  // ─── 4. Req 1.5: .env.example com variáveis obrigatórias ───

  test('4 — .env.example existe com todas as variáveis obrigatórias', () => {
    expect(existe('.env.example'), '.env.example não encontrado').toBe(true);

    const conteudo = lerArquivo('.env.example');

    const variaveisObrigatorias = [
      'E2E_BASE_URL',
      'E2E_USERNAME',
      'E2E_PASSWORD',
      'E2E_MUNICIPIO',
      'E2E_HEADLESS',
      'E2E_SLOW_MO',
    ];

    for (const variavel of variaveisObrigatorias) {
      expect(conteudo, `Variável ausente no .env.example: ${variavel}`).toContain(variavel);
    }
  });

  // ─── 5. .gitignore com entradas obrigatórias ───

  test('5 — .gitignore existe e ignora entradas obrigatórias', () => {
    expect(existe('.gitignore'), '.gitignore não encontrado').toBe(true);

    const conteudo = lerArquivo('.gitignore');

    const entradasObrigatorias = [
      'node_modules/',
      '.auth/',
      '.env',
      'reports/',
      'test-results/',
    ];

    for (const entrada of entradasObrigatorias) {
      expect(conteudo, `Entrada ausente no .gitignore: ${entrada}`).toContain(entrada);
    }
  });

  // ─── 6. Req 3.1, 3.2, 3.3: Steering files existem ───

  test('6 — steering files do agente existem', () => {
    const steeringFiles = [
      'agent/agent.md',
      'agent/instructions.md',
      'agent/workflows/explore.md',
      'agent/workflows/test.md',
      'agent/workflows/learn.md',
    ];

    for (const arquivo of steeringFiles) {
      expect(existe(arquivo), `Steering file ausente: ${arquivo}`).toBe(true);
    }
  });

  // ─── 7. Req 6.1: Knowledge core — arquivos existem e não estão vazios ───

  test('7 — knowledge/core/ contém arquivos não-vazios', () => {
    const coreFiles = [
      'knowledge/core/rules.md',
      'knowledge/core/flows.md',
      'knowledge/core/selectors.md',
    ];

    for (const arquivo of coreFiles) {
      expect(
        existeENaoVazio(arquivo),
        `Arquivo core ausente ou vazio: ${arquivo}`,
      ).toBe(true);
    }
  });

  // ─── 8. Req 6.1: Knowledge módulo OCI — 5 arquivos obrigatórios ───

  test('8 — knowledge/modules/oci/ contém todos os 5 arquivos', () => {
    const ociFiles = [
      'knowledge/modules/oci/rules.md',
      'knowledge/modules/oci/flows.md',
      'knowledge/modules/oci/selectors.md',
      'knowledge/modules/oci/errors.md',
      'knowledge/modules/oci/lessons.md',
    ];

    for (const arquivo of ociFiles) {
      expect(existe(arquivo), `Arquivo OCI ausente: ${arquivo}`).toBe(true);
    }
  });

  // ─── 9. Req 5.1–5.5: Ferramentas Playwright ───

  test('9 — todos os scripts de ferramentas existem em tools/', () => {
    const ferramentas = [
      'tools/helpers.js',
      'tools/dom-inspector.js',
      'tools/screenshot-helper.js',
      'tools/component-helpers.js',
      'tools/console-capture.js',
    ];

    for (const arquivo of ferramentas) {
      expect(existe(arquivo), `Ferramenta ausente: ${arquivo}`).toBe(true);
    }
  });

  // ─── 10. Req 12.1: Page Objects ───

  test('10 — todos os page objects existem', () => {
    const pageObjects = [
      'page-objects/LoginPage.js',
      'page-objects/MenuSistemasPage.js',
      'page-objects/CadOCIPage.js',
      'page-objects/SolicitacaoModal.js',
      'page-objects/CadastroPacienteModal.js',
    ];

    for (const arquivo of pageObjects) {
      expect(existe(arquivo), `Page Object ausente: ${arquivo}`).toBe(true);
    }
  });

  // ─── 11. Req 12.2, 12.3: Specs de teste nas localizações corretas ───

  test('11 — todos os specs existem em tests/core/ e tests/oci/', () => {
    const specs = [
      'tests/core/core-autenticacao.spec.js',
      'tests/oci/oci-listagem-filtragem.spec.js',
      'tests/oci/oci-nova-solicitacao.spec.js',
      'tests/oci/oci-cadastro-paciente.spec.js',
      'tests/oci/oci-cancelamento-solicitacao.spec.js',
      'tests/oci/oci-detalhes-impressao.spec.js',
    ];

    for (const arquivo of specs) {
      expect(existe(arquivo), `Spec ausente: ${arquivo}`).toBe(true);
    }
  });

  // ─── 12. Req 14.1: global-setup.js existe ───

  test('12 — global-setup.js existe', () => {
    expect(existe('global-setup.js'), 'global-setup.js ausente').toBe(true);
  });

});
