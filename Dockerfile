# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
# Install build tooling required for native dependencies such as sharp
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        build-essential \
    && rm -rf /var/lib/apt/lists/*
USER node
# Install server dependencies without dev packages
COPY --chown=node:node server/package.json ./package.json
COPY --chown=node:node server/package-lock.json ./package-lock.json
RUN npm ci --omit=dev

FROM base AS runner
# Install runtime libraries only
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libvips42 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node server ./

USER node
EXPOSE 3000
CMD ["node", "index.js"]
