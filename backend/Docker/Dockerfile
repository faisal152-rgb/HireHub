FROM node:22-alpine

ARG SERVICE

WORKDIR /app

COPY ${SERVICE}/package*.json ./
RUN npm ci --omit=dev

COPY ${SERVICE}/ ./

CMD ["node", "server.js"]
