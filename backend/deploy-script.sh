#!/bin/bash

# Update system
sudo apt update
sudo apt install -y nodejs npm postgresql-client

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository (you'll need to set up SSH keys or use HTTPS)
cd /home/ubuntu
git clone https://github.com/your-username/village-platform.git
cd village-platform/backend

# Create .env file
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3001

# Database Configuration for Dev1
DATABASE_URL="postgresql://gradvillage_admin:GradVillagedev12025!@gradvillage-dev1-db.c69qc6wichwr.us-east-1.rds.amazonaws.com:5432/village_db?schema=public"

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
ENVEOF

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed

# Install PM2
sudo npm install -g pm2

# Start application
pm2 start src/index.ts --name gradvillage-dev1-backend --interpreter npx --interpreter-args ts-node

# Save PM2 configuration
pm2 save
pm2 startup
