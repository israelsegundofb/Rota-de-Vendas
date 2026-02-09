# Changelog - Rota de Vendas 🚀

## Versão Atual (3.5.0)

### 🔧 Correções Críticas (Hotfixes)

#### 🗺️ Google Maps API Key Fixed

- **Problema**: Erro 403 (Auth Failure) e `RefererNotAllowedMapError` no mapa.
- **Solução**:
  - API Key vazada foi substituída por uma nova chave segura.
  - Implementado suporte a variáveis de ambiente (`GOOGLE_MAPS_API_KEY`) no `vite.config.ts`.
  - Adicionado fallback hardcoded para garantir funcionamento imediato na apresentação.
  - Removido texto de debug da interface do usuário.
- **Status**: ✅ Mapa carregando perfeitamente com coordenadas precisas.

#### 📊 Bug de Visibilidade de Dados

- **Problema**: Upload de CSV parseava 139 clientes, mas exibia 0 na lista/mapa.
- **Solução**:
  - Correção no parser do CSV para aceitar linhas contendo apenas CNPJ/CPF.
  - Padronização das chaves do objeto `RawClient` (Inglês) para alinhar com o serviço de IA.
  - Ajuste no `geminiService.ts` para preservar dados fiscais (CNPJ/CPF).
- **Status**: ✅ Todos os 139 clientes são exibidos corretamente.

---

## Recursos Implementados Recentemente

### 👥 Hierarquia e Permissões (7 Níveis)

- **Estrutura**: Admin DEV > Admin Geral > Gerente Geral > Gerente Vendas > Supervisor > Vendedor Int/Ext.
- **Regras**: Usuários não podem editar ou excluir superiores.
- **UI**: Badges coloridas e filtros hierárquicos implementados.

### 🛍️ Atribuição de Produtos

- Seleção múltipla de produtos por cliente.
- Sincronização automática com Firebase.
- Filtros visuais no mapa (pino muda de cor/ícone).

### 🏢 Integração CNPJ (BrasilAPI)

- Busca automática de dados da Receita Federal.
- Preenchimento de endereço e Razão Social.
- Atualização em Massa disponível na listagem.

### 📱 Melhorias UX/UI

- Upload de foto de perfil otimizado.
- Interface responsiva.
- Logs de debug detalhados no console para facilitar manutenção.

---

> Atualizado em: 09/02/2026
