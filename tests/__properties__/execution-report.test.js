// Teste unitário — generateExecutionReport
// Valida que a função gera relatório JSON correto em reports/{data}-execucao.json
//
// **Valida: Requisitos 13.3, 13.5**

import { test, expect } from '@playwright/test';
import { readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateExecutionReport } from '../../tools/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const reportsDir = join(__dirname, '..', '..', 'reports');

test.describe('generateExecutionReport — Relatório de Execução', () => {
  let generatedFile = '';

  test.afterEach(async () => {
    // Limpar arquivo gerado após cada teste
    if (generatedFile) {
      try {
        await rm(generatedFile);
      } catch { /* ignora se não existir */ }
      generatedFile = '';
    }
  });

  test('gera relatório JSON com estrutura correta para resultados válidos', async () => {
    const testResults = [
      {
        spec: 'oci-nova-solicitacao.spec.js',
        nome: 'Req 3.1 - Botão Solicitar OCI abre modal',
        status: 'passou',
        duracao: '4.2s',
        screenshotAntes: 'reports/screenshots/antes.png',
        screenshotDepois: 'reports/screenshots/depois.png',
        consoleLogs: [],
        consoleErrors: false,
      },
      {
        spec: 'oci-listagem.spec.js',
        nome: 'Req 2.1 - Listagem carrega dados',
        status: 'falhou',
        duracao: '6.8s',
        screenshotAntes: 'reports/screenshots/antes2.png',
        screenshotDepois: '',
        consoleLogs: ['TypeError: Cannot read property'],
        consoleErrors: true,
        erro: 'Timeout ao aguardar tabela',
      },
    ];

    const consoleLogs = {
      errosJS: ['TypeError: Cannot read property'],
      warnings: ['Deprecation warning'],
      falhasAPI: ['GET /api/oci 500'],
    };

    generatedFile = await generateExecutionReport(testResults, consoleLogs);

    // Verifica que retornou caminho do arquivo
    expect(generatedFile).toBeTruthy();
    expect(generatedFile).toContain('execucao.json');

    // Lê e parseia o JSON gerado
    const conteudo = await readFile(generatedFile, 'utf-8');
    const relatorio = JSON.parse(conteudo);

    // Estrutura principal
    expect(relatorio).toHaveProperty('dataExecucao');
    expect(relatorio).toHaveProperty('duracao');
    expect(relatorio).toHaveProperty('totalTestes', 2);
    expect(relatorio).toHaveProperty('passou', 1);
    expect(relatorio).toHaveProperty('falhou', 1);
    expect(relatorio).toHaveProperty('testes');
    expect(relatorio).toHaveProperty('logsConsole');

    // dataExecucao é ISO 8601
    expect(() => new Date(relatorio.dataExecucao)).not.toThrow();
    expect(new Date(relatorio.dataExecucao).toISOString()).toBe(relatorio.dataExecucao);

    // Duração formatada
    expect(relatorio.duracao).toMatch(/^\d+s$|^\d+m \d+s$/);

    // Testes individuais
    expect(relatorio.testes).toHaveLength(2);
    expect(relatorio.testes[0].spec).toBe('oci-nova-solicitacao.spec.js');
    expect(relatorio.testes[0].status).toBe('passou');
    expect(relatorio.testes[1].status).toBe('falhou');
    expect(relatorio.testes[1]).toHaveProperty('erro', 'Timeout ao aguardar tabela');

    // Logs de console
    expect(relatorio.logsConsole.errosJS).toEqual(['TypeError: Cannot read property']);
    expect(relatorio.logsConsole.warnings).toEqual(['Deprecation warning']);
    expect(relatorio.logsConsole.falhasAPI).toEqual(['GET /api/oci 500']);
  });

  test('gera relatório válido com arrays vazios', async () => {
    generatedFile = await generateExecutionReport([], {});

    const conteudo = await readFile(generatedFile, 'utf-8');
    const relatorio = JSON.parse(conteudo);

    expect(relatorio.totalTestes).toBe(0);
    expect(relatorio.passou).toBe(0);
    expect(relatorio.falhou).toBe(0);
    expect(relatorio.testes).toEqual([]);
    expect(relatorio.duracao).toBe('0s');
    expect(relatorio.logsConsole).toEqual({ errosJS: [], warnings: [], falhasAPI: [] });
  });

  test('trata inputs inválidos com graciosidade', async () => {
    generatedFile = await generateExecutionReport(null, undefined);

    const conteudo = await readFile(generatedFile, 'utf-8');
    const relatorio = JSON.parse(conteudo);

    expect(relatorio.totalTestes).toBe(0);
    expect(relatorio.testes).toEqual([]);
    expect(relatorio.logsConsole).toEqual({ errosJS: [], warnings: [], falhasAPI: [] });
  });

  test('nome do arquivo segue padrão {YYYY-MM-DD}-execucao.json', async () => {
    generatedFile = await generateExecutionReport([], {});

    const hoje = new Date().toISOString().slice(0, 10);
    expect(generatedFile).toContain(`${hoje}-execucao.json`);
  });

  test('calcula duração total corretamente para múltiplos testes', async () => {
    const testResults = [
      { spec: 'a.spec.js', nome: 'T1', status: 'passou', duracao: '30.5s' },
      { spec: 'b.spec.js', nome: 'T2', status: 'passou', duracao: '45.5s' },
      { spec: 'c.spec.js', nome: 'T3', status: 'falhou', duracao: '50s' },
    ];

    generatedFile = await generateExecutionReport(testResults, {});

    const conteudo = await readFile(generatedFile, 'utf-8');
    const relatorio = JSON.parse(conteudo);

    // 30.5 + 45.5 + 50 = 126s = 2m 6s
    expect(relatorio.duracao).toBe('2m 6s');
    expect(relatorio.totalTestes).toBe(3);
    expect(relatorio.passou).toBe(2);
    expect(relatorio.falhou).toBe(1);
  });
});
