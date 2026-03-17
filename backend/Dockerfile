FROM node:22-alpine AS builder

WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

COPY shared ./shared
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/drizzle.config.ts ./backend/drizzle.config.ts
COPY backend/src ./backend/src

WORKDIR /app/backend
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY shared ./shared
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/drizzle.config.ts ./backend/drizzle.config.ts
COPY --from=builder /app/backend/dist ./backend/dist

WORKDIR /app/backend
EXPOSE 3000
CMD ["npm", "run", "start"]
