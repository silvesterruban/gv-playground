#!/bin/bash

# Production Frontend Deployment Script
# This script deploys the frontend with production settings and correct API URLs

set -e

echo "🚀 Starting Production Frontend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTANCE_ID="i-01bc1361ab3f385c7"
AWS_REGION="us-east-1"
FRONTEND_DIR="frontend"
BUILD_DIR="web-build"
EC2_DEPLOY_PATH="/opt/gradvillage-frontend"
API_BASE_URL="http://3.234.140.112:3001"
FRONTEND_URL="http://3.234.140.112:3000"

echo -e "${BLUE}📋 Production Frontend Deployment Configuration:${NC}"
echo "  Instance ID: $INSTANCE_ID"
echo "  AWS Region: $AWS_REGION"
echo "  Frontend Directory: $FRONTEND_DIR"
echo "  Build Directory: $BUILD_DIR"
echo "  EC2 Deploy Path: $EC2_DEPLOY_PATH"
echo "  API Base URL: $API_BASE_URL"
echo "  Frontend URL: $FRONTEND_URL"

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found: $FRONTEND_DIR${NC}"
    exit 1
fi

# Create temporary deployment directory
TEMP_DIR="/tmp/gradvillage-frontend-production"
echo -e "${YELLOW}📦 Creating temporary deployment directory...${NC}"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR

# Copy frontend files to temp directory
echo -e "${YELLOW}📋 Copying frontend files...${NC}"
cp -r $FRONTEND_DIR $TEMP_DIR/

# Create production deployment script
echo -e "${YELLOW}🔧 Creating production deployment script...${NC}"
cat > $TEMP_DIR/deploy-production.sh << 'EOF'
#!/bin/bash

set -e

echo "🚀 Starting Production Frontend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
FRONTEND_DIR="frontend"
BUILD_DIR="web-build"
DEPLOY_PATH="/opt/gradvillage-frontend"
API_BASE_URL="http://3.234.140.112:3001"
FRONTEND_URL="http://3.234.140.112:3000"

echo -e "${BLUE}📋 Production Frontend Deployment Configuration:${NC}"
echo "  Frontend Directory: $FRONTEND_DIR"
echo "  Build Directory: $BUILD_DIR"
echo "  Deploy Path: $DEPLOY_PATH"
echo "  API Base URL: $API_BASE_URL"
echo "  Frontend URL: $FRONTEND_URL"

# Navigate to deployment directory
cd /tmp/gradvillage-frontend-production

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Node.js...${NC}"
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# Install nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}📦 Installing nginx...${NC}"
    sudo yum install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
fi

# Navigate to frontend directory
cd $FRONTEND_DIR

# Set production environment variables
export EXPO_PUBLIC_API_URL="$API_BASE_URL"
export NODE_ENV="production"
export EXPO_PUBLIC_ENVIRONMENT="production"

echo -e "${YELLOW}🔧 Setting production environment variables:${NC}"
echo "  EXPO_PUBLIC_API_URL: $EXPO_PUBLIC_API_URL"
echo "  NODE_ENV: $NODE_ENV"
echo "  EXPO_PUBLIC_ENVIRONMENT: $EXPO_PUBLIC_ENVIRONMENT"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Clean previous build
echo -e "${YELLOW}🧹 Cleaning previous build...${NC}"
rm -rf $BUILD_DIR

# Build Expo web application for production
echo -e "${YELLOW}🔨 Building Expo web application for production...${NC}"
EXPO_PUBLIC_API_URL="$API_BASE_URL" NODE_ENV=production npx expo export:web --output-dir $BUILD_DIR

# Check if build was successful
if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ Build failed - build directory not found${NC}"
    exit 1
fi

# Verify API URL in built files
echo -e "${YELLOW}🔍 Verifying API URL in built files...${NC}"
if grep -r "192.168.1.5" $BUILD_DIR; then
    echo -e "${RED}❌ Found hardcoded local IP in built files${NC}"
    exit 1
else
    echo -e "${GREEN}✅ No hardcoded local IP found in built files${NC}"
fi

# Create deployment directory
echo -e "${YELLOW}📁 Creating deployment directory...${NC}"
sudo mkdir -p $DEPLOY_PATH
sudo chown ec2-user:ec2-user $DEPLOY_PATH

# Copy built files to deployment directory
echo -e "${YELLOW}📤 Copying built files to deployment directory...${NC}"
cp -r $BUILD_DIR/* $DEPLOY_PATH/

# Configure nginx for frontend with production settings
echo -e "${YELLOW}🔧 Configuring nginx for production...${NC}"
sudo tee /etc/nginx/conf.d/gradvillage-frontend.conf > /dev/null << 'NGINX_CONFIG'
server {
    listen 80;
    server_name _;
    root /opt/gradvillage-frontend;
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

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend
    location /api/ {
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

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
NGINX_CONFIG

# Test nginx configuration
echo -e "${YELLOW}🔍 Testing nginx configuration...${NC}"
sudo nginx -t

# Reload nginx
echo -e "${YELLOW}🔄 Reloading nginx...${NC}"
sudo systemctl reload nginx

# Clean up temporary files
echo -e "${YELLOW}🧹 Cleaning up temporary files...${NC}"
rm -rf /tmp/gradvillage-frontend-production

echo -e "${GREEN}🎉 Production frontend deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Information:${NC}"
echo "  Frontend URL: $FRONTEND_URL"
echo "  API Base URL: $API_BASE_URL"
echo "  Deploy Path: $DEPLOY_PATH"
echo ""
echo -e "${YELLOW}🔧 Next steps:${NC}"
echo "  1. Test the frontend at: $FRONTEND_URL"
echo "  2. Verify API connectivity"
echo "  3. Test profile editing functionality"
echo "  4. Check for any hardcoded IP addresses"
echo ""
echo -e "${BLUE}📊 Useful commands:${NC}"
echo "  sudo systemctl status nginx                    - Check nginx status"
echo "  sudo nginx -t                                  - Test nginx config"
echo "  sudo systemctl reload nginx                    - Reload nginx"
echo "  curl $API_BASE_URL/health                     - Test backend health"
echo "  curl $FRONTEND_URL                            - Test frontend"
EOF

# Make the deployment script executable
chmod +x $TEMP_DIR/deploy-production.sh

# Create tar file
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
cd $TEMP_DIR
tar -czf gradvillage-frontend-production.tar.gz *

# Upload to S3
echo -e "${YELLOW}📤 Uploading deployment package to S3...${NC}"
aws s3 cp gradvillage-frontend-production.tar.gz s3://gradvillage-dev1-storage/gradvillage-frontend-production.tar.gz

# Execute deployment on EC2
echo -e "${YELLOW}🚀 Executing production deployment on EC2...${NC}"
aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "cd /tmp",
        "aws s3 cp s3://gradvillage-dev1-storage/gradvillage-frontend-production.tar.gz .",
        "tar -xzf gradvillage-frontend-production.tar.gz",
        "chmod +x deploy-production.sh",
        "./deploy-production.sh"
    ]' \
    --region $AWS_REGION

# Clean up local temp directory
echo -e "${YELLOW}🧹 Cleaning up local temporary files...${NC}"
rm -rf $TEMP_DIR

echo -e "${GREEN}🎉 Production frontend deployment to EC2 completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "  Instance ID: $INSTANCE_ID"
echo "  Frontend URL: $FRONTEND_URL"
echo "  API Base URL: $API_BASE_URL"
echo "  Deployment Method: Production build with correct API URLs"
echo ""
echo -e "${YELLOW}🔧 Next steps:${NC}"
echo "  1. Test the frontend at: $FRONTEND_URL"
echo "  2. Verify API connectivity"
echo "  3. Test profile editing functionality"
echo "  4. Check browser console for any remaining errors"
echo ""
echo -e "${BLUE}📊 Useful commands:${NC}"
echo "  curl $FRONTEND_URL                            - Test frontend"
echo "  curl $API_BASE_URL/health                    - Test backend"
echo "  aws ssm send-command --instance-ids $INSTANCE_ID --document-name 'AWS-RunShellScript' --parameters 'commands=[\"sudo systemctl status nginx\"]' --region $AWS_REGION"
echo ""
echo -e "${GREEN}✅ The production frontend with correct API URLs has been deployed!${NC}" 