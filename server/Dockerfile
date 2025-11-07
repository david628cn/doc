# 第一阶段：构建环境
FROM golang:1.24.6 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG APP_ENV=development
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-X main.buildEnv=${APP_ENV}" -o main .

# 第二阶段：运行环境
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/static ./static
ENV GIN_MODE=release \
    PORT=8080
EXPOSE 8080
CMD ["./main"]


## 开发环境构建
#docker build -t app .
#
## 生产环境构建（带自定义参数）
#docker build --build-arg APP_ENV=production -t app .
#
## 运行容器（覆盖环境变量）
#docker run -e PORT=8000 -p 8000:8000 app
