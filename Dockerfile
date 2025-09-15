# -----------------------------------------------------------
# Dependencies stage
# -----------------------------------------------------------o

FROM node:20.19.0-alpine AS deps

WORKDIR /app

# Install build essentials
RUN apk add --no-cache python3 make g++

# Copy package files and prisma schema
COPY package.json package-lock.json ./
    
RUN npm install

# -----------------------------------------------------------o
# Builder stage
# -----------------------------------------------------------

FROM node:20.19.0-alpine AS builder

# Data directory for database
ENV DATABASE_URL=file:/app/vol_data/docker.db

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npm install -g npm@latest

RUN npx nuxt prepare
RUN npx prisma generate
RUN npm run build

# CMD ["tail", "-f", "/dev/null"]

# -----------------------------------------------------------
# Production stage
# -----------------------------------------------------------

FROM node:20.19.0-alpine AS production

# # Data directory for database
ENV DATABASE_URL=file:/app/vol_data/docker.db

WORKDIR /app

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/generated/prisma ./generated/prisma

# Copier les fichiers Prisma et scripts nécessaires
COPY init-db.sh .
COPY --from=builder /app/prisma /app/prisma
COPY --from=builder /app/scripts /app/scripts

RUN mkdir upload && mkdir upload/screenshots && mkdir temp && mkdir temp/exports

EXPOSE 3000

# Utiliser le script d'initialisation comme point d'entrée
ENTRYPOINT ["/app/init-db.sh"]

CMD ["node", ".output/server/index.mjs"]