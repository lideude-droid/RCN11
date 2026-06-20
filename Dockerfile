# Imagem base leve com Node 20
FROM node:20-alpine

WORKDIR /app

# instala dependências primeiro (cache de build mais rápido)
COPY package*.json ./
RUN npm install --omit=dev

# copia o resto do código (server.js, /public, /lib, /routes)
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
