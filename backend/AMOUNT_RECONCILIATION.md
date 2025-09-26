# Amount Reconciliation Scripts

This directory contains scripts to verify and reconcile dollar amounts across the application.

## Scripts

### Quick Amount Check (`quick-amount-check.js`)
A lightweight script for regular monitoring of amount consistency.

**Usage:**
```bash
npm run amounts:check
# or
node quick-amount-check.js
```

**What it checks:**
- Database amount totals
- String vs number amounts
- Invalid amounts
- Status breakdown
- Recent donation trends

### Full Reconciliation (`amount-reconciliation.js`)
A comprehensive script that checks amounts across database, API, and formatting.

**Usage:**
```bash
npm run amounts:reconcile
# or
node amount-reconciliation.js
```

**What it checks:**
- Database amounts
- API response amounts
- Currency formatting
- Cross-system consistency

## When to Use

### Quick Check (Daily/Monthly)
- Regular monitoring
- After deployments
- Before important reports
- Quick health check

### Full Reconciliation (Weekly/Monthly)
- Comprehensive audit
- After major changes
- Before financial reports
- Troubleshooting issues

## Expected Results

### ✅ Good Results
```
📊 DATABASE SUMMARY:
   - Total donations: 70
   - Completed donations: 58
   - Total amount: $16910.00
   - Completed amount: $11705.00
   - String amounts: 0
   - Invalid amounts: 0

✅ NO ISSUES FOUND - All amounts look good!
```

### ⚠️ Issues to Watch For
- String amounts in database
- Invalid amounts (negative or NaN)
- API/database mismatches
- Currency formatting errors

## Troubleshooting

### Common Issues

1. **String Amounts in Database**
   - Run database migration to convert to numbers
   - Check data import processes

2. **API/Database Mismatches**
   - Verify date filtering logic
   - Check status filtering
   - Ensure proper number conversion

3. **Currency Formatting Issues**
   - Verify Intl.NumberFormat usage
   - Check locale settings
   - Test edge cases (zero, large numbers)

### Running Scripts

Make sure the backend server is running:
```bash
npm run dev
```

Then run the checks:
```bash
# Quick check
npm run amounts:check

# Full reconciliation
npm run amounts:reconcile
```

## Data Integrity

These scripts help ensure:
- All amounts are stored as numbers
- API responses are consistent
- Currency formatting is correct
- No data corruption exists

Run these regularly to maintain data integrity and catch issues early! 