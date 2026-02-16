# Guia de Contribuição - Rota de Vendas

Bem-vindo ao projeto Rota de Vendas! Este documento visa orientar sobre como contribuir com o projeto de forma organizada e segura.

## Estrutura do Projeto

- **/components**: Componentes React reutilizáveis.
- **/hooks**: Custom hooks (lógica de negócios e utilitários).
- **/services**: Integrações com APIs (BrasilAPI, Google Maps, etc).
- **/utils**: Funções auxiliares e constantes.

## Fluxo de Desenvolvimento

1. **Crie uma Branch**: Sempre trabalhe em uma branch separada da `main`.

   ```bash
   git checkout -b feature/minha-nova-feature
   ```

2. **Desenvolva e Teste**: Escreva seu código e garanta que ele funciona.
   - Utilize componentes existentes sempre que possível.
   - Mantenha o estilo de código consistente (Prettier/ESLint).

3. **Valide Antes de Enviar**:
   Antes de abrir um Pull Request, execute o script de validação completo:

   ```bash
   npm run validate
   ```

   Este script roda:
   - `lint`: Verifica estilo e erros estáticos.
   - `typecheck`: Verifica tipagem do TypeScript.
   - `test`: Roda testes unitários (Vitest).

## Testes

Utilizamos `Vitest` para testes unitários.

- Para rodar testes: `npm test`
- Para rodar com interface: `npm test -- --ui`

## Deploy

O deploy é realizado automaticamente via Vercel/Netlify (configurar conforme ambiente) ao realizar merge na `main`.

---

**Dúvidas?** Entre em contato com o responsável técnico do projeto.
