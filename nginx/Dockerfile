FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM nginx:alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
