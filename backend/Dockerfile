FROM node:22-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci

COPY shared ./shared
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src

WORKDIR /app/backend
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
