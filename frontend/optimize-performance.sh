#!/bin/bash

# Frontend Performance Optimization Script
# This script optimizes the frontend for better performance

echo "🚀 Optimizing Frontend Performance..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="http://3.234.140.112:3000"
API_BASE_URL="http://3.234.140.112:3001"

echo -e "${BLUE}📋 Performance Optimization Configuration:${NC}"
echo "  Frontend URL: $FRONTEND_URL"
echo "  API Base URL: $API_BASE_URL"

# Test current performance
echo -e "${YELLOW}🔍 Testing current performance...${NC}"

# Test frontend load time
FRONTEND_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$FRONTEND_URL")
echo -e "${BLUE}Frontend load time: ${FRONTEND_TIME}s${NC}"

# Test API response time
API_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$API_BASE_URL/health")
echo -e "${BLUE}API response time: ${API_TIME}s${NC}"

# Performance recommendations
echo -e "${YELLOW}📊 Performance Recommendations:${NC}"

if (( $(echo "$FRONTEND_TIME > 3" | bc -l) )); then
    echo -e "${RED}⚠️  Frontend load time is slow (>3s)${NC}"
    echo "  - Consider enabling gzip compression"
    echo "  - Implement browser caching"
    echo "  - Optimize image sizes"
else
    echo -e "${GREEN}✅ Frontend load time is acceptable${NC}"
fi

if (( $(echo "$API_TIME > 1" | bc -l) )); then
    echo -e "${RED}⚠️  API response time is slow (>1s)${NC}"
    echo "  - Check database performance"
    echo "  - Optimize API queries"
    echo "  - Consider caching frequently accessed data"
else
    echo -e "${GREEN}✅ API response time is good${NC}"
fi

# Create nginx optimization config
echo -e "${YELLOW}🔧 Creating nginx optimization config...${NC}"

cat > nginx-optimization.conf << 'EOF'
# Performance optimizations for GradVillage frontend

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

# Browser caching for static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
}

# Cache HTML files for a shorter time
location ~* \.html$ {
    expires 1h;
    add_header Cache-Control "public, must-revalidate";
}

# API caching for GET requests
location /api/ {
    # Cache successful GET requests for 5 minutes
    proxy_cache_valid 200 5m;
    proxy_cache_valid 404 1m;
    
    # Add cache headers
    add_header X-Cache-Status $upstream_cache_status;
    
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Enable keep-alive connections
keepalive_timeout 65;
keepalive_requests 100;
EOF

echo -e "${GREEN}✅ Nginx optimization config created${NC}"

# Performance testing commands
echo -e "${YELLOW}📊 Performance Testing Commands:${NC}"
echo "  # Test frontend load time:"
echo "  curl -w '@curl-format.txt' -o /dev/null -s '$FRONTEND_URL'"
echo ""
echo "  # Test API response time:"
echo "  curl -w '@curl-format.txt' -o /dev/null -s '$API_BASE_URL/health'"
echo ""
echo "  # Test profile endpoint:"
echo "  curl -w '@curl-format.txt' -o /dev/null -s '$API_BASE_URL/api/students/profile'"
echo ""

# Create curl format file for detailed timing
cat > curl-format.txt << 'EOF'
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF

echo -e "${GREEN}✅ Performance optimization setup completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Apply nginx optimization config to your server"
echo "2. Test performance improvements"
echo "3. Monitor response times"
echo "4. Check browser console for any errors" 