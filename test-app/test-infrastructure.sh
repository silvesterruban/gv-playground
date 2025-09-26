#!/bin/bash

echo "🧪 Testing GV Playground Infrastructure"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test functions
test_eks_cluster() {
    echo -e "\n${BLUE}🔍 Testing EKS Cluster...${NC}"
    if kubectl get nodes > /dev/null 2>&1; then
        echo -e "${GREEN}✅ EKS Cluster: Connected successfully${NC}"
        kubectl get nodes --no-headers | wc -l | xargs -I {} echo -e "${GREEN}   📊 Nodes: {} running${NC}"
        kubectl get nodes --no-headers | awk '{print "   🖥️  " $1 " - " $2}'
    else
        echo -e "${RED}❌ EKS Cluster: Connection failed${NC}"
        return 1
    fi
}

test_load_balancer() {
    echo -e "\n${BLUE}🔍 Testing Load Balancer...${NC}"
    ALB_URL="http://playground-alb-415409693.us-east-1.elb.amazonaws.com"
    
    if curl -s -I "$ALB_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Load Balancer: Responding to requests${NC}"
        echo -e "${GREEN}   🌐 URL: $ALB_URL${NC}"
        
        # Check response code
        RESPONSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$ALB_URL")
        echo -e "${YELLOW}   📊 Response Code: $RESPONSE_CODE${NC}"
        
        if [ "$RESPONSE_CODE" = "503" ]; then
            echo -e "${YELLOW}   ⚠️  No backend services deployed yet (expected)${NC}"
        fi
    else
        echo -e "${RED}❌ Load Balancer: Not responding${NC}"
        return 1
    fi
}

test_database() {
    echo -e "\n${BLUE}🔍 Testing Database...${NC}"
    DB_ENDPOINT="playground-postgres.c69qc6wichwr.us-east-1.rds.amazonaws.com"
    
    if aws rds describe-db-instances --db-instance-identifier playground-postgres --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null | grep -q "available"; then
        echo -e "${GREEN}✅ Database: Available and running${NC}"
        echo -e "${GREEN}   🗄️  Endpoint: $DB_ENDPOINT:5432${NC}"
        echo -e "${GREEN}   🐘 Engine: PostgreSQL 15.14${NC}"
    else
        echo -e "${RED}❌ Database: Not available${NC}"
        return 1
    fi
}

test_ecr_repositories() {
    echo -e "\n${BLUE}🔍 Testing ECR Repositories...${NC}"
    
    if aws ecr describe-repositories --repository-names gv-playground-backend gv-playground-frontend > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ECR Repositories: Available${NC}"
        echo -e "${GREEN}   📦 Backend: 898307279366.dkr.ecr.us-east-1.amazonaws.com/gv-playground-backend${NC}"
        echo -e "${GREEN}   📦 Frontend: 898307279366.dkr.ecr.us-east-1.amazonaws.com/gv-playground-frontend${NC}"
    else
        echo -e "${RED}❌ ECR Repositories: Not accessible${NC}"
        return 1
    fi
}

test_networking() {
    echo -e "\n${BLUE}🔍 Testing Networking...${NC}"
    
    # Check VPC
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=playground-vpc" --query 'Vpcs[0].VpcId' --output text 2>/dev/null)
    if [ "$VPC_ID" != "None" ] && [ "$VPC_ID" != "" ]; then
        echo -e "${GREEN}✅ VPC: $VPC_ID${NC}"
    else
        echo -e "${RED}❌ VPC: Not found${NC}"
        return 1
    fi
    
    # Check subnets
    SUBNET_COUNT=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'length(Subnets)' --output text 2>/dev/null)
    if [ "$SUBNET_COUNT" -ge 6 ]; then
        echo -e "${GREEN}✅ Subnets: $SUBNET_COUNT subnets configured${NC}"
    else
        echo -e "${RED}❌ Subnets: Insufficient subnets ($SUBNET_COUNT)${NC}"
        return 1
    fi
}

test_security_groups() {
    echo -e "\n${BLUE}🔍 Testing Security Groups...${NC}"
    
    SG_COUNT=$(aws ec2 describe-security-groups --filters "Name=tag:Project,Values=gv-playground" --query 'length(SecurityGroups)' --output text 2>/dev/null)
    if [ "$SG_COUNT" -ge 4 ]; then
        echo -e "${GREEN}✅ Security Groups: $SG_COUNT groups configured${NC}"
    else
        echo -e "${RED}❌ Security Groups: Insufficient groups ($SG_COUNT)${NC}"
        return 1
    fi
}

# Run all tests
echo -e "${YELLOW}Starting infrastructure tests...${NC}"

PASSED=0
TOTAL=6

test_eks_cluster && ((PASSED++))
test_load_balancer && ((PASSED++))
test_database && ((PASSED++))
test_ecr_repositories && ((PASSED++))
test_networking && ((PASSED++))
test_security_groups && ((PASSED++))

echo -e "\n${BLUE}📊 Test Results Summary${NC}"
echo "=========================="
echo -e "${GREEN}✅ Passed: $PASSED/$TOTAL tests${NC}"

if [ $PASSED -eq $TOTAL ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Your infrastructure is ready for deployment.${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "1. Build and push Docker images to ECR"
    echo -e "2. Deploy applications to Kubernetes"
    echo -e "3. Configure CI/CD pipelines"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please check the infrastructure configuration.${NC}"
    exit 1
fi