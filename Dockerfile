# Stage 1: Build the frontend
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production environment
FROM node:23-slim
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm install --production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src ./src

# Expose the port used by server.ts
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the server using Node's built-in TS support
CMD ["node", "server.ts"]
