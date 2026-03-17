FROM node:22-alpine AS builder

WORKDIR /app
COPY worker/package*.json ./worker/
RUN cd worker && npm ci

COPY shared ./shared
COPY worker/tsconfig.json ./worker/tsconfig.json
COPY worker/src ./worker/src

WORKDIR /app/worker
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
COPY worker/package*.json ./worker/
RUN cd worker && npm ci --omit=dev

COPY shared ./shared
COPY worker/tsconfig.json ./worker/tsconfig.json
COPY --from=builder /app/worker/dist ./worker/dist

WORKDIR /app/worker
CMD ["npm", "run", "start"]
