#!/bin/bash

# GradVillage Dev1 Backend Deployment Script using SSM
# This script deploys the backend to the dev1 EC2 instance using AWS Systems Manager

set -e

echo "🚀 Deploying GradVillage Backend to Dev1 using SSM..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Dev1 Configuration
DEV1_VPC_ID="vpc-022e5493e4c2d2c80"
DEV1_PUBLIC_SUBNET="subnet-04c6f1eff2902617c"
DEV1_BACKEND_SG="sg-0136b1f60d3953b2b"
DEV1_DB_ENDPOINT="gradvillage-dev1-db.c69qc6wichwr.us-east-1.rds.amazonaws.com"
DEV1_DB_NAME="village_db"
DEV1_DB_USERNAME="gradvillage_admin"
DB_PASSWORD="GradVillagedev12025!"

echo -e "${YELLOW}📋 Dev1 Configuration:${NC}"
echo "  VPC: $DEV1_VPC_ID"
echo "  Public Subnet: $DEV1_PUBLIC_SUBNET"
echo "  Backend Security Group: $DEV1_BACKEND_SG"
echo "  Database Endpoint: $DEV1_DB_ENDPOINT"
echo ""

# Check if EC2 instance exists
echo -e "${YELLOW}🔍 Checking for existing EC2 instance...${NC}"
EXISTING_INSTANCE=$(aws ec2 describe-instances \
  --filters "Name=vpc-id,Values=$DEV1_VPC_ID" "Name=instance-state-name,Values=running" "Name=tag:Name,Values=gradvillage-dev1-backend" \
  --query 'Reservations[*].Instances[*].InstanceId' \
  --output text)

if [ -n "$EXISTING_INSTANCE" ]; then
    INSTANCE_ID=$EXISTING_INSTANCE
    echo -e "${GREEN}✅ Found existing EC2 instance: $INSTANCE_ID${NC}"
else
    echo -e "${YELLOW}📦 Creating new EC2 instance...${NC}"
    
    # Create EC2 instance with SSM role
    INSTANCE_ID=$(aws ec2 run-instances \
      --image-id ami-0c02fb55956c7d316 \
      --count 1 \
      --instance-type t3.micro \
      --key-name gradvillage-key \
      --security-group-ids $DEV1_BACKEND_SG \
      --subnet-id $DEV1_PUBLIC_SUBNET \
      --associate-public-ip-address \
      --iam-instance-profile Name=SSMInstanceProfile \
      --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=gradvillage-dev1-backend}]' \
      --query 'Instances[0].InstanceId' \
      --output text)
    
    echo -e "${GREEN}✅ Created EC2 instance: $INSTANCE_ID${NC}"
    
    # Wait for instance to be running
    echo -e "${YELLOW}⏳ Waiting for instance to be running...${NC}"
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID
    
    # Wait for SSM to be ready
    echo -e "${YELLOW}⏳ Waiting for SSM to be ready...${NC}"
    sleep 60
fi

# Get instance public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo -e "${GREEN}✅ EC2 instance public IP: $PUBLIC_IP${NC}"

# Create deployment script content
DEPLOYMENT_SCRIPT=$(cat << 'EOF'
#!/bin/bash

# Update system
sudo apt update
sudo apt install -y nodejs npm postgresql-client git

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create application directory
sudo mkdir -p /opt/gradvillage
sudo chown ubuntu:ubuntu /opt/gradvillage
cd /opt/gradvillage

# Clone repository (using HTTPS for now)
git clone https://github.com/your-username/village-platform.git .
cd backend

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

# Install PM2
sudo npm install -g pm2

# Start application
pm2 start src/index.ts --name gradvillage-dev1-backend --interpreter npx --interpreter-args ts-node

# Save PM2 configuration
pm2 save
pm2 startup

echo "Deployment completed successfully!"
EOF
)

# Send SSM command to deploy
echo -e "${YELLOW}🚀 Sending deployment command via SSM...${NC}"
COMMAND_ID=$(aws ssm send-command \
  --instance-ids $INSTANCE_ID \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["'"$DEPLOYMENT_SCRIPT"'"]' \
  --query 'Command.CommandId' \
  --output text)

echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"
aws ssm wait command-executed --command-id $COMMAND_ID --instance-id $INSTANCE_ID

# Get command output
echo -e "${YELLOW}📋 Deployment output:${NC}"
aws ssm get-command-invocation --command-id $COMMAND_ID --instance-id $INSTANCE_ID --query 'StandardOutputContent' --output text

echo -e "${GREEN}🎉 Backend deployment completed!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Details:${NC}"
echo "  EC2 Instance: $INSTANCE_ID"
echo "  Public IP: $PUBLIC_IP"
echo "  Backend URL: http://$PUBLIC_IP:3001"
echo "  Health Check: http://$PUBLIC_IP:3001/health"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "${BLUE}   1. Test the backend: curl http://$PUBLIC_IP:3001/health${NC}"
echo -e "${BLUE}   2. Set up domain and SSL certificate${NC}"
echo -e "${BLUE}   3. Configure load balancer if needed${NC}"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo -e "${YELLOW}   - Keep your database password secure${NC}"
echo -e "${YELLOW}   - Set up proper monitoring and logging${NC}"
echo -e "${YELLOW}   - Configure auto-scaling if needed${NC}" 