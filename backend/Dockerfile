FROM node:22-alpine

WORKDIR /app

# Copy Gateway source
COPY Gateway/ ./Gateway/
# Copy Company source
COPY Company/ ./Company/

# Install Gateway dependencies
WORKDIR /app/Gateway
RUN npm ci --omit=dev

# Install Company dependencies
WORKDIR /app/Company
RUN npm ci --omit=dev

# Install process manager
RUN npm install -g concurrently

WORKDIR /app

EXPOSE 3000

CMD ["sh", "-c", "cd /app/Company && PORT=3002 node server.js & cd /app/Gateway && PORT=3000 node server.js & wait"]