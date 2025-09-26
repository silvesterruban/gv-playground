#!/bin/bash

# GradVillage Cross-Platform Development Startup Script
# This script starts Expo for web, Android, and iOS

echo "🚀 Starting GradVillage for all platforms..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend is running
echo -e "${YELLOW}🔍 Checking if backend is running...${NC}"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on http://localhost:3001${NC}"
else
    echo -e "${YELLOW}⚠️  Backend not detected on http://localhost:3001${NC}"
    echo -e "${YELLOW}   Make sure to start your backend first:${NC}"
    echo -e "${BLUE}   cd backend && npm run dev${NC}"
    echo ""
fi

echo ""
echo -e "${GREEN}📱 Starting Expo for all platforms...${NC}"
echo -e "${YELLOW}   Web: http://localhost:19006${NC}"
echo -e "${YELLOW}   Android: Scan QR code or press 'a'${NC}"
echo -e "${YELLOW}   iOS: Scan QR code or press 'i'${NC}"
echo ""

# Start Expo with tunnel mode for cross-platform compatibility
npx expo start --tunnel --clear 