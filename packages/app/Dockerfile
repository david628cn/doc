# 在 editor 目录执行（需包含 packages/app、ui、doc 与根 package-lock）：
#   docker build -f packages/app/Dockerfile -t doc-space-web .
#
# 构建时 VITE_CONTEXT_PATH 置空，前端请求走相对路径 /api、/oauth 等，由 Nginx 反代到后端。

FROM node:20-bookworm-slim AS builder
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/app/package.json packages/app/
COPY packages/ui/package.json packages/ui/
COPY packages/doc/package.json packages/doc/

RUN npm ci

COPY packages/app packages/app
COPY packages/ui packages/ui
COPY packages/doc packages/doc

# 同域部署：由前置 Nginx 转发到 Gin；本地开发不设该变量时仍用 context.ts 默认后端地址
ENV VITE_CONTEXT_PATH=
RUN npm run build --workspace=@carvy/app

FROM nginx:1.27-alpine
COPY packages/app/docker/00-ws-map.conf /etc/nginx/conf.d/00-ws-map.conf
COPY packages/app/docker/nginx-default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/packages/app/dist /usr/share/nginx/html
EXPOSE 80
