# Email Features Testing Guide

## Prerequisites
1. Backend running on port 3001
2. AWS SES configured and emails enabled
3. Stripe test mode enabled

## Test 1: Welcome Email (Registration)

### Step 1: Register a New Student
```bash
curl -X POST http://localhost:3001/api/registration-payment \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-student@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "Student",
    "school": "Test University",
    "major": "Computer Science",
    "graduationYear": 2025,
    "gpa": 3.8,
    "financialNeed": "High",
    "story": "This is a test student for email testing.",
    "paymentMethod": "stripe",
    "paymentToken": "tok_visa"
  }'
```

### Expected Result
- Student should be created in database
- Welcome email should be sent to student's email
- Check backend logs for: "Welcome email sent to..."

## Test 2: Donation Receipt Email

### Step 1: Create a Donor
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-donor@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "Donor",
    "userType": "donor"
  }'
```

### Step 2: Get Available Students
```bash
curl -X GET http://localhost:3001/api/donor/students \
  -H "Authorization: Bearer YOUR_DONOR_TOKEN"
```

### Step 3: Make a Donation
```bash
curl -X POST http://localhost:3001/api/donations \
  -H "Authorization: Bearer YOUR_DONOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STUDENT_ID_FROM_STEP_2",
    "amount": 5000,
    "paymentMethod": "stripe",
    "paymentToken": "tok_visa",
    "message": "Test donation for email testing"
  }'
```

### Expected Result
- Donation should be processed successfully
- Tax receipt PDF should be generated
- Email with PDF attachment should be sent to student
- Check backend logs for: "Donation receipt email sent to..."

## Automated Testing

Run the automated test script:
```bash
./scripts/test-email-features.sh
```

## Troubleshooting

### No Emails Received
1. Check AWS SES configuration
2. Verify email addresses are verified in SES
3. Check backend logs for errors
4. Ensure environment variables are set correctly

### Common Issues
- **SES not configured**: Check AWS credentials and SES setup
- **Email not verified**: Add test emails to SES verified list
- **PDF generation fails**: Check if all required fields are present
- **Backend errors**: Check logs for specific error messages

## Environment Variables Needed
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
SES_FROM_EMAIL=your-verified@email.com
NONPROFIT_EIN=XX-XXXXXXX
NONPROFIT_ADDRESS_STREET=123 Main St
NONPROFIT_ADDRESS_CITY=San Francisco
NONPROFIT_ADDRESS_STATE=CA
NONPROFIT_ADDRESS_ZIP=94105
``` 