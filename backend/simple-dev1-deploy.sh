#!/bin/bash

# Simple GradVillage Dev1 Backend Deployment
# This script creates a basic backend deployment without SSH

set -e

echo "🚀 Simple GradVillage Dev1 Backend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Dev1 Configuration
DEV1_DB_ENDPOINT="gradvillage-dev1-db.c69qc6wichwr.us-east-1.rds.amazonaws.com"
DEV1_DB_NAME="village_db"
DEV1_DB_USERNAME="gradvillage_admin"

echo -e "${YELLOW}📋 Dev1 Configuration:${NC}"
echo "  Database Endpoint: $DEV1_DB_ENDPOINT"
echo "  Database Name: $DEV1_DB_NAME"
echo "  Username: $DEV1_DB_USERNAME"
echo ""

# Use the correct RDS database password
echo "Using the correct RDS database password: GradVillagedev12025!"
DB_PASSWORD="GradVillagedev12025!"
echo ""

# Test database connection using AWS CLI
echo -e "${YELLOW}🔍 Testing database connection...${NC}"

# Create a simple test script
cat > test-db-connection.js << EOF
const { Client } = require('pg');

const client = new Client({
  host: '$DEV1_DB_ENDPOINT',
  port: 5432,
  database: 'postgres',
  user: '$DEV1_DB_USERNAME',
  password: '$DB_PASSWORD',
  ssl: false,
  connectionTimeoutMillis: 10000,
  query_timeout: 10000
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Database connection successful!');
    
    // Create database if it doesn't exist
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = '$DEV1_DB_NAME'");
    if (result.rows.length === 0) {
      await client.query(\`CREATE DATABASE $DEV1_DB_NAME\`);
      console.log('✅ Database $DEV1_DB_NAME created!');
    } else {
      console.log('✅ Database $DEV1_DB_NAME already exists!');
    }
    
    await client.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
EOF

# Install pg if not available
if ! npm list pg > /dev/null 2>&1; then
    echo -e "${YELLOW}📦 Installing pg package...${NC}"
    npm install pg
fi

# Test the connection
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
node test-db-connection.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database connection successful!${NC}"
else
    echo -e "${RED}❌ Database connection failed!${NC}"
    echo -e "${YELLOW}   This might be due to security group restrictions.${NC}"
    echo -e "${YELLOW}   The database is in a private subnet and requires EC2 access.${NC}"
    exit 1
fi

# Create the database schema using Prisma
echo -e "${YELLOW}🗄️  Setting up database schema...${NC}"

# Create a temporary .env file for dev1
cat > .env.dev1 << EOF
DATABASE_URL="postgresql://$DEV1_DB_USERNAME:$DB_PASSWORD@$DEV1_DB_ENDPOINT:5432/$DEV1_DB_NAME?schema=public"
EOF

# Set the environment variable
export DATABASE_URL="postgresql://$DEV1_DB_USERNAME:$DB_PASSWORD@$DEV1_DB_ENDPOINT:5432/$DEV1_DB_NAME?schema=public"

echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
npx prisma generate

echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
npx prisma migrate deploy

echo -e "${YELLOW}🌱 Seeding database...${NC}"
npx prisma db seed

echo -e "${YELLOW}🔍 Verifying database setup...${NC}"
npx prisma db pull

echo -e "${GREEN}🎉 Database schema setup completed!${NC}"
echo ""
echo -e "${BLUE}📋 Database Details:${NC}"
echo "  Database URL: $DATABASE_URL"
echo "  Database Name: $DEV1_DB_NAME"
echo "  Endpoint: $DEV1_DB_ENDPOINT"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "${BLUE}   1. Deploy your backend to EC2${NC}"
echo -e "${BLUE}   2. Update the EC2 .env file with this DATABASE_URL${NC}"
echo -e "${BLUE}   3. Start your backend application${NC}"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo -e "${YELLOW}   - Keep your database password secure${NC}"
echo -e "${YELLOW}   - Use different credentials for production${NC}"
echo -e "${YELLOW}   - Set up proper monitoring and logging${NC}"

# Clean up
rm -f test-db-connection.js
rm -f .env.dev1 