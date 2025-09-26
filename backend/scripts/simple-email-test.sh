#!/bin/bash

echo "🧪 Simple Email Feature Test"
echo "============================"

# Test 1: Test SES directly
echo ""
echo "1. Testing SES Service directly..."
SES_TEST=$(curl -s -X POST http://localhost:3001/api/test/ses \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email from Village Platform",
    "htmlBody": "<h1>Test Email</h1><p>This is a test email from the Village Platform.</p>"
  }')

echo "SES Test Response: $SES_TEST"

# Test 2: Check if welcome email was sent during registration
echo ""
echo "2. Checking if welcome email was sent during student registration..."
echo "Look for 'Welcome email sent to' in the backend console output"

# Test 3: Check if donation receipt email would be sent
echo ""
echo "3. Checking donation receipt email functionality..."
echo "The donation receipt email should be sent when a donation is processed successfully"
echo "Look for 'Donation receipt email sent to' in the backend console output"

echo ""
echo "✅ Email test completed!"
echo ""
echo "To verify emails are working:"
echo "1. Check the backend console for email-related logs"
echo "2. Verify your AWS SES configuration"
echo "3. Check if test emails are being sent to your verified email addresses" 