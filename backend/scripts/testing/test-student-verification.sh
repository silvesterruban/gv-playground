#!/bin/bash

# 🎯 Complete Verification Flow Test Script (Updated for Fixed Routing)
# Tests the entire student verification flow from submission to admin approval

set -e  # Exit on any error

# Configuration
API_BASE="http://localhost:3001/api"
STUDENT_EMAIL="t@gmail.com"
STUDENT_PASSWORD="Test1234$"
ADMIN_EMAIL="admin@village.com"
ADMIN_PASSWORD="AdminPassword123!"

# NEW: Check which admin route structure is being used
ADMIN_VERIFICATION_BASE="$API_BASE/admin"  # Will be updated after route detection

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if server is running
check_server() {
    log_info "Checking if server is running..."
    if curl -s "$API_BASE/health" > /dev/null 2>&1; then
        log_success "Server is running"
    else
        log_error "Server is not running on $API_BASE"
        log_info "Please start your backend server first"
        exit 1
    fi
}

# NEW: Detect correct admin route structure
detect_admin_routes() {
    log_info "Detecting admin route structure..."

    # Get admin token first
    local TEMP_ADMIN_TOKEN=$(get_admin_token_silent)

    if [ -z "$TEMP_ADMIN_TOKEN" ]; then
        log_warning "Cannot detect routes without admin token, using default structure"
        ADMIN_VERIFICATION_BASE="$API_BASE/admin"
        return
    fi

    # Test different route structures
    echo "Testing route structures..."

    # Test 1: /api/admin/verifications (original structure)
    local RESPONSE1=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "$API_BASE/admin/verifications/stats" \
        -H "Authorization: Bearer $TEMP_ADMIN_TOKEN" 2>/dev/null || echo "000")

    # Test 2: /api/admin/verification/verifications (separate path)
    local RESPONSE2=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "$API_BASE/admin/verification/verifications/stats" \
        -H "Authorization: Bearer $TEMP_ADMIN_TOKEN" 2>/dev/null || echo "000")

    # Test 3: /api/admin-verification/verifications (separate base)
    local RESPONSE3=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "$API_BASE/admin-verification/verifications/stats" \
        -H "Authorization: Bearer $TEMP_ADMIN_TOKEN" 2>/dev/null || echo "000")

    echo "Route test results: Original=$RESPONSE1, Separate=$RESPONSE2, Base=$RESPONSE3"

    if [ "$RESPONSE1" = "200" ]; then
        ADMIN_VERIFICATION_BASE="$API_BASE/admin"
        log_success "Using original route structure: /api/admin/*"
    elif [ "$RESPONSE2" = "200" ]; then
        ADMIN_VERIFICATION_BASE="$API_BASE/admin/verification"
        log_success "Using separate path structure: /api/admin/verification/*"
    elif [ "$RESPONSE3" = "200" ]; then
        ADMIN_VERIFICATION_BASE="$API_BASE/admin-verification"
        log_success "Using separate base structure: /api/admin-verification/*"
    else
        log_warning "Could not detect working route, using default: /api/admin/*"
        ADMIN_VERIFICATION_BASE="$API_BASE/admin"
    fi
}

# Helper function to get admin token silently (for route detection)
get_admin_token_silent() {
    local RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$ADMIN_EMAIL\",
            \"password\": \"$ADMIN_PASSWORD\",
            \"userType\": \"admin\"
        }" 2>/dev/null)

    echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo ""
}

# Test 1: Student Login
student_login() {
    log_info "Step 1: Student Login"

    STUDENT_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$STUDENT_EMAIL\",
            \"password\": \"$STUDENT_PASSWORD\",
            \"userType\": \"student\"
        }")

    echo "Student login response: $STUDENT_LOGIN_RESPONSE"

    # Extract token
    STUDENT_TOKEN=$(echo "$STUDENT_LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$STUDENT_TOKEN" ]; then
        log_error "Failed to get student token"
        log_warning "Creating test student account..."

        # Try to create student account
        CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
            -H "Content-Type: application/json" \
            -d "{
                \"email\": \"$STUDENT_EMAIL\",
                \"password\": \"$STUDENT_PASSWORD\",
                \"firstName\": \"Test\",
                \"lastName\": \"Student\",
                \"schoolName\": \"Harvard University\",
                \"userType\": \"student\"
            }")

        echo "Account creation response: $CREATE_RESPONSE"

        # Try login again
        STUDENT_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
            -H "Content-Type: application/json" \
            -d "{
                \"email\": \"$STUDENT_EMAIL\",
                \"password\": \"$STUDENT_PASSWORD\",
                \"userType\": \"student\"
            }")

        STUDENT_TOKEN=$(echo "$STUDENT_LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

        if [ -z "$STUDENT_TOKEN" ]; then
            log_error "Still failed to get student token. Please check your auth endpoint."
            echo "Login response: $STUDENT_LOGIN_RESPONSE"
            exit 1
        fi
    fi

    log_success "Student logged in successfully"
    echo "Student Token: ${STUDENT_TOKEN:0:20}..."
}

# Test 2: Get Available Schools
get_schools() {
    log_info "Step 2: Get Available Schools"

    SCHOOLS_RESPONSE=$(curl -s -X GET "$API_BASE/students/schools" \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        -H "Content-Type: application/json")

    echo "Schools response: $SCHOOLS_RESPONSE"

    # Extract first school ID
    SCHOOL_ID=$(echo "$SCHOOLS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -z "$SCHOOL_ID" ]; then
        log_error "No schools found"
        echo "Full response: $SCHOOLS_RESPONSE"
        exit 1
    fi

    log_success "Found schools, using school ID: $SCHOOL_ID"
}

# Test 3: Check Initial Verification Status
check_initial_status() {
    log_info "Step 3: Check Initial Verification Status"

    INITIAL_STATUS=$(curl -s -X GET "$API_BASE/students/verification-status" \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        -H "Content-Type: application/json")

    echo "Initial status: $INITIAL_STATUS"
    log_success "Initial status checked"
}

# Test 4: Submit Verification
submit_verification() {
    log_info "Step 4: Submit Student Verification"

    SUBMIT_RESPONSE=$(curl -s -X POST "$API_BASE/students/submit-verification" \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"schoolId\": \"$SCHOOL_ID\",
            \"verificationMethod\": \"email\",
            \"verificationEmail\": \"$STUDENT_EMAIL\"
        }")

    echo "Submit response: $SUBMIT_RESPONSE"

    # Extract verification ID
    VERIFICATION_ID=$(echo "$SUBMIT_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$VERIFICATION_ID" ]; then
        log_warning "Could not extract verification ID, but submission might still be successful"
    else
        log_success "Verification submitted with ID: $VERIFICATION_ID"
    fi
}

# Test 5: Check Updated Status
check_pending_status() {
    log_info "Step 5: Check Pending Verification Status"

    PENDING_STATUS=$(curl -s -X GET "$API_BASE/students/verification-status" \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        -H "Content-Type: application/json")

    echo "Pending status: $PENDING_STATUS"
    log_success "Pending status checked"
}

# Test 6: Admin Login
admin_login() {
    log_info "Step 6: Admin Login"

    ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$ADMIN_EMAIL\",
            \"password\": \"$ADMIN_PASSWORD\",
            \"userType\": \"admin\"
        }")

    echo "Admin login response: $ADMIN_LOGIN_RESPONSE"

    ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$ADMIN_TOKEN" ]; then
        log_warning "Failed to get admin token - you may need to create an admin account"
        log_info "Skipping admin tests..."
        return 1
    fi

    log_success "Admin logged in successfully"
    echo "Admin Token: ${ADMIN_TOKEN:0:20}..."
    return 0
}

# Test 7: Admin Get Verifications (UPDATED for new routing)
admin_get_verifications() {
    log_info "Step 7: Admin Get Verifications"
    log_info "Using admin base URL: $ADMIN_VERIFICATION_BASE"

    # Test both pending and all verifications
    echo ""
    echo "Testing pending verifications:"
    ADMIN_VERIFICATIONS_PENDING=$(curl -s -X GET "$ADMIN_VERIFICATION_BASE/verifications?status=pending" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json")

    echo "Pending verifications: $ADMIN_VERIFICATIONS_PENDING"

    echo ""
    echo "Testing all verifications:"
    ADMIN_VERIFICATIONS_ALL=$(curl -s -X GET "$ADMIN_VERIFICATION_BASE/verifications" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json")

    echo "All verifications: $ADMIN_VERIFICATIONS_ALL"

    # Extract verification ID from admin response (try both responses)
    ADMIN_VERIFICATION_ID=$(echo "$ADMIN_VERIFICATIONS_PENDING" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -z "$ADMIN_VERIFICATION_ID" ]; then
        ADMIN_VERIFICATION_ID=$(echo "$ADMIN_VERIFICATIONS_ALL" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    fi

    if [ -z "$ADMIN_VERIFICATION_ID" ]; then
        log_warning "No verifications found in admin panel"
        echo "Pending response: $ADMIN_VERIFICATIONS_PENDING"
        echo "All response: $ADMIN_VERIFICATIONS_ALL"
        return 1
    fi

    log_success "Found verification: $ADMIN_VERIFICATION_ID"
    return 0
}

# Test 8: Admin Approve Verification (UPDATED for new routing)
admin_approve() {
    log_info "Step 8: Admin Approve Verification"
    log_info "Approving verification ID: $ADMIN_VERIFICATION_ID"

    APPROVE_RESPONSE=$(curl -s -X POST "$ADMIN_VERIFICATION_BASE/verifications/$ADMIN_VERIFICATION_ID/approve" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{}")

    echo "Approve response: $APPROVE_RESPONSE"
    log_success "Verification approved"
}

# Test 9: Check Final Status
check_final_status() {
    log_info "Step 9: Check Final Verification Status"

    FINAL_STATUS=$(curl -s -X GET "$API_BASE/students/verification-status" \
        -H "Authorization: Bearer $STUDENT_TOKEN" \
        -H "Content-Type: application/json")

    echo "Final status: $FINAL_STATUS"
    log_success "Final status checked"
}

# Test 10: Admin Get Stats (UPDATED for new routing)
admin_get_stats() {
    log_info "Step 10: Admin Get Verification Statistics"

    ADMIN_STATS=$(curl -s -X GET "$ADMIN_VERIFICATION_BASE/verifications/stats" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json")

    echo "Admin stats: $ADMIN_STATS"
    log_success "Admin stats retrieved"
}

# NEW: Test Admin Route Debugging
test_admin_routes() {
    log_info "🧪 Testing Admin Route Endpoints"

    if [ -z "$ADMIN_TOKEN" ]; then
        log_warning "No admin token available for route testing"
        return
    fi

    echo ""
    echo "Testing different admin endpoints:"

    # Test stats endpoint
    echo "1. Stats endpoint:"
    STATS_RESPONSE=$(curl -s -X GET "$ADMIN_VERIFICATION_BASE/verifications/stats" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json")
    echo "   Response: $STATS_RESPONSE"

    # Test verifications list
    echo "2. Verifications list:"
    LIST_RESPONSE=$(curl -s -X GET "$ADMIN_VERIFICATION_BASE/verifications" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json")
    echo "   Response: $LIST_RESPONSE"

    # Test debug endpoints if available
    echo "3. Debug endpoint:"
    DEBUG_RESPONSE=$(curl -s -X GET "$ADMIN_VERIFICATION_BASE/debug/test-new-code" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json")
    echo "   Response: $DEBUG_RESPONSE"
}

# Main execution
main() {
    echo "🎯 Starting Complete Verification Flow Test (Updated)"
    echo "====================================================="

    # Check server
    check_server

    # NEW: Detect admin routes
    detect_admin_routes

    # Student flow
    student_login
    get_schools
    check_initial_status
    submit_verification
    check_pending_status

    # Admin flow
    if admin_login; then
        # NEW: Test admin routes first
        test_admin_routes

        if admin_get_verifications; then
            admin_approve
            check_final_status
            admin_get_stats
        fi
    fi

    echo ""
    echo "🎉 Test completed!"
    echo "Check the responses above to verify the flow works correctly."
    echo "Admin routes detected: $ADMIN_VERIFICATION_BASE"
}

# Test individual endpoints (UPDATED)
test_individual_endpoints() {
    echo ""
    echo "🧪 Individual Endpoint Tests (Updated)"
    echo "======================================"

    check_server
    detect_admin_routes

    if [ ! -z "$STUDENT_TOKEN" ] || student_login; then
        echo ""
        log_info "Testing student endpoints individually:"

        echo "1. GET $API_BASE/students/schools"
        curl -s -X GET "$API_BASE/students/schools" \
            -H "Authorization: Bearer $STUDENT_TOKEN" | jq . 2>/dev/null || echo "Response received"

        echo ""
        echo "2. GET $API_BASE/students/verification-status"
        curl -s -X GET "$API_BASE/students/verification-status" \
            -H "Authorization: Bearer $STUDENT_TOKEN" | jq . 2>/dev/null || echo "Response received"
    fi

    if [ ! -z "$ADMIN_TOKEN" ] || admin_login; then
        echo ""
        log_info "Testing admin endpoints individually:"
        log_info "Using base URL: $ADMIN_VERIFICATION_BASE"

        echo "1. GET $ADMIN_VERIFICATION_BASE/verifications/stats"
        curl -s -X GET "$ADMIN_VERIFICATION_BASE/verifications/stats" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq . 2>/dev/null || echo "Response received"

        echo ""
        echo "2. GET $ADMIN_VERIFICATION_BASE/verifications"
        curl -s -X GET "$ADMIN_VERIFICATION_BASE/verifications" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq . 2>/dev/null || echo "Response received"

        echo ""
        echo "3. GET $ADMIN_VERIFICATION_BASE/verifications?status=approved"
        curl -s -X GET "$ADMIN_VERIFICATION_BASE/verifications?status=approved" \
            -H "Authorization: Bearer $ADMIN_TOKEN" | jq . 2>/dev/null || echo "Response received"
    fi
}

# Parse command line arguments
case "${1:-}" in
    "individual")
        test_individual_endpoints
        ;;
    "admin-only")
        check_server
        detect_admin_routes
        admin_login
        test_admin_routes
        ;;
    "routes")
        check_server
        detect_admin_routes
        echo "Detected admin route base: $ADMIN_VERIFICATION_BASE"
        ;;
    "help")
        echo "Usage: $0 [command]"
        echo "Commands:"
        echo "  (no args)   - Run complete flow test"
        echo "  individual  - Test individual endpoints"
        echo "  admin-only  - Test only admin endpoints"
        echo "  routes      - Detect and show admin route structure"
        echo "  help        - Show this help"
        ;;
    *)
        main
        ;;
esac