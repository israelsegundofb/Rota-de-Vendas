# Build Stage
FROM node:22-alpine as build

WORKDIR /app

# Variáveis de ambiente para o Vite (Build time)
# Estas devem ser passadas como build-args no Cloud Build
ARG VITE_GOOGLE_API_KEY
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_RECAPTCHA_SITE_KEY

ENV VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM nginx:alpine

# Copia o template de configuração para a pasta que o Nginx processa automaticamente
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build /app/dist /usr/share/nginx/html

# Porta padrão enviada pelo Cloud Run (8080)
ENV PORT 8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
