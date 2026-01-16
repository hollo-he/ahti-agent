# 编译阶段
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main ./cmd/main.go

# 运行阶段
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
# 安装基础证书，确保能爬取 HTTPS 网站
RUN apk add --no-cache ca-certificates
EXPOSE 8080
CMD ["./main"]