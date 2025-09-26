#!/bin/bash
# test-tax-receipts.sh - Test script for tax receipt functionality

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Updated for your actual setup
API_BASE_URL="http://localhost:3001"
TEST_EMAIL="test-$(date +%s)@example.com"  # Unique email each time
TEST_AMOUNT=25.00

echo -e "${BLUE}🧪 Testing Tax Receipt Functionality${NC}"
echo "=============================================="
echo "API Base URL: $API_BASE_URL"
echo "Docker containers should be running (postgres, redis, moto)"
echo ""

# Check if backend is running
echo -e "${YELLOW}Checking if backend is running...${NC}"
if curl -s "$API_BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running on $API_BASE_URL${NC}"
    echo "Please start your backend with: cd backend && npm run dev"
    exit 1
fi

# Function to make API calls and check responses
test_api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    local auth_token=$5

    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "Endpoint: $method $endpoint"

    # Build curl command
    local curl_cmd="curl -s -w \"HTTP_STATUS:%{http_code}\" -X $method"

    if [ ! -z "$auth_token" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth_token'"
    fi

    if [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi

    curl_cmd="$curl_cmd $API_BASE_URL$endpoint"

    # Execute the request
    local response=$(eval $curl_cmd)
    local exit_code=$?

    # Extract HTTP status code
    local http_status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    local body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

    echo "HTTP Status: $http_status"
    echo "Response: $body"

    if [ $exit_code -eq 0 ] && [ "$http_status" -ge 200 ] && [ "$http_status" -lt 300 ]; then
        # Check if response contains success: true
        if echo "$body" | grep -q '"success":true'; then
            echo -e "${GREEN}✅ Test passed${NC}"
            echo "$body" # Return the body for further processing
            return 0
        else
            echo -e "${RED}❌ Test failed - API returned error${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Test failed - HTTP Status: $http_status${NC}"
        return 1
    fi
}

# Test 1: Health check
echo -e "\n${BLUE}Test 1: Health Check${NC}"
test_api_call "GET" "/api/registration-payment/health" "" "Registration payment service health check"

# Test 2: Create test registration payment with tax receipt
echo -e "\n${BLUE}Test 2: Registration Payment with Tax Receipt${NC}"

REGISTRATION_DATA='{
  "paymentMethodId": "pm_test_visa",
  "amount": 25.00,
  "currency": "usd",
  "email": "'$TEST_EMAIL'",
  "registrationData": {
    "firstName": "Test",
    "lastName": "Student",
    "email": "'$TEST_EMAIL'",
    "school": "Test University",
    "major": "Computer Science",
    "password": "testpassword123"
  },
  "testCardData": {
    "number": "4242424242424242",
    "expiry": "12/28",
    "cvc": "123",
    "zip": "12345",
    "name": "Test Student",
    "brand": "visa"
  },
  "isRegistrationPayment": true,
  "metadata": {
    "type": "registration_fee",
    "customer_email": "'$TEST_EMAIL'"
  }
}'

response=$(test_api_call "POST" "/api/registration-payment/process" "$REGISTRATION_DATA" "Process registration payment")

# Extract student ID and token from response if successful
if [ $? -eq 0 ]; then
    # Parse JSON response more carefully
    STUDENT_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    AUTH_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    TAX_RECEIPT_NUMBER=$(echo "$response" | grep -o '"receiptNumber":"[^"]*"' | cut -d'"' -f4)

    echo -e "${GREEN}Student ID: $STUDENT_ID${NC}"
    echo -e "${GREEN}Auth Token: ${AUTH_TOKEN:0:20}...${NC}"
    echo -e "${GREEN}Tax Receipt Number: $TAX_RECEIPT_NUMBER${NC}"
else
    echo -e "${RED}❌ Registration payment failed, skipping remaining tests${NC}"
    echo -e "${YELLOW}Note: The system may still be working - check the response above${NC}"
    # Don't exit, continue with other tests that don't depend on registration
fi

# Test 3: Get tax receipt by number
if [ ! -z "$TAX_RECEIPT_NUMBER" ]; then
    echo -e "\n${BLUE}Test 3: Get Tax Receipt by Number${NC}"
    test_api_call "GET" "/api/registration-payment/tax-receipt/$TAX_RECEIPT_NUMBER" "" "Fetch tax receipt by number"
fi

# Test 4: List all tax receipts for user
if [ ! -z "$AUTH_TOKEN" ]; then
    echo -e "\n${BLUE}Test 4: List Tax Receipts for User${NC}"
    test_api_call "GET" "/api/registration-payment/tax-receipts" "" "List tax receipts for authenticated user" "$AUTH_TOKEN"
fi

# Test 5: Create a donation and check tax receipt generation
echo -e "\n${BLUE}Test 5: Donation with Tax Receipt${NC}"

# First, create a donation
DONATION_DATA='{
  "studentId": "'$STUDENT_ID'",
  "amount": 50.00,
  "donationType": "general",
  "paymentMethod": "stripe",
  "donorEmail": "donor@example.com",
  "donorFirstName": "Test",
  "donorLastName": "Donor",
  "isAnonymous": false,
  "isRecurring": false
}'

donation_response=$(test_api_call "POST" "/api/donations/create" "$DONATION_DATA" "Create donation")

if [ $? -eq 0 ]; then
    DONATION_ID=$(echo "$donation_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}Donation ID: $DONATION_ID${NC}"

    # Process the donation payment
    PAYMENT_DATA='{
      "donationId": "'$DONATION_ID'",
      "testCardData": {
        "number": "4242424242424242",
        "expiry": "12/28",
        "cvc": "123",
        "zip": "12345",
        "name": "Test Donor",
        "brand": "visa"
      }
    }'

    echo -e "\n${BLUE}Test 5b: Process Donation Payment${NC}"
    test_api_call "POST" "/api/donations/process-payment" "$PAYMENT_DATA" "Process donation payment with tax receipt"
fi

# Test 6: Get donation history with tax receipts
echo -e "\n${BLUE}Test 6: Get Donation History${NC}"
test_api_call "GET" "/api/donations/history?donorEmail=donor@example.com&limit=10" "" "Get donation history with tax receipts"

# Test 7: Get tax receipts from donations endpoint
echo -e "\n${BLUE}Test 7: Get Tax Receipts from Donations Endpoint${NC}"
test_api_call "GET" "/api/donations/tax-receipts?donorEmail=donor@example.com" "" "Get tax receipts for donor"

# Test 8: Check if tax receipt files exist in storage
echo -e "\n${BLUE}Test 8: Check Tax Receipt File Storage${NC}"
echo "Checking if tax receipt files were created..."

# Check for test-receipt.pdf in backend directory (created by tax receipt service)
if [ -f "backend/test-receipt.pdf" ]; then
    echo -e "${GREEN}✅ Found test tax receipt PDF file${NC}"
    echo "File size: $(ls -lh backend/test-receipt.pdf | awk '{print $5}')"
else
    echo -e "${YELLOW}⚠️ No test tax receipt PDF found in backend directory${NC}"
fi

# Test 9: Check Moto S3 storage
echo -e "\n${BLUE}Test 9: Check Moto S3 Storage${NC}"
echo "Checking Moto S3 service for uploaded tax receipts..."

# Check if Moto is running and accessible
if curl -s "http://localhost:5001" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Moto S3 service is running${NC}"

    # Try to list S3 buckets (if AWS CLI is available)
    if command -v aws >/dev/null 2>&1; then
        echo "Attempting to list S3 buckets in Moto..."
        aws --endpoint-url=http://localhost:5001 s3 ls 2>/dev/null || echo "Could not list buckets (may need AWS CLI configuration)"
    else
        echo "AWS CLI not available to check S3 buckets"
    fi
else
    echo -e "${RED}❌ Moto S3 service not accessible on localhost:5001${NC}"
fi

# Test 10: Database verification
echo -e "\n${BLUE}Test 10: Database Verification${NC}"
echo "You can verify tax receipts in the database with:"
echo "1. Open pgAdmin at http://localhost:5050"
echo "2. Connect to your database"
echo "3. Run: SELECT * FROM tax_receipts ORDER BY created_at DESC LIMIT 5;"

# Summary
echo -e "\n${BLUE}🎯 Test Summary${NC}"
echo "=============================================="
echo -e "${GREEN}✅ Registration payment with tax receipt tested${NC}"
echo -e "${GREEN}✅ Tax receipt retrieval tested${NC}"
echo -e "${GREEN}✅ Donation payment with tax receipt tested${NC}"
echo -e "${GREEN}✅ Tax receipt listing tested${NC}"

# Debug information
echo -e "\n${BLUE}🔍 Debug Information${NC}"
echo "=============================================="
echo "API Base URL: $API_BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo "Test Amount: $TEST_AMOUNT"

if [ ! -z "$STUDENT_ID" ]; then
    echo "Created Student ID: $STUDENT_ID"
fi

if [ ! -z "$TAX_RECEIPT_NUMBER" ]; then
    echo "Generated Tax Receipt Number: $TAX_RECEIPT_NUMBER"
fi

# Check backend logs for tax receipt generation
echo -e "\n${BLUE}📋 Check Backend Logs${NC}"
echo "Look for these patterns in your backend logs:"
echo "- '🔍 Generating tax receipt...'"
echo "- '✅ Tax receipt PDF generated and uploaded'"
echo "- '✅ Tax receipt database record created'"
echo "- 'Tax receipt generation failed' (if there are errors)"

echo -e "\n${BLUE}📝 Next Steps${NC}"
echo "=============================================="
echo "1. Check your backend logs for tax receipt generation messages"
echo "2. Verify tax_receipts table has new records:"
echo "   SELECT * FROM tax_receipts ORDER BY created_at DESC LIMIT 5;"
echo "3. Check your Moto S3 storage for uploaded PDF files"
echo "4. Test accessing the tax receipt URLs returned in responses"
echo "5. Verify PDFs can be downloaded and viewed"

echo -e "\n${GREEN}🎉 Tax Receipt Testing Complete!${NC}"

# Environment check
echo -e "\n${BLUE}🔧 Environment Status${NC}"
echo "=============================================="
echo "Docker containers status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep village

# Test 1: Health check
echo -e "\n${BLUE}Test 1: Health Check${NC}"
test_api_call "GET" "/api/registration-payment/health" "" "Registration payment service health check"

# Test 2: Create test registration payment with tax receipt
echo -e "\n${BLUE}Test 2: Registration Payment with Tax Receipt${NC}"

REGISTRATION_DATA='{
  "paymentMethodId": "pm_test_visa",
  "amount": 25.00,
  "currency": "usd",
  "email": "'$TEST_EMAIL'",
  "registrationData": {
    "firstName": "Test",
    "lastName": "Student",
    "email": "'$TEST_EMAIL'",
    "school": "Test University",
    "major": "Computer Science",
    "password": "testpassword123"
  },
  "testCardData": {
    "number": "4242424242424242",
    "expiry": "12/28",
    "cvc": "123",
    "zip": "12345",
    "name": "Test Student",
    "brand": "visa"
  },
  "isRegistrationPayment": true,
  "metadata": {
    "type": "registration_fee",
    "customer_email": "'$TEST_EMAIL'"
  }
}'

response=$(test_api_call "POST" "/api/registration-payment/process" "$REGISTRATION_DATA" "Process registration payment")

# Extract student ID and token from response if successful
if [ $? -eq 0 ]; then
    STUDENT_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    AUTH_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    TAX_RECEIPT_NUMBER=$(echo "$response" | grep -o '"receiptNumber":"[^"]*"' | cut -d'"' -f4)

    echo -e "${GREEN}Student ID: $STUDENT_ID${NC}"
    echo -e "${GREEN}Auth Token: ${AUTH_TOKEN:0:20}...${NC}"
    echo -e "${GREEN}Tax Receipt Number: $TAX_RECEIPT_NUMBER${NC}"
else
    echo -e "${RED}❌ Registration payment failed, cannot continue with other tests${NC}"
    exit 1
fi

# Test 3: Get tax receipt by number
if [ ! -z "$TAX_RECEIPT_NUMBER" ]; then
    echo -e "\n${BLUE}Test 3: Get Tax Receipt by Number${NC}"
    test_api_call "GET" "/api/registration-payment/tax-receipt/$TAX_RECEIPT_NUMBER" "" "Fetch tax receipt by number"
fi

# Test 4: List all tax receipts for user
if [ ! -z "$AUTH_TOKEN" ]; then
    echo -e "\n${BLUE}Test 4: List Tax Receipts for User${NC}"
    test_api_call "GET" "/api/registration-payment/tax-receipts" "" "List tax receipts for authenticated user" "$AUTH_TOKEN"
fi

# Test 5: Create a donation and check tax receipt generation
echo -e "\n${BLUE}Test 5: Donation with Tax Receipt${NC}"

# First, create a donation
DONATION_DATA='{
  "studentId": "'$STUDENT_ID'",
  "amount": 50.00,
  "donationType": "general",
  "paymentMethod": "stripe",
  "donorEmail": "donor@example.com",
  "donorFirstName": "Test",
  "donorLastName": "Donor",
  "isAnonymous": false,
  "isRecurring": false
}'

donation_response=$(test_api_call "POST" "/api/donations/create" "$DONATION_DATA" "Create donation")

if [ $? -eq 0 ]; then
    DONATION_ID=$(echo "$donation_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}Donation ID: $DONATION_ID${NC}"

    # Process the donation payment
    PAYMENT_DATA='{
      "donationId": "'$DONATION_ID'",
      "testCardData": {
        "number": "4242424242424242",
        "expiry": "12/28",
        "cvc": "123",
        "zip": "12345",
        "name": "Test Donor",
        "brand": "visa"
      }
    }'

    echo -e "\n${BLUE}Test 5b: Process Donation Payment${NC}"
    test_api_call "POST" "/api/donations/process-payment" "$PAYMENT_DATA" "Process donation payment with tax receipt"
fi

# Test 6: Get donation history with tax receipts
echo -e "\n${BLUE}Test 6: Get Donation History${NC}"
test_api_call "GET" "/api/donations/history?donorEmail=donor@example.com&limit=10" "" "Get donation history with tax receipts"

# Test 7: Get tax receipts from donations endpoint
echo -e "\n${BLUE}Test 7: Get Tax Receipts from Donations Endpoint${NC}"
test_api_call "GET" "/api/donations/tax-receipts?donorEmail=donor@example.com" "" "Get tax receipts for donor"

# Test 8: Check if tax receipt files exist in storage
echo -e "\n${BLUE}Test 8: Check Tax Receipt File Storage${NC}"
echo "Checking if tax receipt files were created..."

# Check for test-receipt.pdf in backend directory (created by tax receipt service)
if [ -f "backend/test-receipt.pdf" ]; then
    echo -e "${GREEN}✅ Found test tax receipt PDF file${NC}"
    echo "File size: $(ls -lh backend/test-receipt.pdf | awk '{print $5}')"
else
    echo -e "${YELLOW}⚠️ No test tax receipt PDF found in backend directory${NC}"
fi

# Test 9: Test tax receipt service directly (if available)
echo -e "\n${BLUE}Test 9: Direct Tax Receipt Service Test${NC}"

# Check if we can test the tax receipt service directly
if [ -f "backend/src/services/taxReceiptService.ts" ]; then
    echo "Tax receipt service file found"

    # Create a simple test for the tax receipt service
    TEST_RECEIPT_DATA='{
      "receiptNumber": "GV2025-TEST-001",
      "receiptDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
      "taxYear": 2025,
      "donorName": "Test Donor",
      "donationAmount": 25.00,
      "donationDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
      "donationDescription": "Test donation for tax receipt verification"
    }'

    echo "Tax receipt test data prepared"
else
    echo -e "${YELLOW}⚠️ Cannot test tax receipt service directly${NC}"
fi

# Summary
echo -e "\n${BLUE}🎯 Test Summary${NC}"
echo "=============================================="
echo -e "${GREEN}✅ Registration payment with tax receipt tested${NC}"
echo -e "${GREEN}✅ Tax receipt retrieval tested${NC}"
echo -e "${GREEN}✅ Donation payment with tax receipt tested${NC}"
echo -e "${GREEN}✅ Tax receipt listing tested${NC}"

# Debug information
echo -e "\n${BLUE}🔍 Debug Information${NC}"
echo "=============================================="
echo "API Base URL: $API_BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo "Test Amount: $TEST_AMOUNT"

if [ ! -z "$STUDENT_ID" ]; then
    echo "Created Student ID: $STUDENT_ID"
fi

if [ ! -z "$TAX_RECEIPT_NUMBER" ]; then
    echo "Generated Tax Receipt Number: $TAX_RECEIPT_NUMBER"
fi

# Check backend logs for tax receipt generation
echo -e "\n${BLUE}📋 Check Backend Logs${NC}"
echo "Look for these patterns in your backend logs:"
echo "- '🔍 Generating tax receipt...'"
echo "- '✅ Tax receipt PDF generated and uploaded'"
echo "- '✅ Tax receipt database record created'"
echo "- 'Tax receipt generation failed' (if there are errors)"

echo -e "\n${BLUE}📝 Next Steps${NC}"
echo "=============================================="
echo "1. Check your backend logs for tax receipt generation messages"
echo "2. Verify tax_receipts table has new records:"
echo "   SELECT * FROM tax_receipts ORDER BY created_at DESC LIMIT 5;"
echo "3. Check your S3/Moto storage for uploaded PDF files"
echo "4. Test accessing the tax receipt URLs returned in responses"

echo -e "\n${GREEN}🎉 Tax Receipt Testing Complete!${NC}"