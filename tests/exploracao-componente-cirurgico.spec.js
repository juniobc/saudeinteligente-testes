// Spec de Exploração — Módulo Componente Cirúrgico (AIH) — Fase 3
// Guardian — Expandir sidebar e explorar menu completo

import { test, expect } from '@playwright/test';
import { captureScreenshot } from '../tools/screenshot-helper.js';
import { inspectPage, getPageStructure } from '../tools/dom-inspector.js';

test.describe('Exploração — Componente Cirúrgico (Fase 3)', () => {

  test('Expandir sidebar e encontrar opção de AIH', async ({ page }) => {
    // Navegar para Componente Cirúrgico
    await page.goto('/select-sistemas');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const cardPATE = page.locator('h4', { hasText: /PATE|Especializada/i });
    await cardPATE.waitFor({ state: 'visible', timeout: 10000 });
    await cardPATE.click();

    await page.waitForURL(/\/sistemas/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const cardCirurgico = page.locator('.card-link', { hasText: /Componente Cir|Cirúrgico/i }).first();
    await cardCirurgico.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('[EXPLORAÇÃO] URL:', page.url());

    // ========================================
    // ETAPA 1: Expandir o sidebar colapsado
    // ========================================

    // Procurar o botão de toggle do sidebar
    const toggleBtn = page.locator('.horizontal-navtoggle, .hor-toggle, [class*="toggle"]').first();
    const toggleVisivel = await toggleBtn.isVisible().catch(() => false);
    console.log('[EXPLORAÇÃO] Botão toggle sidebar visível:', toggleVisivel);

    if (toggleVisivel) {
      await toggleBtn.click();
      await page.waitForTimeout(1000);
      console.log('[EXPLORAÇÃO] Sidebar expandido via toggle');
    }

    // Verificar se o body ainda tem sidebar-collapsed
    const bodyClasses = await page.evaluate(() => document.body.className);
    console.log('[EXPLORAÇÃO] Classes do body após toggle:', bodyClasses);

    // Se ainda colapsado, tentar hover no sidebar para expandir
    if (bodyClasses.includes('sidebar-collapsed')) {
      const sidebar = page.locator('.app-sidebar');
      await sidebar.hover();
      await page.waitForTimeout(1000);
      console.log('[EXPLORAÇÃO] Hover no sidebar');
    }

    await captureScreenshot(page, 'comp-cirurgico', '08-sidebar-expandido');

    // ========================================
    // ETAPA 2: Explorar conteúdo do sidebar após expansão
    // ========================================
    const sidebarContent = await page.evaluate(() => {
      const sidebar = document.querySelector('.app-sidebar, .main-sidebar, .main-menu-container');
      if (!sidebar) return { found: false };

      // Pegar TODO o HTML do sidebar para entender a estrutura
      const html = sidebar.innerHTML;

      // Pegar todos os textos visíveis
      const allText = sidebar.innerText;

      // Pegar todos os links
      const links = Array.from(sidebar.querySelectorAll('a')).map(a => ({
        text: (a.innerText || '').trim(),
        href: a.getAttribute('href') || '',
        classes: Array.from(a.classList).join(' ')
      })).filter(a => a.text);

      // Pegar todos os li
      const lis = Array.from(sidebar.querySelectorAll('li')).map(li => ({
        text: (li.innerText || '').trim().substring(0, 100),
        classes: Array.from(li.classList).join(' '),
        hasSubmenu: li.querySelectorAll('ul, .sub-menu, [class*="sub"]').length > 0
      })).filter(li => li.text);

      // Pegar spans com texto (podem ser labels de menu)
      const spans = Array.from(sidebar.querySelectorAll('span')).map(s => ({
        text: (s.innerText || '').trim(),
        classes: Array.from(s.classList).join(' ')
      })).filter(s => s.text && s.text.length > 1);

      return { found: true, allText: allText.substring(0, 2000), links, lis, spans };
    });

    console.log('[EXPLORAÇÃO] Sidebar encontrado:', sidebarContent.found);
    console.log('[EXPLORAÇÃO] Texto do sidebar:', JSON.stringify(sidebarContent.allText));
    console.log('[EXPLORAÇÃO] Links do sidebar:', JSON.stringify(sidebarContent.links));
    console.log('[EXPLORAÇÃO] LIs do sidebar:', JSON.stringify(sidebarContent.lis));
    console.log('[EXPLORAÇÃO] Spans do sidebar:', JSON.stringify(sidebarContent.spans));

    // ========================================
    // ETAPA 3: Explorar as tabs/abas da página
    // ========================================
    const tabs = await page.locator('.nav-link, [role="tab"]').allTextContents();
    console.log('[EXPLORAÇÃO] Tabs/abas:', JSON.stringify(tabs.filter(t => t.trim())));

    // Clicar na aba "Perfil das Internações" se existir
    const tabInternacoes = page.locator('.nav-link', { hasText: /Perfil|Internações|Internação/i }).first();
    const tabInternacoesVisivel = await tabInternacoes.isVisible().catch(() => false);
    if (tabInternacoesVisivel) {
      console.log('[EXPLORAÇÃO] Clicando na aba Perfil das Internações...');
      await tabInternacoes.click();
      await page.waitForTimeout(2000);
      await captureScreenshot(page, 'comp-cirurgico', '09-aba-internacoes');

      const estruturaInternacoes = await getPageStructure(page);
      console.log('[EXPLORAÇÃO] Estrutura aba internações:', JSON.stringify(estruturaInternacoes.headings));
    }

    // ========================================
    // ETAPA 4: Procurar por TODAS as rotas possíveis do módulo
    // ========================================
    // Verificar se há links para outras páginas dentro do módulo
    const allHrefs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: (a.innerText || '').trim(), href: a.getAttribute('href') }))
        .filter(a => a.href && !a.href.startsWith('#') && !a.href.startsWith('javascript'));
    });
    console.log('[EXPLORAÇÃO] Todos os hrefs:', JSON.stringify(allHrefs));

    // Tentar navegar diretamente para rotas prováveis de AIH
    const rotasPossiveis = [
      '/cirurgiaeletiva/dashboard/aih',
      '/cirurgiaeletiva/dashboard/cad_aih',
      '/cirurgiaeletiva/dashboard/cadastro_aih',
      '/cirurgiaeletiva/aih',
      '/cirurgiaeletiva/dashboard/consulta_cadastro',
      '/cirurgiaeletiva/dashboard/internacao',
      '/cirurgiaeletiva/dashboard/solicitacao',
    ];

    for (const rota of rotasPossiveis) {
      await page.goto(rota);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      const urlFinal = page.url();
      const titulo = await page.title();
      const h1 = await page.locator('h1, h2, h3, h4, h5').first().textContent().catch(() => '');
      console.log(`[EXPLORAÇÃO] Rota ${rota} → URL: ${urlFinal} | Título: ${titulo} | H: ${h1}`);

      if (!urlFinal.includes('/login') && !urlFinal.includes('/select-sistemas') && urlFinal !== 'http://localhost:5173/cirurgiaeletiva/dashboard') {
        console.log(`[EXPLORAÇÃO] ✅ Rota ${rota} parece válida!`);
        await captureScreenshot(page, 'comp-cirurgico', `10-rota-${rota.replace(/\//g, '-')}`);

        // Inspecionar a página
        const inspecao = await inspectPage(page);
        console.log(`[EXPLORAÇÃO] Elementos: ${inspecao.elements?.length}, Forms: ${inspecao.forms?.length}, Tabelas: ${inspecao.tables?.length}`);
      }
    }

    expect(true).toBe(true);
  });
});
