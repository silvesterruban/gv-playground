#!/bin/bash

# GradVillage Dev1 Database Setup Script
# This script sets up the database schema for your dev1 environment

set -e

echo "🚀 Setting up GradVillage Dev1 Database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Dev1 Database Configuration
DEV1_DB_ENDPOINT="gradvillage-dev1-db.c69qc6wichwr.us-east-1.rds.amazonaws.com"
DEV1_DB_PORT="5432"
DEV1_DB_NAME="village_db"
DEV1_DB_USERNAME="gradvillage_admin"

echo -e "${YELLOW}📋 Dev1 Database Configuration:${NC}"
echo "  Endpoint: $DEV1_DB_ENDPOINT"
echo "  Port: $DEV1_DB_PORT"
echo "  Database: $DEV1_DB_NAME"
echo "  Username: $DEV1_DB_USERNAME"
echo ""

# Prompt for password
read -s -p "Enter your RDS database password: " DEV1_DB_PASSWORD
echo ""

# Create DATABASE_URL for dev1
DEV1_DATABASE_URL="postgresql://$DEV1_DB_USERNAME:$DEV1_DB_PASSWORD@$DEV1_DB_ENDPOINT:$DEV1_DB_PORT/$DEV1_DB_NAME?schema=public"

echo -e "${YELLOW}🔍 Testing database connection...${NC}"

# Test connection using psql (if available)
if command -v psql &> /dev/null; then
    echo "Testing connection with psql..."
    PGPASSWORD=$DEV1_DB_PASSWORD psql -h $DEV1_DB_ENDPOINT -p $DEV1_DB_PORT -U $DEV1_DB_USERNAME -d postgres -c "SELECT 1;" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database connection successful!${NC}"
    else
        echo -e "${RED}❌ Database connection failed!${NC}"
        echo "Please check your password and network connectivity."
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  psql not available, skipping connection test${NC}"
fi

# Create the database if it doesn't exist
echo -e "${YELLOW}🗄️  Creating database if it doesn't exist...${NC}"
PGPASSWORD=$DEV1_DB_PASSWORD psql -h $DEV1_DB_ENDPOINT -p $DEV1_DB_PORT -U $DEV1_DB_USERNAME -d postgres -c "CREATE DATABASE $DEV1_DB_NAME;" 2>/dev/null || echo "Database might already exist, continuing..."

# Set environment variable for Prisma
export DATABASE_URL="$DEV1_DATABASE_URL"

echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
npx prisma generate

echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
npx prisma migrate deploy

echo -e "${YELLOW}🌱 Seeding database...${NC}"
npx prisma db seed

echo -e "${YELLOW}🔍 Verifying database setup...${NC}"
npx prisma db pull

echo -e "${GREEN}🎉 Dev1 database setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Database Details:${NC}"
echo "  Database URL: $DEV1_DATABASE_URL"
echo "  Database Name: $DEV1_DB_NAME"
echo "  Endpoint: $DEV1_DB_ENDPOINT"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "${BLUE}   1. Update your .env file with the dev1 DATABASE_URL${NC}"
echo -e "${BLUE}   2. Test the connection: npm run dev${NC}"
echo -e "${BLUE}   3. Check the health endpoint: curl http://localhost:3001/health${NC}"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo -e "${YELLOW}   - Keep your database password secure${NC}"
echo -e "${YELLOW}   - Use different credentials for production${NC}"
echo -e "${YELLOW}   - Set up proper security groups for your RDS instance${NC}" 