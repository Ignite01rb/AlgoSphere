FROM golang:1.26-alpine AS builder

WORKDIR /src

RUN apk add --no-cache ca-certificates git

ARG TARGETOS=linux
ARG TARGETARCH=amd64

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags="-s -w" -o /out/algosphere ./cmd/algosphere

FROM alpine:3.21

ENV ALGOSPHERE_ENVIRONMENT=production \
    ALGOSPHERE_DATABASE_AUTO_MIGRATE=false

WORKDIR /app

RUN apk add --no-cache ca-certificates && addgroup -S algosphere && adduser -S algosphere -G algosphere

COPY --from=builder /out/algosphere /app/algosphere

USER algosphere

EXPOSE 8000

CMD ["/app/algosphere", "serve"]
