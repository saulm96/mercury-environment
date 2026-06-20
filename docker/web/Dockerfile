FROM node:22-alpine AS base

FROM base AS development
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN npm ci

COPY tsconfig.base.json ./
COPY apps/web/tsconfig.json apps/web/
COPY apps/web/vite.config.ts apps/web/
COPY apps/web/index.html apps/web/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src/ packages/shared/src/

CMD ["sh", "-c", "cd apps/web && npx vite --host --port 3000"]

FROM base AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN npm ci

COPY tsconfig.base.json ./
COPY apps/web/ ./
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src/ packages/shared/src/

RUN cd apps/web && npx tsc && npx vite build

FROM nginx:alpine AS production
COPY --from=build /app/apps/web/dist/ /usr/share/nginx/html/
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
