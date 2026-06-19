FROM golang:1.26.4-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Build a small static binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /app/snippetbox ./cmd/web

FROM alpine:3.18
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/snippetbox /usr/local/bin/snippetbox
COPY tls /app/tls
EXPOSE 4000
ENV APP_ADDR=":4000"
ENV DSN="web:root@tcp(db:3306)/snippetbox?parseTime=true"
ENTRYPOINT ["/usr/local/bin/snippetbox"]
