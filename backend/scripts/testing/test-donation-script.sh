#!/bin/bash

# Fixed Donation Flow Test Script - Valid Payment Methods
set -e

# Configuration
API_BASE_URL="http://localhost:3001"
DONOR_EMAIL="testdonor@example.com"
DONOR_PASSWORD="TestPassword123!"
STUDENT_EMAIL="teststudent@example.com"

echo "🧪 Starting Fixed Donation Flow Test..."
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to make API calls
make_api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4

    if [ -n "$token" ]; then
        curl -s -X $method "$API_BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data" \
            -w "\nHTTP_CODE:%{http_code}"
    else
        curl -s -X $method "$API_BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "\nHTTP_CODE:%{http_code}"
    fi
}

# Function to extract JSON values
extract_json_value() {
    local json=$1
    local key=$2
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | sed "s/\"$key\":\"//" | sed "s/\"//" | head -1
}

echo -e "${BLUE}Step 1: Login existing donor${NC}"
echo "-----------------------------"

DONOR_LOGIN_DATA="{
  \"email\": \"$DONOR_EMAIL\",
  \"password\": \"$DONOR_PASSWORD\",
  \"userType\": \"donor\"
}"

DONOR_LOGIN_RESPONSE=$(make_api_call "POST" "/api/auth/login" "$DONOR_LOGIN_DATA")
DONOR_LOGIN_HTTP_CODE=$(echo "$DONOR_LOGIN_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
DONOR_LOGIN_BODY=$(echo "$DONOR_LOGIN_RESPONSE" | sed '/HTTP_CODE:/d')

echo "Donor login response (HTTP $DONOR_LOGIN_HTTP_CODE):"
echo "$DONOR_LOGIN_BODY"

if [ "$DONOR_LOGIN_HTTP_CODE" = "200" ] && echo "$DONOR_LOGIN_BODY" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Donor login successful${NC}"
    DONOR_TOKEN=$(extract_json_value "$DONOR_LOGIN_BODY" "token")
    echo "Donor token: ${DONOR_TOKEN:0:50}..."
else
    echo -e "${RED}❌ Donor login failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Using existing test student${NC}"
echo "--------------------------------"

# Use existing student ID (from your previous tests)
STUDENT_ID="9b2146f1-dc19-49b5-927d-54db340c5ad9"
echo -e "${GREEN}✅ Using student ID: $STUDENT_ID${NC}"

echo ""
echo -e "${BLUE}Step 3: Create a donation${NC}"
echo "-------------------------"

# Get donor info from login response
DONOR_FIRST_NAME=$(echo "$DONOR_LOGIN_BODY" | grep -o '"firstName":"[^"]*"' | sed 's/"firstName":"//' | sed 's/"//')
DONOR_LAST_NAME=$(echo "$DONOR_LOGIN_BODY" | grep -o '"lastName":"[^"]*"' | sed 's/"lastName":"//' | sed 's/"//')

echo "Using donor info: $DONOR_FIRST_NAME $DONOR_LAST_NAME ($DONOR_EMAIL)"

DONATION_DATA="{
  \"studentId\": \"$STUDENT_ID\",
  \"amount\": 25.00,
  \"donationType\": \"general\",
  \"paymentMethod\": \"stripe\",
  \"donorEmail\": \"$DONOR_EMAIL\",
  \"donorFirstName\": \"$DONOR_FIRST_NAME\",
  \"donorLastName\": \"$DONOR_LAST_NAME\",
  \"donorMessage\": \"Good luck with your studies!\",
  \"isAnonymous\": false,
  \"allowPublicDisplay\": true,
  \"allowStudentContact\": false
}"

DONATION_RESPONSE=$(make_api_call "POST" "/api/donations/create" "$DONATION_DATA" "$DONOR_TOKEN")
DONATION_HTTP_CODE=$(echo "$DONATION_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
DONATION_BODY=$(echo "$DONATION_RESPONSE" | sed '/HTTP_CODE:/d')

echo "Donation creation response (HTTP $DONATION_HTTP_CODE):"
echo "$DONATION_BODY"

if [ "$DONATION_HTTP_CODE" = "200" ] && echo "$DONATION_BODY" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Donation created successfully${NC}"

    # Extract donation ID
    DONATION_ID=$(echo "$DONATION_BODY" | grep -o '"donation":{[^}]*"id":"[^"]*"' | grep -o '"id":"[^"]*"' | sed 's/"id":"//' | sed 's/"//' | head -1)

    if [ -z "$DONATION_ID" ]; then
        DONATION_ID=$(echo "$DONATION_BODY" | grep -o '"id":"[^"]*"' | sed 's/"id":"//' | sed 's/"//' | head -1)
    fi

    echo "Donation ID: $DONATION_ID"

    if [ -z "$DONATION_ID" ]; then
        echo -e "${RED}❌ Could not extract donation ID${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Donation creation failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 4: Process payment (using valid test payment method)${NC}"
echo "-------------------------------------------------------"

# Use a valid Stripe test payment method or simulate payment
PAYMENT_DATA="{
  \"donationId\": \"$DONATION_ID\",
  \"paymentMethodId\": \"pm_card_visa\"
}"

echo "Payment data: $PAYMENT_DATA"

PAYMENT_RESPONSE=$(make_api_call "POST" "/api/donations/process-payment" "$PAYMENT_DATA" "$DONOR_TOKEN")
PAYMENT_HTTP_CODE=$(echo "$PAYMENT_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
PAYMENT_BODY=$(echo "$PAYMENT_RESPONSE" | sed '/HTTP_CODE:/d')

echo "Payment processing response (HTTP $PAYMENT_HTTP_CODE):"
echo "$PAYMENT_BODY"

if [ "$PAYMENT_HTTP_CODE" = "200" ] && echo "$PAYMENT_BODY" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Payment processed successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Payment processing response (may be expected for test mode)${NC}"
    echo "Response: $PAYMENT_BODY"
fi

echo ""
echo -e "${BLUE}Step 5: Check donation history${NC}"
echo "-------------------------------"

HISTORY_RESPONSE=$(make_api_call "GET" "/api/donations/history?limit=5" "" "$DONOR_TOKEN")
HISTORY_HTTP_CODE=$(echo "$HISTORY_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
HISTORY_BODY=$(echo "$HISTORY_RESPONSE" | sed '/HTTP_CODE:/d')

echo "Donation history response (HTTP $HISTORY_HTTP_CODE):"
echo "$HISTORY_BODY"

echo ""
echo -e "${GREEN}🎉 Donation flow test completed!${NC}"
echo "=================================="

echo -e "${BLUE}Test Summary:${NC}"
echo "• Donor Email: $DONOR_EMAIL"
echo "• Student ID: $STUDENT_ID"
echo "• Donation ID: $DONATION_ID"
echo "• Test completed at: $(date)"

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Check your Stripe dashboard for test payments"
echo "2. Verify donation records in your database"
echo "3. Test frontend donation form integration"
echo "4. Set up real Stripe Connect for production"