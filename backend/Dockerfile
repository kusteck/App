FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download || true
COPY . .
RUN go build -o server ./cmd/server

FROM alpine:3.20
WORKDIR /app
COPY --from=build /app/server .
COPY --from=build /app/migrations ./migrations
ENV UPLOAD_DIR=/app/uploads
RUN mkdir -p /app/uploads
EXPOSE 8080
CMD ["./server"]