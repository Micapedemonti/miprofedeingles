FROM node:22-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --filter @mi-profe/api...

COPY apps/api/ apps/api/
WORKDIR /app/apps/api
RUN pnpm exec prisma generate --schema prisma/schema.prisma
RUN pnpm run build

EXPOSE 3000
CMD ["node", "dist/src/main.js"]