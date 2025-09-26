#!/bin/bash

echo "🧪 Testing Database Connectivity"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test database connectivity
test_database_connectivity() {
    echo -e "\n${BLUE}🔍 Testing Database Connectivity...${NC}"
    
    # Get database URL from secret
    DB_URL=$(kubectl get secret village-secrets -o jsonpath='{.data.database-url}' | base64 -d)
    
    if [ -z "$DB_URL" ]; then
        echo -e "${RED}❌ Database URL not found in secrets${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Database URL found in secrets${NC}"
    echo -e "${YELLOW}   📊 Database: ${DB_URL:0:50}...${NC}"
    
    # Test if we can connect to the database using a test pod
    echo -e "\n${BLUE}🔍 Testing database connection...${NC}"
    
    # Create a temporary test pod
    kubectl run db-test-pod --image=postgres:15-alpine --rm -i --restart=Never --env="PGPASSWORD=\$(echo '$DB_URL' | cut -d':' -f3 | cut -d'@' -f1)" -- psql "$DB_URL" -c "SELECT version();" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
        
        # Test basic database operations
        echo -e "\n${BLUE}🔍 Testing database operations...${NC}"
        
        # Test table creation
        kubectl run db-test-pod --image=postgres:15-alpine --rm -i --restart=Never --env="PGPASSWORD=\$(echo '$DB_URL' | cut -d':' -f3 | cut -d'@' -f1)" -- psql "$DB_URL" -c "CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name VARCHAR(100));" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Table creation successful${NC}"
            
            # Test data insertion
            kubectl run db-test-pod --image=postgres:15-alpine --rm -i --restart=Never --env="PGPASSWORD=\$(echo '$DB_URL' | cut -d':' -f3 | cut -d'@' -f1)" -- psql "$DB_URL" -c "INSERT INTO test_table (name) VALUES ('test_user');" 2>/dev/null
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Data insertion successful${NC}"
                
                # Test data retrieval
                kubectl run db-test-pod --image=postgres:15-alpine --rm -i --restart=Never --env="PGPASSWORD=\$(echo '$DB_URL' | cut -d':' -f3 | cut -d'@' -f1)" -- psql "$DB_URL" -c "SELECT * FROM test_table;" 2>/dev/null
                
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✅ Data retrieval successful${NC}"
                    
                    # Clean up test table
                    kubectl run db-test-pod --image=postgres:15-alpine --rm -i --restart=Never --env="PGPASSWORD=\$(echo '$DB_URL' | cut -d':' -f3 | cut -d'@' -f1)" -- psql "$DB_URL" -c "DROP TABLE test_table;" 2>/dev/null
                    
                    echo -e "${GREEN}✅ Database operations test completed successfully${NC}"
                    return 0
                else
                    echo -e "${RED}❌ Data retrieval failed${NC}"
                    return 1
                fi
            else
                echo -e "${RED}❌ Data insertion failed${NC}"
                return 1
            fi
        else
            echo -e "${RED}❌ Table creation failed${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        return 1
    fi
}

# Function to test database performance
test_database_performance() {
    echo -e "\n${BLUE}🔍 Testing Database Performance...${NC}"
    
    DB_URL=$(kubectl get secret village-secrets -o jsonpath='{.data.database-url}' | base64 -d)
    
    # Test connection time
    start_time=$(date +%s.%N)
    kubectl run db-perf-test --image=postgres:15-alpine --rm -i --restart=Never --env="PGPASSWORD=\$(echo '$DB_URL' | cut -d':' -f3 | cut -d'@' -f1)" -- psql "$DB_URL" -c "SELECT 1;" >/dev/null 2>&1
    end_time=$(date +%s.%N)
    
    connection_time=$(echo "$end_time - $start_time" | bc)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database connection time: ${connection_time}s${NC}"
        
        if (( $(echo "$connection_time < 2.0" | bc -l) )); then
            echo -e "${GREEN}✅ Database performance: Excellent${NC}"
        elif (( $(echo "$connection_time < 5.0" | bc -l) )); then
            echo -e "${YELLOW}⚠️  Database performance: Good${NC}"
        else
            echo -e "${RED}❌ Database performance: Poor${NC}"
        fi
    else
        echo -e "${RED}❌ Database performance test failed${NC}"
    fi
}

# Main execution
echo -e "${BLUE}🚀 Starting Database Connectivity Tests${NC}"

test_database_connectivity
if [ $? -eq 0 ]; then
    test_database_performance
    echo -e "\n${GREEN}🎉 All database tests passed!${NC}"
else
    echo -e "\n${RED}❌ Database tests failed!${NC}"
    exit 1
fi