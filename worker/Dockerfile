FROM node:22-alpine

WORKDIR /app

COPY worker/package*.json ./worker/
RUN cd worker && npm ci

COPY shared ./shared
COPY worker/tsconfig.json ./worker/tsconfig.json
COPY worker/src ./worker/src

WORKDIR /app/worker
RUN npm run build

CMD ["npm", "run", "start"]
