#!/bin/bash

# Task 6: API Testing Script
# Tests the auto-registration endpoint with various scenarios

API_URL=${1:-"http://localhost:3000"}

echo "=================================================="
echo "Testing Auto-Registration API"
echo "API URL: $API_URL"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}[Test 1] Health Check${NC}"
curl -s "$API_URL/health" | jq .
echo -e "\n"

# Test 2: Valid Student Registration
echo -e "${YELLOW}[Test 2] Valid Student Registration${NC}"
curl -s -X POST "$API_URL/api/students" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "dateOfBirth": "2001-03-15",
    "year": 2,
    "phoneNumber": "+91-9876543210",
    "department": "Computer Science"
  }' | jq .
echo -e "\n"

# Test 3: Invalid Email
echo -e "${YELLOW}[Test 3] Invalid Email${NC}"
curl -s -X POST "$API_URL/api/students" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "notanemail",
    "dateOfBirth": "2002-05-20",
    "year": 1,
    "phoneNumber": "+91-8765432109",
    "department": "Physics"
  }' | jq .
echo -e "\n"

# Test 4: Invalid Year
echo -e "${YELLOW}[Test 4] Invalid Year${NC}"
curl -s -X POST "$API_URL/api/students" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Bob",
    "lastName": "Brown",
    "email": "bob.brown@example.com",
    "dateOfBirth": "2000-08-10",
    "year": 5,
    "phoneNumber": "+91-7654321098",
    "department": "Chemistry"
  }' | jq .
echo -e "\n"

# Test 5: Unknown Department
echo -e "${YELLOW}[Test 5] Unknown Department${NC}"
curl -s -X POST "$API_URL/api/students" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Alice",
    "lastName": "Johnson",
    "email": "alice.j@example.com",
    "dateOfBirth": "2001-11-25",
    "year": 3,
    "phoneNumber": "+91-6543210987",
    "department": "Underwater Basket Weaving"
  }' | jq .
echo -e "\n"

# Test 6: Duplicate Email
echo -e "${YELLOW}[Test 6] Duplicate Email (should fail)${NC}"
curl -s -X POST "$API_URL/api/students" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Duplicate",
    "email": "john.doe@example.com",
    "dateOfBirth": "2003-01-01",
    "year": 1,
    "phoneNumber": "+91-5432109876",
    "department": "Mathematics"
  }' | jq .
echo -e "\n"

echo "=================================================="
echo "Testing Complete!"
echo "=================================================="
