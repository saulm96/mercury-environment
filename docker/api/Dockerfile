FROM node:22-alpine AS base

FROM base AS development
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN npm ci

COPY tsconfig.base.json ./
COPY apps/api/tsconfig.json apps/api/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src/ packages/shared/src/

CMD ["sh", "-c", "cd apps/api && npx tsx watch src/index.ts"]

FROM base AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN npm ci

COPY tsconfig.base.json ./
COPY apps/api/tsconfig.json apps/api/
COPY apps/api/src/ apps/api/src/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src/ packages/shared/src/

RUN cd apps/api && npx tsc

FROM base AS production
WORKDIR /app

COPY --from=build /app/node_modules/ /app/node_modules/
COPY --from=build /app/package.json /app/
COPY --from=build /app/apps/api/dist/ /app/apps/api/dist/
COPY --from=build /app/apps/api/package.json /app/apps/api/
COPY --from=build /app/packages/shared/src/ /app/packages/shared/src/
COPY --from=build /app/packages/shared/package.json /app/packages/shared/

ENV NODE_ENV=production
CMD ["node", "apps/api/dist/index.js"]
