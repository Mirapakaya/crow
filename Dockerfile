# Build stage
FROM node:20.19-bookworm AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run generate:icons
RUN npm run build

# Production stage — unprivileged nginx
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Security: run as non-root (nginx-unprivileged already uses uid 101)
USER nginx

# Copy static export and nginx config
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Read-only root filesystem (except for nginx tmp)
VOLUME /tmp
VOLUME /var/cache/nginx
VOLUME /var/run

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
