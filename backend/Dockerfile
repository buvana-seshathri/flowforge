FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
# go.sum isn't checked in, so resolve + pin all (including indirect)
# dependencies here. Requires network access during the image build.
RUN go mod tidy
RUN go build -o flowforge-server ./cmd/server

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/flowforge-server .
EXPOSE 8080
CMD ["./flowforge-server"]
