#!/bin/bash

echo "🏥 GV Playground Health Check"
echo "============================"

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

# Function to check cluster connectivity
check_cluster_connectivity() {
    print_status "Checking cluster connectivity..."
    
    if kubectl cluster-info > /dev/null 2>&1; then
        print_success "Cluster connectivity: OK"
        kubectl cluster-info | head -1
    else
        print_error "Cluster connectivity: FAILED"
        return 1
    fi
}

# Function to check node status
check_node_status() {
    print_status "Checking node status..."
    
    local total_nodes=$(kubectl get nodes --no-headers | wc -l)
    local ready_nodes=$(kubectl get nodes --no-headers | grep Ready | wc -l)
    
    if [ "$total_nodes" -gt 0 ]; then
        print_success "Nodes: $ready_nodes/$total_nodes ready"
        
        if [ "$ready_nodes" -eq "$total_nodes" ]; then
            print_success "All nodes are healthy"
        else
            print_warning "Some nodes are not ready"
            kubectl get nodes | grep -v Ready
        fi
    else
        print_error "No nodes found"
        return 1
    fi
}

# Function to check pod status
check_pod_status() {
    print_status "Checking pod status..."
    
    local total_pods=$(kubectl get pods --no-headers | wc -l)
    local running_pods=$(kubectl get pods --no-headers | grep Running | wc -l)
    local pending_pods=$(kubectl get pods --no-headers | grep Pending | wc -l)
    local failed_pods=$(kubectl get pods --no-headers | grep -E "Failed|CrashLoopBackOff|Error" | wc -l)
    
    print_success "Pods: $running_pods running, $pending_pods pending, $failed_pods failed (Total: $total_pods)"
    
    if [ "$failed_pods" -gt 0 ]; then
        print_warning "Failed pods detected:"
        kubectl get pods | grep -E "Failed|CrashLoopBackOff|Error"
    fi
    
    # Check specific application pods
    print_status "Checking application-specific pods..."
    
    # Simple backend pods
    local simple_backend_pods=$(kubectl get pods -l app=simple-backend --no-headers | wc -l)
    local simple_backend_running=$(kubectl get pods -l app=simple-backend --no-headers | grep Running | wc -l)
    
    if [ "$simple_backend_pods" -gt 0 ]; then
        if [ "$simple_backend_running" -eq "$simple_backend_pods" ]; then
            print_success "Simple Backend: $simple_backend_running/$simple_backend_pods pods running"
        else
            print_warning "Simple Backend: $simple_backend_running/$simple_backend_pods pods running"
        fi
    fi
    
    # Frontend pods
    local frontend_pods=$(kubectl get pods -l app=village-frontend-real --no-headers | wc -l)
    local frontend_running=$(kubectl get pods -l app=village-frontend-real --no-headers | grep Running | wc -l)
    
    if [ "$frontend_pods" -gt 0 ]; then
        if [ "$frontend_running" -eq "$frontend_pods" ]; then
            print_success "Frontend: $frontend_running/$frontend_pods pods running"
        else
            print_warning "Frontend: $frontend_running/$frontend_pods pods running"
        fi
    fi
}

# Function to check service status
check_service_status() {
    print_status "Checking service status..."
    
    local total_services=$(kubectl get services --no-headers | wc -l)
    local loadbalancer_services=$(kubectl get services --no-headers | grep LoadBalancer | wc -l)
    
    print_success "Services: $total_services total, $loadbalancer_services LoadBalancers"
    
    # Check LoadBalancer external IPs
    if [ "$loadbalancer_services" -gt 0 ]; then
        print_status "LoadBalancer services:"
        kubectl get services | grep LoadBalancer | while read line; do
            local service_name=$(echo $line | awk '{print $1}')
            local external_ip=$(echo $line | awk '{print $4}')
            if [ "$external_ip" != "<pending>" ]; then
                print_success "  $service_name: $external_ip"
            else
                print_warning "  $service_name: External IP pending"
            fi
        done
    fi
}

# Function to check API endpoints
check_api_endpoints() {
    print_status "Checking API endpoints..."
    
    # Test simple backend health endpoint
    local backend_pod=$(kubectl get pods -l app=simple-backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -n "$backend_pod" ]; then
        local health_response=$(kubectl exec $backend_pod -- curl -s http://localhost:3001/api/health 2>/dev/null)
        
        if echo "$health_response" | grep -q "OK"; then
            print_success "Backend API: Health check passed"
        else
            print_error "Backend API: Health check failed"
        fi
        
        # Test authentication endpoints
        local auth_response=$(kubectl exec $backend_pod -- curl -s -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '{"name":"test","email":"test@test.com","password":"test"}' 2>/dev/null)
        
        if echo "$auth_response" | grep -q "success"; then
            print_success "Backend API: Authentication endpoints working"
        else
            print_error "Backend API: Authentication endpoints failed"
        fi
    else
        print_warning "Backend API: No backend pods found"
    fi
}

# Function to check frontend accessibility
check_frontend_accessibility() {
    print_status "Checking frontend accessibility..."
    
    local frontend_lb=$(kubectl get services | grep LoadBalancer | grep village-frontend | awk '{print $4}' | head -1)
    
    if [ -n "$frontend_lb" ] && [ "$frontend_lb" != "<pending>" ]; then
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" "http://$frontend_lb" 2>/dev/null)
        
        if [ "$response_code" = "200" ]; then
            print_success "Frontend: Accessible via LoadBalancer ($frontend_lb)"
        else
            print_warning "Frontend: LoadBalancer responding with code $response_code"
        fi
    else
        print_warning "Frontend: No accessible LoadBalancer found"
    fi
}

# Function to check resource usage
check_resource_usage() {
    print_status "Checking resource usage..."
    
    # Check node resource usage
    kubectl top nodes 2>/dev/null | head -5
    
    # Check pod resource usage
    print_status "Top resource-consuming pods:"
    kubectl top pods --sort-by=memory 2>/dev/null | head -5
}

# Function to generate health report
generate_health_report() {
    print_status "Generating health report..."
    
    local report_file="health-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "GV Playground Health Report - $(date)"
        echo "======================================"
        echo ""
        echo "Cluster Info:"
        kubectl cluster-info
        echo ""
        echo "Node Status:"
        kubectl get nodes
        echo ""
        echo "Pod Status:"
        kubectl get pods
        echo ""
        echo "Service Status:"
        kubectl get services
        echo ""
        echo "Resource Usage:"
        kubectl top nodes 2>/dev/null || echo "Resource metrics not available"
        kubectl top pods 2>/dev/null || echo "Resource metrics not available"
    } > "$report_file"
    
    print_success "Health report saved to: $report_file"
}

# Main execution
main() {
    echo ""
    print_status "Starting comprehensive health check..."
    echo ""
    
    check_cluster_connectivity
    echo ""
    
    check_node_status
    echo ""
    
    check_pod_status
    echo ""
    
    check_service_status
    echo ""
    
    check_api_endpoints
    echo ""
    
    check_frontend_accessibility
    echo ""
    
    check_resource_usage
    echo ""
    
    generate_health_report
    echo ""
    
    print_success "Health check completed! 🎉"
}

# Run main function
main