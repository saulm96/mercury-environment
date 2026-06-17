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
COPY apps/web/next.config.js apps/web/
COPY apps/web/postcss.config.mjs apps/web/
COPY apps/web/tailwind.config.ts apps/web/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src/ packages/shared/src/

CMD ["sh", "-c", "cd apps/web && npx next dev -H 0.0.0.0 -p 3000"]

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

RUN cd apps/web && npx next build

FROM base AS production
WORKDIR /app

COPY --from=build /app/apps/web/.next/standalone/ /app/
COPY --from=build /app/apps/web/.next/static/ /app/.next/static/
COPY --from=build /app/apps/web/public/ /app/public/

ENV NODE_ENV=production
CMD ["node", "server.js"]
