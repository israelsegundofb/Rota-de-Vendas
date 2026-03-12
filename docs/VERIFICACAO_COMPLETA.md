# Verificação Completa — Sistema Rota-de-Vendas

Data: 2026-03-12

## Escopo da verificação

- Frontend (React + Vite + TypeScript).
- Backend (Express + TypeScript).
- Qualidade estática (ESLint / TypeScript).
- Testes automatizados existentes (Vitest).
- Build de produção (frontend e backend).
- Segurança de dependências (`npm audit`) e revisão rápida de superfícies sensíveis.

## Resultado executivo

- **Status geral:** sistema **compilando e testando com sucesso**, porém com **dívida técnica relevante** em lint e **riscos de segurança** que devem ser priorizados.
- **Criticidade atual:** **Média/Alta** (devido a credenciais fracas/hardcoded no frontend e vulnerabilidades `high` em dependências).

## Evidências técnicas

### 1) Qualidade estática

- `npm run lint` executou sem erros fatais, porém com **153 warnings** (muitos `no-explicit-any`, `no-unused-vars` e `react-hooks/exhaustive-deps`).
- O pipeline hoje permite warnings sem falhar.

### 2) Type safety

- `npm run typecheck` concluiu com sucesso.
- `backend npm run build` (TS compile) concluiu com sucesso.

### 3) Testes

- `npm test -- --run`: **2 arquivos / 8 testes / 100% passando**.
- Cobertura funcional ainda limitada para o tamanho do sistema.

### 4) Build de produção

- `npm run build` concluiu com sucesso.
- Build reportou alerta de chunk principal acima de 1000kB (`dist/assets/index-*.js`), com impacto potencial de performance inicial.

### 5) Segurança de dependências

#### Frontend (`npm audit --omit=dev`)

- **2 vulnerabilidades high**:
  - `minimatch` (ReDoS) com correção disponível via `npm audit fix`.
  - `xlsx` (Prototype Pollution/ReDoS) **sem correção disponível** na linha atual.

#### Backend (`npm audit --omit=dev`)

- **9 vulnerabilidades (8 low, 1 high)**:
  - `fast-xml-parser` (DoS/stack overflow) com correção via `npm audit fix`.
  - Cadeia transitiva ligada a `firebase-admin` com sugestão de correção potencialmente breaking (`npm audit fix --force`).

## Achados de código (segurança e robustez)

1. **Credenciais hardcoded e triviais no frontend** (usuários iniciais com senha `123`).
2. **Fluxo de autenticação com bypass de contingência para admin (`admin`/`123`)** no login.
3. **Comparação de senha em texto puro** no cliente (sem hash/servidor).
4. **Backend com CORS aberto (`origin: '*'`)** e cabeçalho de API key aceito por request, sem política de origem restrita.
5. **Log parcial de chave API no backend** (prefixo dos 6 primeiros caracteres), o que aumenta exposição em logs.

## Recomendações priorizadas

### Prioridade P0 (imediato)

- Remover credenciais hardcoded e fallback admin de emergência no frontend.
- Migrar autenticação para backend com senha hash (`argon2`/`bcrypt`) e sessão/token.
- Não registrar partes de chaves sensíveis em log.
- Restringir CORS para domínios permitidos por ambiente.

### Prioridade P1 (curto prazo)

- Tratar `npm audit` com atualização controlada de dependências (especialmente cadeia do backend).
- Avaliar substituição/isolamento do `xlsx` em operações sensíveis até existir fix.
- Elevar qualidade de lint: reduzir `any`, corrigir hooks com deps inconsistentes, remover código morto.

### Prioridade P2 (médio prazo)

- Expandir testes automatizados (auth, importação de dados, persistência, rotas críticas).
- Reduzir tamanho do bundle inicial via code splitting efetivo e revisão de imports dinâmicos/estáticos conflitantes.
- Definir gate de CI com critérios mínimos (`lint` sem warnings críticos, testes, build, audit baseline).

## Conclusão

O sistema está **operacional** do ponto de vista de build e testes existentes, mas requer **endurecimento de segurança e melhoria de qualidade** antes de ser considerado pronto para ambiente de produção sensível.
