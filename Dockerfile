# syntax=docker/dockerfile:1
# API SAFRA (Node.js + Express). Somente dependências de produção, usuário sem privilégios.
FROM node:24.19.0-alpine3.24
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY src/ src/
# Cliente administrativo interno: docker compose exec api npm run java:shutdown
COPY scripts/shutdown-java.js scripts/shutdown-java.js
RUN mkdir -p /app/uploads/profile && chown -R node:node /app/uploads
USER node
EXPOSE 4000
# As migrations são idempotentes e registradas em schema_migrations: aplicar no início não apaga dados.
# O seed continua explícito (docker compose exec api node src/database/cli.js seed).
CMD ["sh", "-c", "node src/database/cli.js migrate && exec node src/server.js"]
