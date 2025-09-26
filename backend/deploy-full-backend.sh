#!/bin/bash

# Deploy Full GradVillage Backend to Dev1
# This script deploys the complete backend with TypeScript compilation

set -e

echo "🚀 Deploying Full GradVillage Backend to Dev1..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EC2_INSTANCE_ID="i-01bc1361ab3f385c7"
S3_BUCKET="gradvillage-dev1-storage"
BACKEND_DIR="/opt/gradvillage"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  EC2 Instance: $EC2_INSTANCE_ID"
echo "  S3 Bucket: $S3_BUCKET"
echo "  Backend Directory: $BACKEND_DIR"
echo ""

# Step 1: Create a deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"

# Create a temporary directory for the deployment package
TEMP_DIR=$(mktemp -d)
DEPLOY_DIR="$TEMP_DIR/gradvillage-backend"

# Copy the backend files (excluding node_modules, dist, etc.)
mkdir -p "$DEPLOY_DIR"
cp -r src/ "$DEPLOY_DIR/"
cp -r prisma/ "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp package-lock.json "$DEPLOY_DIR/"
cp tsconfig.json "$DEPLOY_DIR/"
cp nodemon.json "$DEPLOY_DIR/"
cp jest.config.js "$DEPLOY_DIR/"

# Create the .env file for dev1
cat > "$DEPLOY_DIR/.env" << 'EOF'
NODE_ENV=dev1
PORT=3001

# Database Configuration for Dev1
DATABASE_URL=postgresql://gradvillage_admin:GradVillagedev12025!@gradvillage-dev1-db.c69qc6wichwr.us-east-1.rds.amazonaws.com:5432/village_db?schema=public

# AWS Configuration
AWS_REGION=us-east-1
AWS_BUCKET_NAME=gradvillage-dev1-storage

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-dev1
JWT_REFRESH_SECRET=your-super-secret-refresh-key-for-dev1

# Email Configuration (SES)
SES_REGION=us-east-1
SES_FROM_EMAIL=noreply@gradvillage.com

# Application Configuration
APP_NAME=GradVillage
APP_URL=https://dev1.gradvillage.com
FRONTEND_URL=https://dev1.gradvillage.com

# Production Settings
LOG_LEVEL=info
ENABLE_CORS=true
RATE_LIMIT_ENABLED=true
EOF

# Create a tar.gz package
cd "$TEMP_DIR"
tar -czf gradvillage-backend.tar.gz gradvillage-backend/

echo -e "${GREEN}✅ Deployment package created: $TEMP_DIR/gradvillage-backend.tar.gz${NC}"

# Step 2: Upload to S3
echo -e "${YELLOW}📤 Uploading to S3...${NC}"
aws s3 cp "$TEMP_DIR/gradvillage-backend.tar.gz" "s3://$S3_BUCKET/gradvillage-backend.tar.gz"

echo -e "${GREEN}✅ Package uploaded to S3${NC}"

# Step 3: Deploy to EC2 using SSM
echo -e "${YELLOW}🚀 Deploying to EC2...${NC}"

DEPLOYMENT_SCRIPT=$(cat << 'EOF'
#!/bin/bash

set -e

BACKEND_DIR="/opt/gradvillage"
S3_BUCKET="gradvillage-dev1-storage"

echo "🚀 Starting full backend deployment..."

# Stop any existing app
pkill -f "node.*app.js" || true
pkill -f "node.*dist/index.js" || true

# Clean up existing directory
rm -rf "$BACKEND_DIR"/*
rm -rf "$BACKEND_DIR"/.env

# Download the deployment package
echo "📥 Downloading deployment package..."
aws s3 cp "s3://$S3_BUCKET/gradvillage-backend.tar.gz" /tmp/
cd /tmp
tar -xzf gradvillage-backend.tar.gz
cp -r gradvillage-backend/* "$BACKEND_DIR/"
cd "$BACKEND_DIR"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Start the application with PM2
echo "🚀 Starting application..."
npm install -g pm2
pm2 delete gradvillage-backend || true
pm2 start dist/index.js --name gradvillage-backend
pm2 save
pm2 startup

# Wait a moment for the app to start
sleep 10

# Test the application
echo "🧪 Testing application..."
curl -s http://localhost:3001/health || echo "Health check failed"

echo "✅ Full backend deployment completed!"
EOF
)

# Send the deployment script to EC2
echo -e "${YELLOW}📤 Sending deployment script to EC2...${NC}"
aws ssm send-command \
  --instance-ids "$EC2_INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[\"$DEPLOYMENT_SCRIPT\"]" \
  --output text

echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"

# Wait for the command to complete
sleep 30

# Get the EC2 public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "$EC2_INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo -e "${GREEN}🎉 Full backend deployment completed!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Details:${NC}"
echo "  EC2 Instance: $EC2_INSTANCE_ID"
echo "  Public IP: $PUBLIC_IP"
echo "  Backend URL: http://$PUBLIC_IP:3001"
echo "  Health Check: http://$PUBLIC_IP:3001/health"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "${BLUE}   1. Test the health endpoint: curl http://$PUBLIC_IP:3001/health${NC}"
echo -e "${BLUE}   2. Check PM2 status: pm2 list${NC}"
echo -e "${BLUE}   3. View logs: pm2 logs gradvillage-backend${NC}"

# Clean up
rm -rf "$TEMP_DIR"

echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo -e "${YELLOW}   - Set up proper environment variables for production${NC}"
echo -e "${YELLOW}   - Configure SSL certificates${NC}"
echo -e "${YELLOW}   - Set up monitoring and logging${NC}" 