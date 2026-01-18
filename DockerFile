# Use lightweight Node image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy rest of the code
COPY . .

# Expose the port Northflank will route to
EXPOSE 8080

# Start the app
CMD ["npm", "start"]
