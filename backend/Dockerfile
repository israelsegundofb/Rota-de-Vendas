# Usar a imagem oficial do Node.js 22 (versão leve)
FROM node:22-slim

# Definir o diretório de trabalho dentro do container
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências (incluindo as de desenvolvimento para o build)
RUN npm install

# Copiar o restante do código fonte
COPY . .

# Gerar o build do TypeScript
RUN npm run build

# Remover dependências de desenvolvimento para economizar espaço
RUN npm prune --production

# Definir variável de ambiente padrão (Cloud Run injeta a PORT automaticamente, mas definimos 8080 como fallback)
ENV PORT=8080
ENV NODE_ENV=production

# Expor a porta 8080 por padrão
EXPOSE 8080

# Comando para iniciar o servidor
# Comando para iniciar o servidor diretamente
CMD ["node", "dist/index.js"]
