#!/bin/bash

# Deploy GradVillage Backend to AWS EC2 Dev1 Environment using Docker
# This script deploys the complete backend using Docker containers

set -e

echo "🚀 Deploying GradVillage Backend to AWS EC2 Dev1 Environment using Docker..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EC2_INSTANCE_ID="i-01bc1361ab3f385c7"
S3_BUCKET="gradvillage-dev1-storage"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  Environment: Dev1"
echo "  EC2 Instance: $EC2_INSTANCE_ID"
echo "  S3 Bucket: $S3_BUCKET"
echo ""

# Step 1: Create a deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"

# Create a temporary directory for the deployment package
TEMP_DIR=$(mktemp -d)
DEPLOY_DIR="$TEMP_DIR/gradvillage-docker"

# Copy the backend files
mkdir -p "$DEPLOY_DIR"
cp -r . "$DEPLOY_DIR/backend/"
cp ../docker-compose.dev1.yml "$DEPLOY_DIR/docker-compose.yml"

# Create a tar.gz package
cd "$TEMP_DIR"
tar -czf gradvillage-docker.tar.gz gradvillage-docker/

echo -e "${GREEN}✅ Deployment package created: $TEMP_DIR/gradvillage-docker.tar.gz${NC}"

# Step 2: Upload to S3
echo -e "${YELLOW}📤 Uploading to S3...${NC}"
aws s3 cp "$TEMP_DIR/gradvillage-docker.tar.gz" "s3://$S3_BUCKET/gradvillage-docker.tar.gz"

echo -e "${GREEN}✅ Package uploaded to S3${NC}"

# Step 3: Deploy to EC2 using SSM
echo -e "${YELLOW}🚀 Deploying to EC2...${NC}"

DEPLOYMENT_SCRIPT=$(cat << 'EOF'
#!/bin/bash

set -e

S3_BUCKET="gradvillage-dev1-storage"

echo "🚀 Starting Docker deployment for Dev1..."

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    sudo yum update -y
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker ec2-user
    # Need to log out and back in for group changes to take effect
    # For now, we'll use sudo for docker commands
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
sudo docker-compose down || true
sudo docker stop gradvillage-backend-dev1 || true
sudo docker rm gradvillage-backend-dev1 || true

# Clean up existing directory
rm -rf /opt/gradvillage-docker
mkdir -p /opt/gradvillage-docker
cd /opt/gradvillage-docker

# Download the deployment package
echo "📥 Downloading deployment package..."
aws s3 cp "s3://$S3_BUCKET/gradvillage-docker.tar.gz" /tmp/
cd /tmp
tar -xzf gradvillage-docker.tar.gz
cp -r gradvillage-docker/* /opt/gradvillage-docker/
cd /opt/gradvillage-docker

# Build and start the Docker container
echo "🐳 Building and starting Docker container..."
sudo docker-compose up -d --build

# Wait for the container to start
echo "⏳ Waiting for container to start..."
sleep 30

# Test the application
echo "🧪 Testing application..."
curl -s http://localhost:3001/health || echo "Health check failed"

echo "✅ Docker deployment completed for Dev1!"
EOF
)

# Send the deployment script to EC2
echo -e "${YELLOW}📤 Sending deployment script to EC2...${NC}"
aws ssm send-command \
  --instance-ids "$EC2_INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["aws s3 cp s3://gradvillage-dev1-storage/gradvillage-docker.tar.gz /tmp/gradvillage-docker.tar.gz","cd /tmp && tar -xzf gradvillage-docker.tar.gz","cd gradvillage-docker && chmod +x deploy-docker.sh","./deploy-docker.sh"]' \
  --output text

echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"

# Wait for the command to complete
sleep 60

# Get the EC2 public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "$EC2_INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo -e "${GREEN}🎉 Docker deployment completed for Dev1!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Details:${NC}"
echo "  Environment: Dev1"
echo "  EC2 Instance: $EC2_INSTANCE_ID"
echo "  Public IP: $PUBLIC_IP"
echo "  Backend URL: http://$PUBLIC_IP:3001"
echo "  Health Check: http://$PUBLIC_IP:3001/health"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "${BLUE}   1. Test the health endpoint: curl http://$PUBLIC_IP:3001/health${NC}"
echo -e "${BLUE}   2. Check Docker containers: sudo docker ps${NC}"
echo -e "${BLUE}   3. View logs: sudo docker logs gradvillage-backend-dev1${NC}"

# Clean up
rm -rf "$TEMP_DIR"

echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo -e "${YELLOW}   - Set up proper environment variables for production when ready${NC}"
echo -e "${YELLOW}   - Configure SSL certificates${NC}"
echo -e "${YELLOW}   - Set up monitoring and logging${NC}" 