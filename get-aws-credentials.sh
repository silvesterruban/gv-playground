#!/bin/bash

# Get AWS Credentials for GitHub Secrets
# This script helps you get your current AWS credentials to configure GitHub secrets

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 AWS Credentials for GitHub Secrets${NC}"
echo "=========================================="
echo ""

# Check if AWS credentials are available
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${RED}❌ AWS credentials not found in environment variables${NC}"
    echo ""
    echo "Please export your AWS credentials first:"
    echo "export AWS_ACCESS_KEY_ID=\"your-access-key\""
    echo "export AWS_SECRET_ACCESS_KEY=\"your-secret-key\""
    echo "export AWS_SESSION_TOKEN=\"your-session-token\""
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ AWS credentials found!${NC}"
echo ""

# Display credentials (masked for security)
echo -e "${BLUE}📋 GitHub Secrets Configuration:${NC}"
echo ""
echo "1. Go to: https://github.com/silvesterruban/gv-playground/settings/secrets/actions"
echo ""
echo "2. Add the following secrets:"
echo ""

echo -e "${YELLOW}AWS_ACCESS_KEY_ID:${NC}"
echo "$AWS_ACCESS_KEY_ID"
echo ""

echo -e "${YELLOW}AWS_SECRET_ACCESS_KEY:${NC}"
echo "$AWS_SECRET_ACCESS_KEY"
echo ""

if [ -n "$AWS_SESSION_TOKEN" ]; then
    echo -e "${YELLOW}AWS_SESSION_TOKEN (if needed):${NC}"
    echo "$AWS_SESSION_TOKEN"
    echo ""
fi

echo -e "${BLUE}📝 Instructions:${NC}"
echo "1. Click 'New repository secret'"
echo "2. Name: AWS_ACCESS_KEY_ID"
echo "3. Secret: $AWS_ACCESS_KEY_ID"
echo "4. Click 'Add secret'"
echo ""
echo "5. Click 'New repository secret' again"
echo "6. Name: AWS_SECRET_ACCESS_KEY"
echo "7. Secret: $AWS_SECRET_ACCESS_KEY"
echo "8. Click 'Add secret'"
echo ""

echo -e "${GREEN}🎉 Ready to configure GitHub secrets!${NC}"