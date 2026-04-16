// Configuração do Playwright para o projeto independente de testes E2E
// Guardian — Agente de Testes E2E do ecossistema Saúde Inteligente
//
// Este arquivo configura o Playwright para execução em modo headed por padrão,
// com slowMo para acompanhamento visual, worker único para evitar conflitos
// de sessão e reutilização de estado de autenticação via storageState.

import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente do .env na raiz do projeto
dotenv.config();

export default defineConfig({
  // Diretório dos specs de teste (organizado por módulo: core/, oci/, etc.)
  testDir: './tests',

  // Timeout global por teste: 30 segundos
  timeout: 30_000,

  // Retries automáticos em CI
  retries: process.env.CI ? 1 : 0,

  // Um worker por vez para evitar múltiplas janelas e conflitos de sessão
  workers: 1,

  // Executar specs em série — ordem importa para fluxos dependentes
  fullyParallel: false,

  // Setup global — autenticação reutilizável (login + persistência de storageState)
  globalSetup: './global-setup.js',

  // Configurações compartilhadas por todos os testes
  use: {
    // URL base configurável via variável de ambiente (padrão: SPA local)
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',

    // Estado de autenticação reutilizável (gerado pelo global-setup)
    // Specs que testam login devem sobrescrever com { storageState: undefined }
    storageState: './.auth/storage-state.json',

    // Modo headed por padrão para acompanhamento visual pelo desenvolvedor
    // Definir E2E_HEADLESS=true para execução headless (CI/CD)
    headless: process.env.E2E_HEADLESS === 'true' ? true : false,

    // SlowMo para que as ações sejam visualmente acompanháveis
    launchOptions: {
      slowMo: parseInt(process.env.E2E_SLOW_MO || '300', 10),
    },

    // Sempre capturar screenshot (antes/depois para relatório visual)
    screenshot: 'on',

    // Gerar trace apenas no primeiro retry (para debugging sem overhead)
    trace: 'on-first-retry',

    // Reter vídeo apenas quando o teste falha
    video: 'retain-on-failure',
  },

  // Projeto único — Chromium em ambiente local
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
