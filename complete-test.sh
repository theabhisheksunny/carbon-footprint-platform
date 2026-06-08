#!/bin/bash

# Comprehensive Test Suite for Carbon Footprint Awareness Platform

BASE_URL="http://localhost:3000/api"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

echo "╔════════════════════════════════════════════════════════════╗"
echo "║    COMPREHENSIVE TEST SUITE                                ║"
echo "║    Carbon Footprint Awareness Platform                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"

    echo -n "Testing: $name... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "$body"
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "$body"
    fi
    echo ""
}

# Test 1: Health Check
echo -e "${BLUE}━━━ BASIC TESTS ━━━${NC}"
test_endpoint "Health Check" "GET" "/../health" ""

# Test 2: Create User
echo -e "${BLUE}━━━ USER TESTS ━━━${NC}"
USER_DATA='{
  "name": "Test User",
  "email": "test@platform.com",
  "location": "US",
  "profile": {
    "householdSize": 2,
    "carMilesPerYear": 10000,
    "carType": "hybrid",
    "electricityKwhPerMonth": 800,
    "heatingType": "naturalGas",
    "heatingUsage": "medium",
    "dietType": "vegetarian",
    "flightsPerYear": 2,
    "averageFlightDistance": 1200,
    "shoppingBudgetPerMonth": 400
  }
}'

USER_RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
    -H "Content-Type: application/json" \
    -d "$USER_DATA")

USER_ID=$(echo "$USER_RESPONSE" | jq -r '.user.id')
echo -e "${GREEN}Created user: $USER_ID${NC}\n"

# Test 3: Get User
test_endpoint "Get User" "GET" "/users/$USER_ID" ""

# Test 4: Get User Stats
test_endpoint "Get User Stats" "GET" "/users/$USER_ID/stats" ""

# Test 5: Get Dashboard
test_endpoint "Get Dashboard" "GET" "/users/$USER_ID/dashboard" ""

# Test 6: Log Activities
echo -e "${BLUE}━━━ ACTIVITY TESTS ━━━${NC}"

test_endpoint "Log Car Trip" "POST" "/activities" "{
  \"userId\": \"$USER_ID\",
  \"category\": \"transport\",
  \"type\": \"car\",
  \"subtype\": \"hybrid\",
  \"distance\": 50,
  \"description\": \"Commute\"
}"

test_endpoint "Log Meal" "POST" "/activities" "{
  \"userId\": \"$USER_ID\",
  \"category\": \"food\",
  \"type\": \"plantBased\",
  \"subtype\": \"vegetables\",
  \"amount\": 0.5,
  \"description\": \"Lunch salad\"
}"

test_endpoint "Log Electricity" "POST" "/activities" "{
  \"userId\": \"$USER_ID\",
  \"category\": \"energy\",
  \"type\": \"electricity\",
  \"subtype\": \"usAverage\",
  \"amount\": 30,
  \"description\": \"Daily usage\"
}"

# Test 7: Get Activities
test_endpoint "Get User Activities" "GET" "/activities/user/$USER_ID?limit=10" ""

# Test 8: Get Trends
test_endpoint "Get Activity Trends" "GET" "/activities/user/$USER_ID/trends?days=30" ""

# Test 9: Actions
echo -e "${BLUE}━━━ ACTION TESTS ━━━${NC}"

test_endpoint "Browse Actions" "GET" "/actions?sortBy=co2Reduction&limit=5" ""

test_endpoint "Get Recommendations" "GET" "/actions/user/$USER_ID/recommendations?limit=3" ""

test_endpoint "Start Action" "POST" "/actions/user/$USER_ID/start" "{
  \"actionId\": \"act-2\",
  \"notes\": \"Starting meatless days\"
}"

USER_ACTION_RESPONSE=$(curl -s -X POST "$BASE_URL/actions/user/$USER_ID/start" \
    -H "Content-Type: application/json" \
    -d '{"actionId": "act-5"}')

USER_ACTION_ID=$(echo "$USER_ACTION_RESPONSE" | jq -r '.userAction.id')

test_endpoint "Update Action Progress" "PUT" "/actions/user/$USER_ID/actions/$USER_ACTION_ID" "{
  \"progress\": 75
}"

# Test 10: Calculator
echo -e "${BLUE}━━━ CALCULATOR TESTS ━━━${NC}"

test_endpoint "Calculate Emissions" "POST" "/calculator/calculate" "{
  \"category\": \"transport\",
  \"type\": \"car\",
  \"subtype\": \"gasoline\",
  \"distance\": 100
}"

test_endpoint "Calculate Baseline" "POST" "/calculator/baseline" "{
  \"location\": \"US\",
  \"carMilesPerYear\": 12000,
  \"dietType\": \"average\"
}"

test_endpoint "Compare Scenarios" "POST" "/calculator/compare" "{
  \"scenario1\": {
    \"category\": \"transport\",
    \"type\": \"car\",
    \"subtype\": \"gasoline\",
    \"distance\": 50
  },
  \"scenario2\": {
    \"category\": \"transport\",
    \"type\": \"publicTransit\",
    \"subtype\": \"bus\",
    \"distance\": 50
  }
}"

test_endpoint "Get Equivalents" "POST" "/calculator/equivalents" "{
  \"co2Amount\": 1000
}"

test_endpoint "Get Regional Averages" "GET" "/calculator/regional-averages" ""

# Test 11: Social Features
echo -e "${BLUE}━━━ SOCIAL TESTS ━━━${NC}"

test_endpoint "Get Leaderboard" "GET" "/social/leaderboard?limit=10" ""

test_endpoint "Get Challenges" "GET" "/social/challenges?status=active" ""

test_endpoint "Get Achievements" "GET" "/social/user/$USER_ID/achievements" ""

test_endpoint "Get Comparison" "GET" "/social/user/$USER_ID/comparison" ""

# Test 12: NEW - Insights
echo -e "${BLUE}━━━ INSIGHTS TESTS (NEW!) ━━━${NC}"

test_endpoint "Get Personalized Insights" "GET" "/insights/user/$USER_ID" ""

test_endpoint "Get Streak Info" "GET" "/insights/user/$USER_ID/streak" ""

test_endpoint "Get Forecast" "GET" "/insights/user/$USER_ID/forecast?timeframe=year" ""

# Test 13: NEW - Reports
echo -e "${BLUE}━━━ REPORTS TESTS (NEW!) ━━━${NC}"

test_endpoint "Generate JSON Report" "GET" "/reports/user/$USER_ID?format=json&period=month" ""

echo -e "${YELLOW}Generating text report...${NC}"
curl -s "$BASE_URL/reports/user/$USER_ID?format=text&period=month" | head -40
echo ""

echo -e "${YELLOW}Testing CSV export...${NC}"
curl -s "$BASE_URL/reports/user/$USER_ID/export?type=activities" | head -5
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    TEST SUMMARY                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests:  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}🌍 Platform is fully functional!${NC}"
else
    echo -e "${RED}✗ Some tests failed. Check output above.${NC}"
fi
echo ""
