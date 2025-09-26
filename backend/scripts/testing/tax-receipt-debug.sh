#!/bin/bash

# Tax Receipt Debug Script
echo "🔍 Debugging Tax Receipt Storage..."
echo "=================================="

RECEIPT_NUMBER="GV-2025-000008"
MOTO_URL="http://localhost:5001"

echo "1. Checking Moto S3 server status..."
curl -s "$MOTO_URL/" | head -3 || echo "❌ Moto server not responding"

echo ""
echo "2. Trying to access the PDF directly..."
curl -I "http://localhost:5001/village-uploads/uploads/a9ea4568-2aa4-40ed-920d-8f6d6e347568-tax-receipts/GV-2025-000008.pdf" 2>/dev/null || echo "❌ PDF not accessible via HTTP"

echo ""
echo "3. Checking local file system..."
find . -name "*$RECEIPT_NUMBER*" -type f 2>/dev/null | head -5
find /tmp -name "*$RECEIPT_NUMBER*" -type f 2>/dev/null | head -5
find ~/.moto -name "*$RECEIPT_NUMBER*" -type f 2>/dev/null | head -5

echo ""
echo "4. Checking Moto S3 bucket contents..."
curl -s "$MOTO_URL/village-uploads" | head -10 || echo "❌ Cannot list bucket contents"

echo ""
echo "5. Database check (run this manually):"
echo "   psql -d village_db -c \"SELECT id, \\\"receiptNumber\\\", \\\"receiptPdfUrl\\\", issued FROM tax_receipts WHERE \\\"receiptNumber\\\" = '$RECEIPT_NUMBER';\""

echo ""
echo "6. Check backend logs for AWS/S3 operations:"
echo "   Look in your backend console for AWS S3 upload messages"