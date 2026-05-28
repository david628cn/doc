# syntax=docker/dockerfile:1
# 构建（在 editor/server 目录）：docker build -t doc-space-server .
# 运行需 config.yaml：compose 默认挂载 deploy/config.docker.yaml

FROM golang:1.24-bookworm AS builder
ENV GOTOOLCHAIN=auto
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# main.go 引用 web/dist 下静态文件；仓库若仅有 web/ 根目录资源则补齐占位
RUN mkdir -p templates static web/dist && \
    if [ -f web/manifest.json ]; then cp web/manifest.json web/dist/manifest.json; else echo '{"name":"doc-space"}' > web/dist/manifest.json; fi && \
    echo '{}' > web/dist/favicon.json && \
    printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAukBY4lXwX0AAAAASUVORK5CYII=' | base64 -d > web/dist/logo192.png

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/app .

# --- runtime ---
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /out/app ./main
COPY deploy/config.docker.yaml ./config.yaml
COPY --from=builder /src/templates ./templates
COPY --from=builder /src/static ./static
COPY --from=builder /src/web ./web

RUN adduser -D -u 65532 app && mkdir -p uploads logs && chown -R app:app /app

USER app

ENV GIN_MODE=release
EXPOSE 9000

CMD ["./main"]
