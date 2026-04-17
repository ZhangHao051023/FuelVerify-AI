# Use Node.js LTS image
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev deps for build)
RUN npm install

# Copy all source files
COPY . .

# Build the frontend
RUN npm run build

# Production image
FROM node:22-slim

WORKDIR /app

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server files
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --production

# Move tsx to dependencies or use node --experimental-strip-types
# Since we are using typescript server.ts, let's use node with strip types
# or install tsx in production.
RUN npm install tsx

EXPOSE 3000

# Start the server
CMD ["npm", "start"]
