# Email Features Test Guide

## Quick Test Steps

### Step 1: Test Welcome Email (Student Registration)

1. **Open a new terminal and run this command:**
```bash
curl -X POST http://localhost:3001/api/registration-payment/process \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-student-123@example.com",
    "amount": 2500,
    "currency": "usd",
    "paymentMethodId": "pm_card_visa",
    "isRegistrationPayment": true,
    "registrationData": {
      "email": "test-student-123@example.com",
      "password": "TestPassword123!",
      "firstName": "Test",
      "lastName": "Student",
      "school": "Test University",
      "major": "Computer Science"
    },
    "testCardData": {
      "number": "4242424242424242",
      "exp_month": 12,
      "exp_year": 2025,
      "cvc": "123"
    }
  }'
```

2. **Check your backend console for this message:**
```
✅ Welcome email sent to test-student-123@example.com
```

### Step 2: Test Donation Receipt Email

1. **Create a donor account:**
```bash
curl -X POST http://localhost:3001/api/auth/register/donor \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-donor-123@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "Donor"
  }'
```

2. **Copy the token from the response and use it here:**
```bash
curl -X POST http://localhost:3001/api/donations/create \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "4af067af-faa6-43c8-a70d-42f40fdd4dab",
    "amount": 5000,
    "paymentMethod": "stripe",
    "paymentToken": "tok_visa",
    "message": "Test donation",
    "donationType": "general"
  }'
```

3. **Check your backend console for this message:**
```
✅ Donation receipt email sent to test-student-123@example.com
```

## What to Look For

### ✅ Success Indicators:
- Backend console shows email sent messages
- No error messages in console
- Registration/donation completes successfully

### ❌ Error Indicators:
- Console shows "Failed to send email" messages
- AWS SES configuration errors
- Email addresses not verified in SES

## Troubleshooting

### If emails aren't being sent:
1. Check your AWS SES configuration
2. Verify email addresses are in SES verified list
3. Check environment variables are set correctly
4. Look for specific error messages in backend console

### Environment Variables Needed:
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
SES_FROM_EMAIL=your-verified@email.com
```

## Expected Results

1. **Welcome Email**: Student gets welcome email after registration
2. **Donation Receipt**: Student gets email with PDF receipt after donation
3. **Console Logs**: Success messages in backend console
4. **No Errors**: Clean execution without email-related errors 