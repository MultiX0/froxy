FROM golang:1.24-alpine

# Set working directory
WORKDIR /app

# Copy everything
COPY . .

# Build the Go app
RUN go build -o main .

# Set default command
CMD ["./main"]
