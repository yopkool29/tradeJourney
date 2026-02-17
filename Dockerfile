# -----------------------------------------------------------
# Dependencies stage
# -----------------------------------------------------------

FROM node:20.19.0-alpine AS deps

WORKDIR /app

# Install build essentials
RUN apk add --no-cache python3 make g++

# Copy package files and prisma schema
COPY package.json package-lock.json ./
    
RUN npm install

# -----------------------------------------------------------
# Builder stage
# -----------------------------------------------------------

FROM node:20.19.0-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

COPY . .

COPY .env.production .env

RUN npm install -g npm@latest

RUN npx nuxt prepare
RUN npx prisma generate --schema=prisma/auth/schema.prisma
RUN npx prisma generate --schema=prisma/data/schema.prisma
RUN npm run build

# CMD ["tail", "-f", "/dev/null"]

# -----------------------------------------------------------
# Production stage
# -----------------------------------------------------------

FROM node:20.19.0-alpine AS production

# Install netcat for PostgreSQL readiness check and postgresql-client for psql
RUN apk add --no-cache netcat-openbsd postgresql-client

WORKDIR /app

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma /app/prisma
# COPY --from=builder /app/generated/prisma  ./generated/prisma
COPY --from=builder /app/generated/prisma-auth ./generated/prisma-auth
COPY --from=builder /app/generated/prisma-data ./generated/prisma-data

# Copier les scripts nécessaires
COPY --from=builder /app/scripts /app/scripts

# Convert line endings from CRLF to LF and make executable
RUN apk add --no-cache dos2unix && \
    dos2unix /app/scripts/docker-init-db.sh && \
    chmod +x /app/scripts/docker-init-db.sh && \
    apk del dos2unix
COPY --from=builder /app/server-start.mjs /app/server-start.mjs

EXPOSE 3000

# Utiliser le script d'initialisation comme point d'entrée
ENTRYPOINT ["/app/scripts/docker-init-db.sh"]

CMD ["node", "server-start.mjs"]