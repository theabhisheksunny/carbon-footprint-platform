#!/bin/bash

# Carbon Footprint Awareness Platform - Demo Script
# This script demonstrates all the key features of the API

BASE_URL="http://localhost:3000/api"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Carbon Footprint Awareness Platform - API Demo         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${YELLOW}➜ $1${NC}"
}

# Check if server is running
print_section "1. Health Check"
print_info "Checking if server is running..."
HEALTH=$(curl -s "$BASE_URL/../health")
if [ $? -eq 0 ]; then
    print_success "Server is healthy!"
    echo "$HEALTH" | jq '.'
else
    echo "❌ Server is not running. Please start it with: npm start"
    exit 1
fi

# 1. Create User (Onboarding)
print_section "2. User Onboarding"
print_info "Creating a new user with profile..."

USER_RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Green",
    "email": "alice@example.com",
    "location": "US",
    "profile": {
      "householdSize": 2,
      "carMilesPerYear": 8000,
      "carType": "hybrid",
      "electricityKwhPerMonth": 750,
      "heatingType": "naturalGas",
      "heatingUsage": "medium",
      "dietType": "vegetarian",
      "flightsPerYear": 2,
      "averageFlightDistance": 1000,
      "shoppingBudgetPerMonth": 350
    }
  }')

USER_ID=$(echo "$USER_RESPONSE" | jq -r '.user.id')
BASELINE=$(echo "$USER_RESPONSE" | jq -r '.user.baselineFootprint')
print_success "User created! ID: $USER_ID"
echo "Baseline footprint: $BASELINE kg CO2/year"
echo "$USER_RESPONSE" | jq '.user'

# 2. Log Activities
print_section "3. Logging Activities"

# Log a car trip
print_info "Logging a car trip (50 miles)..."
ACTIVITY1=$(curl -s -X POST "$BASE_URL/activities" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"category\": \"transport\",
    \"type\": \"car\",
    \"subtype\": \"hybrid\",
    \"distance\": 50,
    \"description\": \"Commute to work\"
  }")
CO2_1=$(echo "$ACTIVITY1" | jq -r '.activity.co2Equivalent')
print_success "Logged car trip: $CO2_1 kg CO2"

# Log a meal
print_info "Logging a vegetarian meal..."
ACTIVITY2=$(curl -s -X POST "$BASE_URL/activities" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"category\": \"food\",
    \"type\": \"plantBased\",
    \"subtype\": \"legumes\",
    \"amount\": 0.3,
    \"description\": \"Lunch - lentil soup\"
  }")
CO2_2=$(echo "$ACTIVITY2" | jq -r '.activity.co2Equivalent')
print_success "Logged meal: $CO2_2 kg CO2"

# Log home energy
print_info "Logging home electricity usage (25 kWh)..."
ACTIVITY3=$(curl -s -X POST "$BASE_URL/activities" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"category\": \"energy\",
    \"type\": \"electricity\",
    \"subtype\": \"usAverage\",
    \"amount\": 25,
    \"description\": \"Daily home electricity\"
  }")
CO2_3=$(echo "$ACTIVITY3" | jq -r '.activity.co2Equivalent')
print_success "Logged electricity: $CO2_3 kg CO2"

# 3. Get Dashboard
print_section "4. User Dashboard"
print_info "Fetching user dashboard..."

DASHBOARD=$(curl -s "$BASE_URL/users/$USER_ID/dashboard")
print_success "Dashboard retrieved!"
echo "$DASHBOARD" | jq '.dashboard.stats'

# 4. Browse Actions
print_section "5. Discovering Reduction Actions"
print_info "Browsing available actions (sorted by CO2 reduction)..."

ACTIONS=$(curl -s "$BASE_URL/actions?sortBy=co2Reduction&limit=5")
print_success "Top 5 actions by impact:"
echo "$ACTIONS" | jq -r '.actions[] | "  • \(.title) - \(.estimatedCO2Reduction) kg CO2/year (\(.difficulty))"'

# 5. Get Personalized Recommendations
print_section "6. Personalized Recommendations"
print_info "Getting personalized action recommendations..."

RECOMMENDATIONS=$(curl -s "$BASE_URL/actions/user/$USER_ID/recommendations?limit=3")
print_success "Top 3 recommendations for Alice:"
echo "$RECOMMENDATIONS" | jq -r '.recommendations[] | "  • \(.title) - \(.estimatedCO2Reduction) kg CO2/year"'

# 6. Start an Action
print_section "7. Starting a Reduction Action"
print_info "Alice is starting 'Reduce meat consumption'..."

ACTION_ID="act-2"
USER_ACTION=$(curl -s -X POST "$BASE_URL/actions/user/$USER_ID/start" \
  -H "Content-Type: application/json" \
  -d "{
    \"actionId\": \"$ACTION_ID\",
    \"notes\": \"Going meatless on Mondays and Wednesdays\"
  }")

USER_ACTION_ID=$(echo "$USER_ACTION" | jq -r '.userAction.id')
print_success "Action started! ID: $USER_ACTION_ID"
echo "$USER_ACTION" | jq '.actionDetails | {title, estimatedCO2Reduction, difficulty}'

# 7. Update Progress
print_section "8. Updating Action Progress"
print_info "Updating progress to 50%..."

curl -s -X PUT "$BASE_URL/actions/user/$USER_ID/actions/$USER_ACTION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 50,
    "notes": "Two weeks completed successfully!"
  }' > /dev/null

print_success "Progress updated to 50%"

# 8. Complete Action
print_section "9. Completing an Action"
print_info "Completing the action..."

COMPLETION=$(curl -s -X POST "$BASE_URL/actions/user/$USER_ID/actions/$USER_ACTION_ID/complete" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Successfully went meatless 2-3 days per week for a month!"
  }')

TOTAL_REDUCED=$(echo "$COMPLETION" | jq -r '.totalCO2Reduced')
print_success "Action completed! Total CO2 reduced: $TOTAL_REDUCED kg"

# 9. Calculate Scenario Comparison
print_section "10. Comparing Scenarios"
print_info "Comparing driving vs. taking the bus (50 miles)..."

COMPARISON=$(curl -s -X POST "$BASE_URL/calculator/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario1": {
      "category": "transport",
      "type": "car",
      "subtype": "gasoline",
      "distance": 50
    },
    "scenario2": {
      "category": "transport",
      "type": "publicTransit",
      "subtype": "bus",
      "distance": 50
    }
  }')

SAVINGS=$(echo "$COMPARISON" | jq -r '.comparison.savings')
PERCENT=$(echo "$COMPARISON" | jq -r '.comparison.percentageChange')
print_success "Taking the bus saves $SAVINGS kg CO2 ($PERCENT)"
echo "$COMPARISON" | jq '.comparison | {scenario1: .scenario1.co2Equivalent, scenario2: .scenario2.co2Equivalent, savings}'

# 10. Get Impact Equivalents
print_section "11. Impact Equivalents"
print_info "Converting Alice's reduced CO2 to equivalents..."

EQUIVALENTS=$(curl -s -X POST "$BASE_URL/calculator/equivalents" \
  -H "Content-Type: application/json" \
  -d "{
    \"co2Amount\": $TOTAL_REDUCED
  }")

print_success "Impact equivalents for $TOTAL_REDUCED kg CO2:"
echo "$EQUIVALENTS" | jq -r '.equivalents | to_entries[] | "  • \(.value.description)"'

# 11. Browse Challenges
print_section "12. Community Challenges"
print_info "Browsing active challenges..."

CHALLENGES=$(curl -s "$BASE_URL/social/challenges?status=active")
print_success "Active challenges:"
echo "$CHALLENGES" | jq -r '.challenges[] | "  • \(.title) - \(.description)"'

# 12. Join a Challenge
CHALLENGE_ID=$(echo "$CHALLENGES" | jq -r '.challenges[0].id')
if [ "$CHALLENGE_ID" != "null" ]; then
    print_info "Alice is joining the first challenge..."

    curl -s -X POST "$BASE_URL/social/challenges/$CHALLENGE_ID/join" \
      -H "Content-Type: application/json" \
      -d "{
        \"userId\": \"$USER_ID\"
      }" > /dev/null

    print_success "Joined challenge!"
fi

# 13. Get Leaderboard
print_section "13. Leaderboard"
print_info "Fetching the leaderboard..."

LEADERBOARD=$(curl -s "$BASE_URL/social/leaderboard?limit=5")
print_success "Top performers:"
echo "$LEADERBOARD" | jq -r '.leaderboard[] | "  \(.name): \(.totalReduction) kg CO2 reduced"'

# 14. Get Achievements
print_section "14. User Achievements"
print_info "Checking Alice's achievements..."

ACHIEVEMENTS=$(curl -s "$BASE_URL/social/user/$USER_ID/achievements")
UNLOCKED=$(echo "$ACHIEVEMENTS" | jq -r '[.achievements[] | select(.unlocked == true)] | length')
TOTAL=$(echo "$ACHIEVEMENTS" | jq -r '.totalAchievements')
print_success "Alice has unlocked $UNLOCKED out of $TOTAL achievements:"
echo "$ACHIEVEMENTS" | jq -r '.achievements[] | select(.unlocked == true) | "  \(.icon) \(.title) - \(.description)"'

# 15. Get Activity Trends
print_section "15. Activity Trends"
print_info "Getting activity trends for the last 30 days..."

TRENDS=$(curl -s "$BASE_URL/activities/user/$USER_ID/trends?days=30")
print_success "Activity breakdown by category:"
echo "$TRENDS" | jq '.trends.byCategory'

# 16. Get User Stats
print_section "16. User Statistics"
print_info "Fetching comprehensive statistics..."

STATS=$(curl -s "$BASE_URL/users/$USER_ID/stats")
print_success "Statistics for Alice Green:"
echo "$STATS" | jq '.stats | {totalActivities, totalCO2Generated, totalCO2Reduced, netCO2, comparisonToAverage}'

# 17. Create Another User for Comparison
print_section "17. Community Comparison"
print_info "Creating another user for comparison..."

USER2_RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Brown",
    "email": "bob@example.com",
    "location": "US",
    "profile": {
      "householdSize": 1,
      "carMilesPerYear": 15000,
      "carType": "gasoline",
      "electricityKwhPerMonth": 1000,
      "heatingType": "naturalGas",
      "heatingUsage": "high",
      "dietType": "high-meat",
      "flightsPerYear": 4,
      "averageFlightDistance": 2000,
      "shoppingBudgetPerMonth": 600
    }
  }')

USER2_ID=$(echo "$USER2_RESPONSE" | jq -r '.user.id')
print_success "Created user Bob (higher carbon lifestyle)"

print_info "Comparing Alice vs. community..."
COMPARISON_DATA=$(curl -s "$BASE_URL/social/user/$USER_ID/comparison")
print_success "Comparison results:"
echo "$COMPARISON_DATA" | jq '.comparison'

# Summary
print_section "🎉 Demo Complete!"
echo ""
echo "Summary:"
echo "  • Created 2 users (Alice & Bob)"
echo "  • Logged 3 activities"
echo "  • Started and completed 1 reduction action"
echo "  • Calculated CO2 reductions: $TOTAL_REDUCED kg"
echo "  • Compared scenarios and viewed equivalents"
echo "  • Explored challenges and achievements"
echo "  • Viewed leaderboards and statistics"
echo ""
echo "User IDs for further testing:"
echo "  Alice: $USER_ID"
echo "  Bob: $USER2_ID"
echo ""
echo "To view full API documentation, see: API_DOCUMENTATION.md"
echo ""
print_success "All systems operational! 🌍♻️"
echo ""
