// Exploração — Config OCI Amapá — Abrir especialidade e ver procedimentos/exames
import { test } from '@playwright/test';

test.use({ storageState: undefined });

test('Explorar procedimentos e exames OCI Amapá', async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await context.clearCookies();
  
  // Login Amapá
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  const combo = page.locator('#municipio-select');
  if (await combo.isVisible({ timeout: 3000 }).catch(() => false)) {
    await combo.selectOption('br_amapa');
    await page.waitForTimeout(500);
  }
  await page.locator('#signin-username').fill('47818111085');
  await page.locator('#signin-password').fill('#12admin34$');
  await page.locator('button.btn-login').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
  await page.waitForTimeout(3000);
  
  // PATE → OCI
  const cardPATE = page.locator('h4').filter({ hasText: /PATE|Especializada/i });
  await cardPATE.waitFor({ state: 'visible', timeout: 10000 });
  await cardPATE.click();
  await page.waitForTimeout(2000);
  const cardOCI = page.locator('.card-link').filter({ hasText: /Ofertas de Cuidados|OCI/i }).first();
  await cardOCI.waitFor({ state: 'visible', timeout: 10000 });
  await cardOCI.click();
  await page.waitForURL(/\/oci\//, { timeout: 15000 });
  await page.waitForTimeout(2000);
  
  // Ir direto pra Config OCI
  console.log('[GUARDIAN] Navegando para Config OCI...');
  await page.goto('http://localhost:5173/oci/dashboard/config_oci');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'reports/screenshots/amapa-config-01-tela.png', fullPage: true });
  
  // Clicar no accordion de Oftalmologia
  console.log('[GUARDIAN] Abrindo accordion Oftalmologia...');
  const accordionOftalmo = page.locator('.accordion-button').filter({ hasText: /Oftalmologia/i });
  await accordionOftalmo.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'reports/screenshots/amapa-config-02-oftalmo-aberto.png', fullPage: true });
  
  // Capturar conteúdo do accordion aberto
  const accordionContent = page.locator('.accordion-collapse.show, .accordion-body').first();
  if (await accordionContent.isVisible({ timeout: 3000 }).catch(() => false)) {
    const content = await accordionContent.textContent();
    console.log('[GUARDIAN] Conteúdo Oftalmologia (500 chars):', content.substring(0, 500));
    
    // Procurar linhas de cuidado dentro
    const linhas = await accordionContent.locator('tr, .list-group-item, .card, button').allTextContents();
    console.log('[GUARDIAN] Itens dentro do accordion:');
    linhas.forEach((l, i) => console.log(`  [${i}] ${l.trim().substring(0, 100)}`));
  }
  
  // Procurar e clicar numa linha de cuidado pra ver os procedimentos
  console.log('[GUARDIAN] Procurando linhas de cuidado...');
  const linhaBtn = page.locator('button, a, tr').filter({ hasText: /AVALIACAO INICIAL.*OFTALMOLOGIA.*9/i }).first();
  if (await linhaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('[GUARDIAN] Clicando na linha "Oftalmo ≥9 anos"...');
    await linhaBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'reports/screenshots/amapa-config-03-linha-aberta.png', fullPage: true });
    
    // Capturar procedimentos/exames
    const procs = await page.locator('table, .modal, .card-body').allTextContents();
    console.log('[GUARDIAN] Procedimentos (500 chars):', procs.join(' ').substring(0, 500));
  } else {
    // Tentar clicar em qualquer item dentro do accordion
    const anyItem = page.locator('.accordion-body button, .accordion-body a, .accordion-body tr').first();
    if (await anyItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      const itemText = await anyItem.textContent();
      console.log('[GUARDIAN] Clicando no primeiro item:', itemText.trim().substring(0, 100));
      await anyItem.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'reports/screenshots/amapa-config-03-item-clicado.png', fullPage: true });
    }
  }
  
  // Capturar screenshot final com tudo aberto
  await page.screenshot({ path: 'reports/screenshots/amapa-config-04-final.png', fullPage: true });
  
  // Agora explorar a tela de Consulta/Cadastro OCI pra ver como solicitar exame
  console.log('[GUARDIAN] Indo para Consulta/Cadastro OCI...');
  await page.goto('http://localhost:5173/oci/dashboard/consulta_cadastro');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'reports/screenshots/amapa-config-05-consulta-cadastro.png', fullPage: true });
  
  // Clicar em "Solicitar OCI" pra ver o formulário
  const btnSolicitar = page.getByText('Solicitar OCI');
  if (await btnSolicitar.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('[GUARDIAN] Clicando em Solicitar OCI...');
    await btnSolicitar.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'reports/screenshots/amapa-config-06-modal-especialidades.png', fullPage: true });
    
    // Selecionar Oftalmologia
    const espOftalmo = page.locator('.especialidade-option, .card, button').filter({ hasText: /Oftalmologia/i }).first();
    if (await espOftalmo.isVisible({ timeout: 3000 }).catch(() => false)) {
      await espOftalmo.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'reports/screenshots/amapa-config-07-formulario-oci.png', fullPage: true });
      
      // Capturar campos do formulário
      const formFields = await page.locator('.modal [data-field-name], .modal [name], .modal label').evaluateAll(
        els => els.map(e => ({ 
          tag: e.tagName, 
          name: e.getAttribute('name') || e.getAttribute('data-field-name') || '',
          text: e.textContent.trim().substring(0, 50)
        }))
      );
      console.log('[GUARDIAN] Campos do formulário:');
      formFields.forEach(f => console.log(`  [${f.tag}] name="${f.name}" text="${f.text}"`));
    }
  }
  
  // Pausar 60s
  console.log('[GUARDIAN] Pausando 60s...');
  await page.waitForTimeout(60000);
  
  await context.close();
});
