# Multi-stage agent-api image. Postgres / Redis / LLM stay outside compose.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV RUN_HTTP=1
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY --from=build /app/dist ./dist
COPY --from=build /app/skills ./skills
COPY --from=build /app/config ./config
USER node
EXPOSE 3100
CMD ["node", "dist/http/server.js"]
