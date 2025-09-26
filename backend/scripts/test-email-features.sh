#!/bin/bash

echo "🚀 Testing Email Features - Welcome & Donation Receipts"
echo "======================================================"

# Check if backend is running
echo "Checking if backend is running..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is running on port 3001"
else
    echo "❌ Backend is not running on port 3001"
    echo "Please start the backend first: npm run dev"
    exit 1
fi

# Test 1: Registration with Welcome Email
echo ""
echo "🧪 Test 1: Registration with Welcome Email"
echo "------------------------------------------------"

STUDENT_EMAIL="test-student-$(date +%s)@example.com"
echo "Creating test student: $STUDENT_EMAIL"

REGISTRATION_RESPONSE=$(curl -s -X POST http://localhost:3001/api/registration-payment/process \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$STUDENT_EMAIL\",
        \"amount\": 2500,
        \"currency\": \"usd\",
        \"paymentMethodId\": \"pm_card_visa\",
        \"isRegistrationPayment\": true,
        \"registrationData\": {
            \"email\": \"$STUDENT_EMAIL\",
            \"password\": \"TestPassword123!\",
            \"firstName\": \"Test\",
            \"lastName\": \"Student\",
            \"school\": \"Test University\",
            \"major\": \"Computer Science\",
            \"graduationYear\": 2025,
            \"gpa\": 3.8,
            \"financialNeed\": \"High\",
            \"story\": \"This is a test student for email testing.\"
        },
        \"testCardData\": {
            \"number\": \"4242424242424242\",
            \"exp_month\": 12,
            \"exp_year\": 2025,
            \"cvc\": \"123\"
        }
    }")

if echo "$REGISTRATION_RESPONSE" | grep -q "token"; then
    echo "✅ Student registration successful"
    STUDENT_TOKEN=$(echo "$REGISTRATION_RESPONSE" | jq -r '.token')
    echo "Student token: ${STUDENT_TOKEN:0:20}..."
else
    echo "❌ Student registration failed"
    echo "Response: $REGISTRATION_RESPONSE"
    exit 1
fi

# Test 2: Create Donor and Make Donation
echo ""
echo "🧪 Test 2: Donation with Receipt Email"
echo "---------------------------------------------"

DONOR_EMAIL="test-donor-$(date +%s)@example.com"
echo "Creating test donor: $DONOR_EMAIL"

DONOR_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$DONOR_EMAIL\",
        \"password\": \"TestPassword123!\",
        \"firstName\": \"Test\",
        \"lastName\": \"Donor\",
        \"userType\": \"donor\"
    }")

if echo "$DONOR_RESPONSE" | grep -q "token"; then
    echo "✅ Donor registration successful"
    DONOR_TOKEN=$(echo "$DONOR_RESPONSE" | jq -r '.token')
    echo "Donor token: ${DONOR_TOKEN:0:20}..."
    
    # Get available students for donation
    echo "Getting available students for donation..."
    STUDENTS_RESPONSE=$(curl -s -X GET http://localhost:3001/api/donor/students \
        -H "Authorization: Bearer $DONOR_TOKEN")
    
    if echo "$STUDENTS_RESPONSE" | grep -q "students"; then
        STUDENT_ID=$(echo "$STUDENTS_RESPONSE" | jq -r '.students[0].id')
        if [ "$STUDENT_ID" != "null" ] && [ "$STUDENT_ID" != "" ]; then
            echo "✅ Found student to donate to: $STUDENT_ID"
            
            # Make donation
            echo "Making donation of $50.00..."
            DONATION_RESPONSE=$(curl -s -X POST http://localhost:3001/api/donations \
                -H "Authorization: Bearer $DONOR_TOKEN" \
                -H "Content-Type: application/json" \
                -d "{
                    \"studentId\": \"$STUDENT_ID\",
                    \"amount\": 5000,
                    \"paymentMethod\": \"stripe\",
                    \"paymentToken\": \"tok_visa\",
                    \"message\": \"Test donation for email testing\"
                }")
            
            if echo "$DONATION_RESPONSE" | grep -q "success.*true"; then
                echo "✅ Donation successful"
                echo "Donation receipt email should be sent to student"
            else
                echo "❌ Donation failed"
                echo "Response: $DONATION_RESPONSE"
            fi
        else
            echo "⚠️ No verified students available for donation"
            echo "You may need to approve some students first via admin dashboard"
        fi
    else
        echo "❌ Failed to get students list"
        echo "Response: $STUDENTS_RESPONSE"
    fi
else
    echo "❌ Donor registration failed"
    echo "Response: $DONOR_RESPONSE"
fi

# Check Email Logs
echo ""
echo "🧪 Test 3: Checking Email Logs"
echo "-----------------------------------"

echo "Checking backend logs for email activity..."
if [ -f "logs/app.log" ]; then
    echo "Recent email logs:"
    tail -n 50 logs/app.log | grep -i "email\|ses\|welcome\|receipt" || echo "No recent email logs found"
else
    echo "No log file found at logs/app.log"
fi

echo ""
echo "✅ Email feature tests completed!"
echo "Check your email inbox for:"
echo "1. Welcome email to test student"
echo "2. Donation receipt PDF to test student" 