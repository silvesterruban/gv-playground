#!/bin/bash

# GV Playground Setup Script
# This script sets up the development environment for the GV Playground

set -e

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists node; then
        missing_deps+=("Node.js")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if ! command_exists docker; then
        missing_deps+=("Docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("Docker Compose")
    fi
    
    if ! command_exists git; then
        missing_deps+=("Git")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_status "Please install the missing dependencies and run this script again."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Function to check Node.js version
check_node_version() {
    print_status "Checking Node.js version..."
    
    local node_version=$(node --version | cut -d'v' -f2)
    local major_version=$(echo $node_version | cut -d'.' -f1)
    
    if [ "$major_version" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required. Current version: $node_version"
        exit 1
    fi
    
    print_success "Node.js version $node_version is compatible"
}

# Function to setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Backend environment
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
        print_success "Created backend/.env file"
    else
        print_warning "backend/.env already exists, skipping..."
    fi
    
    # Terraform variables
    if [ ! -f "infrastructure/terraform.tfvars" ]; then
        cp infrastructure/terraform.tfvars.example infrastructure/terraform.tfvars
        print_success "Created infrastructure/terraform.tfvars file"
    else
        print_warning "infrastructure/terraform.tfvars already exists, skipping..."
    fi
    
    print_warning "Please update the environment files with your configuration"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    print_success "All dependencies installed"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Start PostgreSQL
    print_status "Starting PostgreSQL container..."
    docker-compose up -d postgres
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Run database migrations
    print_status "Running database migrations..."
    cd backend
    npx prisma generate
    npx prisma db push
    cd ..
    
    print_success "Database setup complete"
}

# Function to build Docker images
build_images() {
    print_status "Building Docker images..."
    
    # Build backend image
    print_status "Building backend image..."
    cd backend
    docker build -t gv-playground-backend .
    cd ..
    
    # Build frontend image
    print_status "Building frontend image..."
    cd frontend
    docker build -t gv-playground-frontend .
    cd ..
    
    print_success "Docker images built successfully"
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    # Backend tests
    print_status "Running backend tests..."
    cd backend
    npm test
    cd ..
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd frontend
    npm test -- --watchAll=false
    cd ..
    
    print_success "All tests passed"
}

# Function to start development environment
start_development() {
    print_status "Starting development environment..."
    
    # Start all services
    docker-compose up -d
    
    print_success "Development environment started"
    print_status "Services available at:"
    print_status "  - Frontend: http://localhost:3000"
    print_status "  - Backend API: http://localhost:3001"
    print_status "  - PgAdmin: http://localhost:5050"
    print_status "  - Health Check: http://localhost:3001/api/health"
}

# Function to show help
show_help() {
    echo "GV Playground Setup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -c, --check         Check prerequisites only"
    echo "  -e, --env           Setup environment files only"
    echo "  -d, --deps          Install dependencies only"
    echo "  -b, --build         Build Docker images only"
    echo "  -t, --test          Run tests only"
    echo "  -s, --start         Start development environment only"
    echo "  --full              Run full setup (default)"
    echo ""
    echo "Examples:"
    echo "  $0                  # Run full setup"
    echo "  $0 --check          # Check prerequisites"
    echo "  $0 --deps           # Install dependencies only"
    echo "  $0 --start          # Start development environment"
}

# Main function
main() {
    local full_setup=true
    local check_only=false
    local env_only=false
    local deps_only=false
    local build_only=false
    local test_only=false
    local start_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--check)
                check_only=true
                full_setup=false
                shift
                ;;
            -e|--env)
                env_only=true
                full_setup=false
                shift
                ;;
            -d|--deps)
                deps_only=true
                full_setup=false
                shift
                ;;
            -b|--build)
                build_only=true
                full_setup=false
                shift
                ;;
            -t|--test)
                test_only=true
                full_setup=false
                shift
                ;;
            -s|--start)
                start_only=true
                full_setup=false
                shift
                ;;
            --full)
                full_setup=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Run setup based on options
    if [ "$check_only" = true ]; then
        check_prerequisites
        check_node_version
    elif [ "$env_only" = true ]; then
        setup_environment
    elif [ "$deps_only" = true ]; then
        install_dependencies
    elif [ "$build_only" = true ]; then
        build_images
    elif [ "$test_only" = true ]; then
        run_tests
    elif [ "$start_only" = true ]; then
        start_development
    elif [ "$full_setup" = true ]; then
        print_status "Starting full setup..."
        check_prerequisites
        check_node_version
        setup_environment
        install_dependencies
        setup_database
        build_images
        run_tests
        start_development
        
        print_success "Full setup complete!"
        print_status "Next steps:"
        print_status "1. Update environment files with your configuration"
        print_status "2. Configure AWS credentials for deployment"
        print_status "3. Set up GitHub repository and secrets"
        print_status "4. Deploy to AWS using Terraform"
    fi
}

# Run main function with all arguments
main "$@"