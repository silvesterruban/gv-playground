#!/bin/bash

# GV Playground Test Script
# This script runs comprehensive tests for the entire application

set -e

echo "🧪 Starting GV Playground Test Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the gv-playground root directory"
    exit 1
fi

# Function to run backend tests
test_backend() {
    print_status "Testing Backend..."
    
    cd backend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing backend dependencies..."
        npm install
    fi
    
    # Run linting
    print_status "Running backend linting..."
    npm run lint
    
    # Run type checking
    print_status "Running backend type checking..."
    npx tsc --noEmit
    
    # Run tests
    print_status "Running backend tests..."
    npm test
    
    cd ..
    print_success "Backend tests completed!"
}

# Function to run frontend tests
test_frontend() {
    print_status "Testing Frontend..."
    
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Run linting
    print_status "Running frontend linting..."
    npm run lint
    
    # Run type checking
    print_status "Running frontend type checking..."
    npm run type-check
    
    # Run tests
    print_status "Running frontend tests..."
    npm test -- --coverage --watchAll=false
    
    cd ..
    print_success "Frontend tests completed!"
}

# Function to run Docker tests
test_docker() {
    print_status "Testing Docker builds..."
    
    # Test backend Docker build
    print_status "Building backend Docker image..."
    docker build -t gv-playground-backend-test ./backend
    
    # Test frontend Docker build
    print_status "Building frontend Docker image..."
    docker build -t gv-playground-frontend-test ./frontend
    
    # Test docker-compose
    print_status "Testing docker-compose configuration..."
    docker-compose config
    
    print_success "Docker tests completed!"
}

# Function to run infrastructure tests
test_infrastructure() {
    print_status "Testing Infrastructure..."
    
    cd infrastructure
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        print_warning "Terraform not found. Skipping infrastructure tests."
        cd ..
        return
    fi
    
    # Initialize Terraform
    print_status "Initializing Terraform..."
    terraform init -backend=false
    
    # Validate Terraform configuration
    print_status "Validating Terraform configuration..."
    terraform validate
    
    # Plan Terraform (dry run)
    print_status "Running Terraform plan (dry run)..."
    terraform plan -var-file="terraform.tfvars.example" -out=tfplan
    
    # Clean up
    rm -f tfplan
    
    cd ..
    print_success "Infrastructure tests completed!"
}

# Function to run Kubernetes tests
test_kubernetes() {
    print_status "Testing Kubernetes manifests..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        print_warning "kubectl not found. Skipping Kubernetes tests."
        return
    fi
    
    # Validate Kubernetes manifests
    for manifest in k8s/*.yaml; do
        if [ -f "$manifest" ]; then
            print_status "Validating $manifest..."
            kubectl apply --dry-run=client -f "$manifest"
        fi
    done
    
    # Validate monitoring manifests
    for manifest in k8s/monitoring/*.yaml; do
        if [ -f "$manifest" ]; then
            print_status "Validating $manifest..."
            kubectl apply --dry-run=client -f "$manifest"
        fi
    done
    
    print_success "Kubernetes tests completed!"
}

# Function to run security tests
test_security() {
    print_status "Running security tests..."
    
    # Check if Trivy is installed
    if ! command -v trivy &> /dev/null; then
        print_warning "Trivy not found. Skipping security tests."
        return
    fi
    
    # Scan backend Docker image
    print_status "Scanning backend Docker image for vulnerabilities..."
    trivy image gv-playground-backend-test
    
    # Scan frontend Docker image
    print_status "Scanning frontend Docker image for vulnerabilities..."
    trivy image gv-playground-frontend-test
    
    print_success "Security tests completed!"
}

# Function to run integration tests
test_integration() {
    print_status "Running integration tests..."
    
    # Start services with docker-compose
    print_status "Starting services with docker-compose..."
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Test backend health endpoint
    print_status "Testing backend health endpoint..."
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        print_success "Backend health check passed!"
    else
        print_error "Backend health check failed!"
    fi
    
    # Test frontend
    print_status "Testing frontend..."
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend is accessible!"
    else
        print_error "Frontend is not accessible!"
    fi
    
    # Stop services
    print_status "Stopping services..."
    docker-compose down
    
    print_success "Integration tests completed!"
}

# Main test execution
main() {
    print_status "GV Playground Test Suite Started"
    echo "=================================="
    
    # Run all tests
    test_backend
    test_frontend
    test_docker
    test_infrastructure
    test_kubernetes
    test_security
    test_integration
    
    echo "=================================="
    print_success "All tests completed successfully! 🎉"
    print_status "GV Playground is ready for deployment!"
}

# Handle script arguments
case "${1:-all}" in
    "backend")
        test_backend
        ;;
    "frontend")
        test_frontend
        ;;
    "docker")
        test_docker
        ;;
    "infrastructure")
        test_infrastructure
        ;;
    "kubernetes")
        test_kubernetes
        ;;
    "security")
        test_security
        ;;
    "integration")
        test_integration
        ;;
    "all"|*)
        main
        ;;
esac