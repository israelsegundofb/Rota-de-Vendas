/**
 * Automação de Cadastro no Agendor CRM (https://beta.agendor.com.br/organizations)
 *
 * Modos de operação:
 * 1. Via API Oficial do Agendor v3 (Ultra-rápido e sem necessidade de navegador):
 *    Defina a variável de ambiente AGENDOR_API_TOKEN (encontrada em Agendor -> Configurações -> Integrações -> API)
 *    Exemplo:
 *      $env:AGENDOR_API_TOKEN="seu-token-aqui"; node scripts/agendor_auto_import.mjs
 *
 * 2. Via Automação de Navegador (Playwright) direto em https://beta.agendor.com.br/organizations:
 *    Abre o navegador visível na tela de Organizações do Agendor para realizar o upload automático
 *    da planilha gerada (Exportacoes_Sistema/Planilha_Modelo_Agendor_Completa.csv).
 *    Exemplo:
 *      node scripts/agendor_auto_import.mjs --browser
 */

import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const CSV_FILE = path.resolve('Exportacoes_Sistema/Planilha_Modelo_Agendor_Completa.csv');
const AGENDOR_API_URL = 'https://api.agendor.com.br/v3/organizations';
const AGENDOR_WEB_URL = 'https://beta.agendor.com.br/organizations';

async function importViaApi(token) {
  console.log('🚀 Iniciando cadastro automático via API Oficial do Agendor v3...');
  const workbook = XLSX.readFile(CSV_FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  console.log(`Total de empresas carregadas da planilha: ${rows.length}`);
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = r['Nome '] || r['Nome'] || r['Razão Social'];
    if (!name) continue;

    const payload = {
      name: String(name).trim(),
      legalName: String(r['Razão Social'] || name).trim(),
      cnpj: r['CNPJ'] ? String(r['CNPJ']).replace(/\D/g, '') : undefined,
      description: r['Descrição'] || undefined,
      ranking: Number(r['Ranking']) || 4,
      contact: {
        email: r['E-mail'] || undefined,
        work: r['Telefone'] || undefined,
        mobile: r['Celular'] || undefined,
        whatsapp: r['WhatsApp'] || undefined,
        facebook: r['Facebook'] || undefined,
        instagram: r['Instagram'] || undefined,
        linkedin: r['LinkedIn'] || undefined
      },
      address: {
        postal_code: r['CEP'] ? String(r['CEP']).replace(/\D/g, '') : undefined,
        country: r['País'] || 'Brasil',
        state: r['Estado'] || 'CE',
        city: r['Cidade'] || 'Fortaleza',
        district: r['Bairro'] || undefined,
        street_name: r['Rua'] || undefined,
        street_number: r['Número'] && !Number.isNaN(Number(r['Número'])) ? Number(r['Número']) : undefined,
        additional_info: r['Complemento'] || undefined
      }
    };

    try {
      const res = await fetch(`${AGENDOR_API_URL}?upsert=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        successCount++;
        if (successCount % 25 === 0 || i === rows.length - 1) {
          console.log(`✅ [${i + 1}/${rows.length}] ${successCount} empresas cadastradas/atualizadas no Agendor...`);
        }
      } else {
        errorCount++;
        const errBody = await res.text();
        console.warn(`⚠️ [${i + 1}/${rows.length}] Falha ao cadastrar "${name}" (HTTP ${res.status}): ${errBody.slice(0, 140)}`);
      }
    } catch (err) {
      errorCount++;
      console.error(`❌ Erro de rede ao cadastrar "${name}":`, err.message);
    }

    // Respeitar rate-limit da API do Agendor (~4 req/s)
    await new Promise(resolve => setTimeout(resolve, 260));
  }

  console.log('\n=========================================');
  console.log(`🎉 Sincronização com Agendor concluída!`);
  console.log(`- Sucessos: ${successCount}`);
  console.log(`- Falhas:   ${errorCount}`);
  console.log('=========================================');
}

async function importViaBrowser() {
  console.log('🌐 Iniciando automação de navegador para https://beta.agendor.com.br/organizations ...');
  const { chromium } = await import('playwright');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log(`Abrindo ${AGENDOR_WEB_URL}...`);
  await page.goto(AGENDOR_WEB_URL, { waitUntil: 'domcontentloaded' });

  console.log('ℹ️ Caso o Agendor solicite login, autentique-se na janela aberta.');
  console.log(`📂 Planilha pronta para upload automático: ${CSV_FILE}`);

  // Aguarda até que o usuário esteja logado na tela de organizações (até 3 minutos)
  try {
    await page.waitForURL('**/organizations**', { timeout: 180000 });
    await page.waitForTimeout(3000);

    // Tenta localizar botão de Importar / Mais ações e anexar o CSV automaticamente
    const fileInput = page.locator('input[type="file"]');
    if ((await fileInput.count()) > 0) {
      await fileInput.first().setInputFiles(CSV_FILE);
      console.log('✅ Planilha anexada automaticamente ao Agendor!');
    } else {
      console.log('👉 Clique em "Importar empresas" no Agendor e selecione o arquivo:');
      console.log(`   ${CSV_FILE}`);
    }
  } catch {
    console.log('⏱️ Tempo de espera encerrado.');
  }
}

async function run() {
  const token = process.env.AGENDOR_API_TOKEN;
  const useBrowser = process.argv.includes('--browser');

  if (token && !useBrowser) {
    await importViaApi(token);
  } else if (useBrowser) {
    await importViaBrowser();
  } else {
    console.log('ℹ️ Para cadastrar automaticamente via API do Agendor, informe o token:');
    console.log('   $env:AGENDOR_API_TOKEN="SEU_TOKEN"; node scripts/agendor_auto_import.mjs');
    console.log('ℹ️ Ou para abrir o navegador direto em https://beta.agendor.com.br/organizations:');
    console.log('   node scripts/agendor_auto_import.mjs --browser');
  }
}

run();
