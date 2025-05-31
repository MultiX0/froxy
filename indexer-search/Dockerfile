# Use a minimal base image
FROM node:22-slim


RUN apt-get update && apt-get install -y \
  python3 g++ make \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy only package files first for better caching
COPY package*.json ./

# Install dependencies in production mode
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Expose port (should match .env PORT)
EXPOSE 3090

# Run the app
CMD ["node", "app.js"]
