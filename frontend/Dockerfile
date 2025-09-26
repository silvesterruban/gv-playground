# Multi-stage build for production React/Expo frontend
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY app.json ./
COPY babel.config.js ./
COPY metro.config.js ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the Expo web application
RUN npx expo export --platform web --output-dir dist

# Production stage with nginx
FROM nginx:alpine

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx configuration for React SPA
RUN cat > /etc/nginx/conf.d/default.conf << 'EOL'
server {
    listen 8081;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;
    
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/xml
        image/svg+xml;
    
    # Handle client-side routing (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Health check endpoint
    location /health {
        add_header Content-Type application/json;
        return 200 '{"status":"healthy","service":"frontend","version":"production"}';
    }
    
    # API client metrics endpoint
    location /api/client-metrics {
        add_header Content-Type application/json;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
        
        return 200 '{
            "timestamp": "$time_iso8601",
            "service": "Frontend Service",
            "status": "healthy",
            "performance": {
                "server": "nginx",
                "version": "$nginx_version",
                "connections": {
                    "active": "$connections_active",
                    "reading": "$connections_reading",
                    "writing": "$connections_writing",
                    "waiting": "$connections_waiting"
                }
            },
            "system": {
                "hostname": "$hostname",
                "server": "nginx",
                "platform": "alpine"
            },
            "health": {
                "status": "good",
                "environment": "production",
                "frontend": "react-expo",
                "deployment": "kubernetes"
            }
        }';
    }
    
    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }
    
    # HTML files with shorter cache
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }
}
EOL

# Expose port
EXPOSE 8081

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
