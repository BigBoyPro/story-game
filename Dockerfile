FROM node:20-alpine

WORKDIR /app

# Copy shared types (needed by server)
COPY shared/ ./shared/

# Copy server files
COPY server/package*.json ./server/
RUN cd server && npm install

COPY server/ ./server/

# Build TypeScript
RUN cd server && npm run build

WORKDIR /app/server

EXPOSE 3000

CMD ["npm", "start"]
