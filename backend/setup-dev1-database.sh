#!/bin/bash

# GradVillage Dev1 Database Setup Script
# This script helps you set up the database schema for your dev1 environment

set -e

echo "🚀 Setting up GradVillage Dev1 Database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating one...${NC}"
    
    cat > .env << EOF
# Dev1 Environment Configuration
NODE_ENV=development
PORT=3001

# Database Configuration for Dev1
# Replace these values with your actual RDS details
DATABASE_URL="postgresql://gradvillage_admin:YOUR_PASSWORD@dev1-db.xxxxx.us-east-1.rds.amazonaws.com:5432/gradvillage_dev1"

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
AWS_BUCKET_NAME=gradvillage-dev1-storage

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-dev1
JWT_REFRESH_SECRET=your-super-secret-refresh-key-for-dev1

# Email Configuration (SES)
SES_REGION=us-east-1
SES_FROM_EMAIL=noreply@gradvillage.com

# Payment Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Application Configuration
APP_NAME=GradVillage
APP_URL=https://dev1.gradvillage.com
FRONTEND_URL=https://dev1.gradvillage.com

# Development Settings
LOG_LEVEL=debug
ENABLE_CORS=true
RATE_LIMIT_ENABLED=true
EOF

    echo -e "${GREEN}✅ Created .env file${NC}"
    echo -e "${YELLOW}⚠️  Please update the .env file with your actual values:${NC}"
    echo -e "${BLUE}   - DATABASE_URL (your RDS endpoint)${NC}"
    echo -e "${BLUE}   - AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY${NC}"
    echo -e "${BLUE}   - JWT_SECRET and JWT_REFRESH_SECRET${NC}"
    echo ""
    read -p "Press Enter after updating the .env file..."
fi

# Check if DATABASE_URL is configured
if grep -q "YOUR_PASSWORD" .env; then
    echo -e "${RED}❌ Please update the DATABASE_URL in .env file with your actual RDS details${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Generate Prisma client
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
npx prisma generate

# Run database migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
npx prisma migrate deploy

# Seed the database (optional)
echo -e "${YELLOW}🌱 Seeding database...${NC}"
npx prisma db seed

# Verify database connection
echo -e "${YELLOW}🔍 Verifying database connection...${NC}"
npx prisma db pull

echo -e "${GREEN}🎉 Dev1 database setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "${BLUE}   1. Test the connection: npm run dev${NC}"
echo -e "${BLUE}   2. Check the health endpoint: curl http://localhost:3001/health${NC}"
echo -e "${BLUE}   3. Verify tables were created in your RDS instance${NC}"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo -e "${YELLOW}   - Keep your .env file secure and never commit it to version control${NC}"
echo -e "${YELLOW}   - Use different credentials for production${NC}"
echo -e "${YELLOW}   - Set up proper security groups for your RDS instance${NC}" 