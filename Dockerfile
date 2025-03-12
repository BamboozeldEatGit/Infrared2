FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Run setup script
RUN npm run setup

# Expose ports
EXPOSE 8081 8000 8080

# Start the application
CMD ["npm", "start"] 