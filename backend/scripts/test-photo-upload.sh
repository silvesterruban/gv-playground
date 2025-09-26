#!/bin/bash

echo "🧪 Testing Photo Upload Functionality"
echo "====================================="

# Check if backend is running
echo "Checking if backend is running..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is running on port 3001"
else
    echo "❌ Backend is not running on port 3001"
    echo "Please start the backend first: npm run dev"
    exit 1
fi

# Create a test student
echo ""
echo "1. Creating test student for photo upload..."
STUDENT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/registration-payment/process \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-photo@example.com",
    "amount": 2500,
    "currency": "usd",
    "paymentMethodId": "pm_card_visa",
    "isRegistrationPayment": true,
    "registrationData": {
      "email": "test-photo@example.com",
      "password": "TestPassword123!",
      "firstName": "Photo",
      "lastName": "Test",
      "school": "Test University",
      "major": "Computer Science"
    },
    "testCardData": {
      "number": "4242424242424242",
      "exp_month": 12,
      "exp_year": 2025,
      "cvc": "123"
    }
  }')

if echo "$STUDENT_RESPONSE" | grep -q "token"; then
    echo "✅ Student created successfully"
    STUDENT_TOKEN=$(echo "$STUDENT_RESPONSE" | jq -r '.token')
    echo "Student token: ${STUDENT_TOKEN:0:20}..."
else
    echo "❌ Student creation failed"
    echo "Response: $STUDENT_RESPONSE"
    exit 1
fi

# Create a test image file
echo ""
echo "2. Creating test image file..."
echo "This is a test image" > test-image.jpg
echo "✅ Test image created"

# Test photo upload
echo ""
echo "3. Testing photo upload..."
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3001/api/students/profile/photo \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -F "photo=@test-image.jpg")

if echo "$UPLOAD_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Photo upload successful"
    PHOTO_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.profilePhoto')
    echo "Photo URL: $PHOTO_URL"
else
    echo "❌ Photo upload failed"
    echo "Response: $UPLOAD_RESPONSE"
fi

# Test photo removal
echo ""
echo "4. Testing photo removal..."
REMOVE_RESPONSE=$(curl -s -X DELETE http://localhost:3001/api/students/profile/photo \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if echo "$REMOVE_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Photo removal successful"
else
    echo "❌ Photo removal failed"
    echo "Response: $REMOVE_RESPONSE"
fi

# Clean up
echo ""
echo "5. Cleaning up..."
rm -f test-image.jpg
echo "✅ Test image removed"

echo ""
echo "🎉 Photo upload test completed!"
echo ""
echo "To test in the frontend:"
echo "1. Login as a student"
echo "2. Click on your profile photo in the dashboard"
echo "3. Use the photo upload modal to upload a photo"
echo "4. Check that the photo appears on your profile" 