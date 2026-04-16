// Smoke tests — Verificação de estrutura do projeto Guardian
// Valida que todos os diretórios, arquivos e configurações obrigatórias existem
//
// **Valida: Requisitos 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 6.1**

import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Raiz do projeto saudeinteligente-testes/
const ROOT = join(__dirname, '..', '..');

/**
 * Função auxiliar para verificar existência de arquivo/diretório relativo à raiz.
 * @param {string} relativePath - Caminho relativo à raiz do projeto
 * @returns {boolean}
 */
function existe(relativePath) {
  return existsSync(join(ROOT, relativePath));
}

test.describe('Smoke Tests — Estrutura do Projeto Guardian', () => {

  // ─── Req 1.4: Diretórios obrigatórios ───

  test('todos os diretórios obrigatórios existem', () => {
    const diretorios = [
      'agent',
      'agent/workflows',
      'knowledge/core',
      'knowledge/modules/oci',
      'tools',
      'tests/core',
      'tests/oci',
      'tests/__properties__',
      'page-objects',
      'fixtures',
      'reports',
    ];

    for (const dir of diretorios) {
      expect(existe(dir), `Diretório ausente: ${dir}`).toBe(true);
    }
  });

  // ─── Req 1.2: package.json com dependências corretas ───

  test('package.json contém dependências corretas e type: "module"', () => {
    const pkgPath = join(ROOT, 'package.json');
    expect(existsSync(pkgPath), 'package.json não encontrado').toBe(true);

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    // type: "module" para ES modules
    expect(pkg.type).toBe('module');

    // Dependências obrigatórias
    expect(pkg.dependencies).toHaveProperty('@playwright/test');
    expect(pkg.dependencies).toHaveProperty('dotenv');
    expect(pkg.dependencies).toHaveProperty('fast-check');
  });

  // ─── Req 1.3: playwright.config.js com configurações corretas ───

  test('playwright.config.js existe e tem configurações corretas', () => {
    const configPath = join(ROOT, 'playwright.config.js');
    expect(existsSync(configPath), 'playwright.config.js não encontrado').toBe(true);

    const conteudo = readFileSync(configPath, 'utf-8');

    // workers: 1 (Req 16.3)
    expect(conteudo).toContain('workers: 1');

    // fullyParallel: false (Req 16.3)
    expect(conteudo).toContain('fullyParallel: false');

    // headless configurável via env (Req 10.1, 10.5)
    expect(conteudo).toContain('E2E_HEADLESS');
    expect(conteudo).toContain('headless');

    // baseURL configurável via env (Req 1.3)
    expect(conteudo).toContain('E2E_BASE_URL');
    expect(conteudo).toContain('baseURL');

    // slowMo configurável (Req 10.2)
    expect(conteudo).toContain('slowMo');
    expect(conteudo).toContain('E2E_SLOW_MO');

    // testDir aponta para ./tests
    expect(conteudo).toContain("testDir: './tests'");

    // globalSetup referenciado
    expect(conteudo).toContain('globalSetup');

    // storageState configurado
    expect(conteudo).toContain('storageState');
  });

  // ─── Req 1.5: .env.example com variáveis documentadas ───

  test('.env.example existe com todas as variáveis obrigatórias', () => {
    const envPath = join(ROOT, '.env.example');
    expect(existsSync(envPath), '.env.example não encontrado').toBe(true);

    const conteudo = readFileSync(envPath, 'utf-8');

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

  // ─── Req 3.1, 3.2, 3.3: Steering files existem ───

  test('steering files do agente existem', () => {
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

  // ─── Req 6.1: Knowledge base — core ───

  test('knowledge/core/ contém rules.md, flows.md e selectors.md', () => {
    const coreFiles = [
      'knowledge/core/rules.md',
      'knowledge/core/flows.md',
      'knowledge/core/selectors.md',
    ];

    for (const arquivo of coreFiles) {
      expect(existe(arquivo), `Arquivo core ausente: ${arquivo}`).toBe(true);
    }
  });

  // ─── Req 6.1: Knowledge base — módulo OCI ───

  test('knowledge/modules/oci/ contém todos os 5 arquivos obrigatórios', () => {
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

  // ─── Req 5.1–5.5: Ferramentas Playwright ───

  test('todos os scripts de ferramentas existem em tools/', () => {
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

  // ─── Req 12.1: Page Objects ───

  test('todos os page objects existem', () => {
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

  // ─── Req 12.2, 12.3: Specs de teste ───

  test('todos os specs de teste existem em tests/core/ e tests/oci/', () => {
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

  // ─── Infraestrutura complementar ───

  test('global-setup.js e fixtures existem', () => {
    expect(existe('global-setup.js'), 'global-setup.js ausente').toBe(true);
    expect(existe('fixtures/test-data.js'), 'fixtures/test-data.js ausente').toBe(true);
  });

});
