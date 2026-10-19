# 🗺️ Rota de Vendas — Plataforma Corporativa de Geomarketing, BI & CRM B2B (V5.2)

Plataforma SaaS corporativa de **Inteligência Geográfica (GIS)**, **Business Intelligence (BI)** e **Gestão de Carteira de Clientes B2B (CRM)** desenvolvida para operações comerciais de distribuição atacadista e vendas em campo.

---

## 🔗 Ambientes em Produção

- **Produção (GitHub Pages):** [https://israelsegundofb.github.io/Rota-de-Vendas/](https://israelsegundofb.github.io/Rota-de-Vendas/)
- **Produção (Firebase Hosting):** [https://gen-lang-client-0586123917.web.app/](https://gen-lang-client-0586123917.web.app/)
- **Desenvolvimento Local:** `http://localhost:3000/Rota-de-Vendas/`

---

## 🚀 Principais Capacidades e Módulos

### 1. Mapa Inteligente de Geomarketing (`ClientMap`)
- Plotagem georreferenciada de **1.697+ clientes B2B** em todo o Brasil com marcadores cromáticos por vendedor e categoria comercial.
- Cálculo de rotas, enlaces diretos com **Google Maps / Street View / Plus Codes** e enriquecimento automático de coordenadas via **CNPJa / Receita Federal (`BrasilAPI` e `Minha Receita`) / ViaCEP**.

### 2. Dashboard Pro de Business Intelligence (`AdminDashboard`)
- **KPIs Dinâmicos e Auditados:** Faturamento Total, Carteira Filtrada, Mix de Produtos (SKUs vendidos) e Vendas Registradas (separando **pedidos distintos** e **linhas de itens**).
- **Cálculo Real de Tendência:** Comparação automática entre a janela de 30 dias mais recente e os 30 dias anteriores da base filtrada.
- **Autoria Histórica de Vendas:** O ranking de performance comercial preserva o vendedor responsável no momento da transação (`p.salespersonId || client.salespersonId`), mesmo após transferências de carteira.
- **Filtros Multidimensionais Simultâneos:** Região, UF, Cidade, CNAE, Vendedor, Modalidade (`Externo`, `Interno`, `Mercado Livre`), Categoria/Seção/SKU de Produto e Intervalo de Datas.

### 3. Gestão de Carteira B2B & Auditoria de Compras (`ClientList` & `SalesHistoryPanel`)
- Virtualização de alta performance (`react-virtuoso`) para renderização instantânea de milhares de clientes.
- Histórico comercial fiel por cliente: preservação de preço unitário histórico, quantidade e data original da venda na importação de planilhas CSV/XLSX, com deduplicação inteligente por assinatura de item.

### 4. Sincronização Cloud & Segurança (`useDataPersistence` & `firebaseService`)
- **Gravação Pós-Confirmada no Firestore:** Os hashes de sincronização só são marcados como salvos após confirmação real (`await saveToCloud(...)`) dos lotes (`batches` de 450 operações), com retentativa automática em caso de oscilação de rede.
- **Regras de Storage Blindadas (`storage.rules`):** Exigência de sessão autenticada, limite de 15 MB por arquivo e validação estrita de tipos MIME (imagens, CSV, Excel e JSON).
- **Proteção de Consultas Comerciais (`cnpjService`):** Cache local persistente de 30 dias + limite de segurança de chamadas comerciais por sessão com fallback transparente para APIs públicas.

### 5. Integração e Exportação Automática para Agendor CRM (`scripts/`)
- [`scripts/generate_agendor_sheets.mjs`](scripts/generate_agendor_sheets.mjs): Enriquecimento fiscal via Receita Federal e geração automatizada de planilhas `.xlsx` e `.csv` no modelo oficial de 30 colunas do **Agendor CRM** (Segmento Automotivo Fortaleza, Distribuidoras Farmacêuticas e Suplementos Alimentares).
- [`scripts/agendor_auto_import.mjs`](scripts/agendor_auto_import.mjs): Sincronização direta via API Oficial Agendor v3 (`POST /v3/organizations?upsert=true`) ou automação via navegador (`Playwright`).

---

## 🛠️ Stack Tecnológica

- **Frontend:** React 19, TypeScript, Vite 7, TailwindCSS, Lucide Icons, Recharts, React Virtuoso, `@vis.gl/react-google-maps`.
- **Backend & Cloud:** Firebase Firestore, Firebase Storage, Firebase Hosting, Express + TypeScript (API Backend / Cloud Run).
- **Testes & Qualidade:** Vitest, Testing Library, TypeScript Strict Check, GitHub Actions CI/CD (Node.js 22).

---

## 💻 Como Executar Localmente

1. **Instalar dependências:**
   ```bash
   npm install
   ```
2. **Iniciar o servidor de desenvolvimento (Vite na porta 3000):**
   ```bash
   npm run dev
   ```
3. **Executar testes unitários e de performance:**
   ```bash
   npm test -- --run
   ```
4. **Gerar build de produção:**
   ```bash
   npm run build
   ```

---

## 🛡️ Ponto de Restauro Oficial

O repositório conta com ponto de restauro versionado para rollback imediato caso necessário:
- **Tag Git:** `ponto-restauro-estavel-v5`
- **Branch de Backup:** `backup/ponto-restauro-estavel`
