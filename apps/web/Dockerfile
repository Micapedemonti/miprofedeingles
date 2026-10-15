    FROM node:22-slim AS build
    RUN corepack enable
    WORKDIR /app
    
    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
    COPY apps/api/package.json apps/api/
    COPY apps/web/package.json apps/web/
    COPY packages/ packages/
    RUN pnpm install --frozen-lockfile --filter @mi-profe/web...
    
    COPY apps/web/ apps/web/
    WORKDIR /app/apps/web
    RUN pnpm run build
    
    FROM nginx:alpine
    COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
    COPY --from=build /app/apps/web/dist /usr/share/nginx/html

    EXPOSE 80
  