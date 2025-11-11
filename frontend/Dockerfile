# Build
FROM node:20-alpine AS build
WORKDIR /app

# Allow injecting VITE_BACKEND_URL at build time. Default falls back to backend root (no /callback).
ARG VITE_BACKEND_URL=http://127.0.0.1:8080
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .

# Build the production assets (Vite will pick up VITE_BACKEND_URL from ENV)
RUN npm run build

# Serve estático
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
