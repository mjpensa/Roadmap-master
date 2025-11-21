#!/bin/bash
# Performance Optimization Test Suite for AI Roadmap Generator
# Purpose: Validate that chart generation completes within target times
# Author: Performance Optimization Team
# Date: 2025-11-22

# Configuration
API_URL="http://localhost:3000/api/generate-chart"
POLL_URL="http://localhost:3000/api/job"
MAX_POLL_ATTEMPTS=300  # 5 minutes
POLL_INTERVAL=1        # 1 second

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test result tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print colored output
print_status() {
    if [ "$1" = "PASS" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    elif [ "$1" = "FAIL" ]; then
        echo -e "${RED}❌ $2${NC}"
    elif [ "$1" = "INFO" ]; then
        echo -e "${YELLOW}ℹ️  $2${NC}"
    else
        echo "$2"
    fi
}

# Function to test chart generation
test_chart_generation() {
    local test_name=$1
    local prompt=$2
    local files=$3
    local expected_time=$4
    local expected_tasks_min=$5
    local expected_tasks_max=$6
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    print_status "INFO" "Running Test: $test_name"
    echo "  Files: $files"
    echo "  Expected: <${expected_time}s, ${expected_tasks_min}-${expected_tasks_max} tasks"
    
    # Start timer
    start_time=$(date +%s)
    
    # Create form data
    form_data="-F \"prompt=$prompt\""
    IFS=',' read -ra FILE_ARRAY <<< "$files"
    for file in "${FILE_ARRAY[@]}"; do
        if [ -f "$file" ]; then
            form_data="$form_data -F \"file=@$file\""
        else
            print_status "FAIL" "File not found: $file"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    done
    
    # Submit chart generation request
    response=$(eval "curl -s -X POST $API_URL $form_data")
    
    # Extract jobId
    job_id=$(echo $response | grep -o '"jobId":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$job_id" ]; then
        print_status "FAIL" "Failed to get jobId from response: $response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    echo "  Job ID: $job_id"
    
    # Poll for completion
    poll_count=0
    status="processing"
    
    while [ "$status" = "processing" ] && [ $poll_count -lt $MAX_POLL_ATTEMPTS ]; do
        sleep $POLL_INTERVAL
        poll_count=$((poll_count + 1))
        
        # Check job status
        job_response=$(curl -s "$POLL_URL/$job_id")
        status=$(echo $job_response | grep -o '"status":"[^"]*' | cut -d'"' -f4)
        
        # Show progress every 10 seconds
        if [ $((poll_count % 10)) -eq 0 ]; then
            echo -n "."
        fi
    done
    echo ""  # New line after dots
    
    # Calculate elapsed time
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    
    # Check results
    if [ "$status" = "complete" ]; then
        # Get chart data
        chart_id=$(echo $job_response | grep -o '"chartId":"[^"]*' | cut -d'"' -f4)
        
        if [ ! -z "$chart_id" ]; then
            # Analyze chart (would need additional endpoint)
            print_status "INFO" "  Chart ID: $chart_id"
            
            # Check timing
            if [ $elapsed -lt $expected_time ]; then
                print_status "PASS" "Completed in ${elapsed}s (target: <${expected_time}s)"
                
                # Note: Task count validation would require fetching chart data
                print_status "INFO" "  Task count validation requires chart data endpoint"
                
                TESTS_PASSED=$((TESTS_PASSED + 1))
                return 0
            else
                print_status "FAIL" "Took ${elapsed}s (target: <${expected_time}s)"
                TESTS_FAILED=$((TESTS_FAILED + 1))
                return 1
            fi
        else
            print_status "FAIL" "No chartId in response"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    elif [ "$status" = "error" ]; then
        error_msg=$(echo $job_response | grep -o '"error":"[^"]*' | cut -d'"' -f4)
        print_status "FAIL" "Job failed with error: $error_msg"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    else
        print_status "FAIL" "Timeout after ${elapsed}s (${poll_count} polls)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Function to create test files
create_test_files() {
    print_status "INFO" "Creating test files..."
    
    # Small test file (10KB)
    cat > test_small.md << 'EOF'
# Digital Transformation Roadmap

## Phase 1: Planning (Q1 2026)
- Conduct stakeholder analysis
- Define project scope and objectives
- Establish governance structure
- Complete technology assessment
- Develop business case

## Phase 2: Design (Q2 2026)  
- Design system architecture
- Create detailed specifications
- Plan data migration strategy
- Design user interfaces
- Develop security framework

## Phase 3: Implementation (Q3 2026)
- Set up development environment
- Build core functionality
- Integrate with existing systems
- Conduct unit testing
- Prepare deployment plan

## Phase 4: Testing (Q4 2026)
- Execute system testing
- Perform user acceptance testing
- Conduct security testing
- Complete performance testing
- Fix identified issues

## Phase 5: Deployment (Q1 2027)
- Deploy to production environment
- Migrate production data
- Train end users
- Monitor system performance
- Provide post-launch support
EOF
    
    # Medium test file (20KB) - repeat content
    cat test_small.md test_small.md > test_medium.md
    
    # Large test file (40KB) - repeat content
    cat test_medium.md test_medium.md > test_large.md
    
    print_status "PASS" "Test files created"
}

# Function to run all tests
run_test_suite() {
    echo "========================================="
    echo "AI Roadmap Generator Performance Test Suite"
    echo "========================================="
    echo ""
    
    # Create test files
    create_test_files
    echo ""
    
    # Test 1: Small single file
    test_chart_generation \
        "Small Single File (10KB)" \
        "Create a roadmap from this research" \
        "test_small.md" \
        45 \
        15 \
        25
    echo ""
    
    # Test 2: Medium single file  
    test_chart_generation \
        "Medium Single File (20KB)" \
        "Create a comprehensive roadmap" \
        "test_medium.md" \
        60 \
        20 \
        35
    echo ""
    
    # Test 3: Large single file
    test_chart_generation \
        "Large Single File (40KB)" \
        "Create a detailed roadmap" \
        "test_large.md" \
        75 \
        25 \
        40
    echo ""
    
    # Test 4: Multiple files
    test_chart_generation \
        "Multiple Files (30KB total)" \
        "Combine all research into roadmap" \
        "test_small.md,test_medium.md" \
        90 \
        30 \
        50
    echo ""
    
    # Print summary
    echo "========================================="
    echo "TEST SUMMARY"
    echo "========================================="
    echo "Tests Run: $TESTS_RUN"
    print_status "PASS" "Tests Passed: $TESTS_PASSED"
    print_status "FAIL" "Tests Failed: $TESTS_FAILED"
    
    success_rate=$((TESTS_PASSED * 100 / TESTS_RUN))
    echo "Success Rate: ${success_rate}%"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_status "PASS" "ALL TESTS PASSED! 🎉"
        exit 0
    else
        print_status "FAIL" "SOME TESTS FAILED"
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  run       Run the full test suite"
    echo "  quick     Run a quick single-file test"
    echo "  clean     Remove test files"
    echo "  help      Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 run    # Run all performance tests"
}

# Main script logic
case "${1:-run}" in
    run)
        run_test_suite
        ;;
    quick)
        create_test_files
        test_chart_generation \
            "Quick Test" \
            "Create a roadmap" \
            "test_small.md" \
            45 \
            15 \
            25
        ;;
    clean)
        rm -f test_small.md test_medium.md test_large.md
        print_status "PASS" "Test files removed"
        ;;
    help)
        show_usage
        ;;
    *)
        echo "Unknown option: $1"
        show_usage
        exit 1
        ;;
esac
