FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/auth_info_baileys

ENV PORT=3001
ENV AUTH_DIR=/app/auth_info_baileys

EXPOSE 3001

CMD ["node", "dist/index.js"]
