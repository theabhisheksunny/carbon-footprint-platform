# Carbon Footprint Awareness Platform - API Documentation

## Overview

This API allows users to track their carbon footprint, discover reduction actions, participate in challenges, and compare their progress with others.

**Base URL:** `http://localhost:3000/api`

**All responses follow this format:**
```json
{
  "success": true/false,
  "data": {},
  "message": "optional message",
  "error": "error message if success is false"
}
```

---

## 1. Users API

### Create User (Onboarding)
**POST** `/users`

Create a new user and calculate their baseline carbon footprint.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "location": "US",
  "profile": {
    "householdSize": 2,
    "carMilesPerYear": 10000,
    "carType": "gasoline",
    "electricityKwhPerMonth": 850,
    "heatingType": "naturalGas",
    "heatingUsage": "medium",
    "dietType": "average",
    "flightsPerYear": 3,
    "averageFlightDistance": 1200,
    "shoppingBudgetPerMonth": 400
  }
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "location": "US",
    "baselineFootprint": 12500,
    "regionalAverage": 16000,
    "totalCO2Reduced": 0,
    "createdAt": "2026-06-08T10:00:00Z"
  }
}
```

### Get User
**GET** `/users/:userId`

### Update User
**PUT** `/users/:userId`

### Get User Statistics
**GET** `/users/:userId/stats`

Returns comprehensive statistics including total activities, CO2 generated, CO2 reduced, and comparison to regional average.

### Get User Dashboard
**GET** `/users/:userId/dashboard`

Returns complete dashboard data including stats, recent activities, active actions, and personalized recommendations.

### Recalculate Baseline
**POST** `/users/:userId/recalculate-baseline`

Recalculate the user's baseline footprint based on updated profile.

### Delete User
**DELETE** `/users/:userId`

---

## 2. Activities API

Activities are individual carbon-generating events that users log (driving, flying, eating, etc.).

### Log Activity
**POST** `/activities`

**Request Body (Transportation Example):**
```json
{
  "userId": "user-id",
  "category": "transport",
  "type": "car",
  "subtype": "gasoline",
  "distance": 50,
  "description": "Commute to work",
  "timestamp": "2026-06-08T08:30:00Z"
}
```

**Request Body (Food Example):**
```json
{
  "userId": "user-id",
  "category": "food",
  "type": "meat",
  "subtype": "beef",
  "amount": 0.5,
  "unit": "kg",
  "description": "Dinner"
}
```

**Categories:**
- `transport`: car, publicTransit, flight, other
- `energy`: electricity, heating
- `food`: meat, seafood, dairy, plantBased, processed
- `shopping`: clothing, electronics, household, general
- `waste`: landfill, recycled, composted, foodWaste

**Response:**
```json
{
  "success": true,
  "activity": {
    "id": "activity-id",
    "userId": "user-id",
    "category": "transport",
    "type": "car",
    "subtype": "gasoline",
    "distance": 50,
    "co2Equivalent": 20.2,
    "timestamp": "2026-06-08T08:30:00Z"
  }
}
```

### Get User Activities
**GET** `/activities/user/:userId?startDate=2026-06-01&endDate=2026-06-30&category=transport&limit=10`

### Get Activity by ID
**GET** `/activities/:activityId`

### Update Activity
**PUT** `/activities/:activityId`

### Delete Activity
**DELETE** `/activities/:activityId`

### Get Activity Trends
**GET** `/activities/user/:userId/trends?days=30`

Returns activity analytics grouped by category and by day.

### Batch Log Activities
**POST** `/activities/batch`

Log multiple activities at once (useful for importing data).

**Request Body:**
```json
{
  "userId": "user-id",
  "activities": [
    {
      "category": "transport",
      "type": "car",
      "subtype": "gasoline",
      "distance": 25,
      "timestamp": "2026-06-07T08:00:00Z"
    },
    {
      "category": "food",
      "type": "meat",
      "subtype": "chicken",
      "amount": 0.3,
      "timestamp": "2026-06-07T12:00:00Z"
    }
  ]
}
```

---

## 3. Actions API

Actions are carbon reduction activities that users can start, track, and complete.

### Get All Actions
**GET** `/actions?category=energy&difficulty=easy&sortBy=co2Reduction`

**Query Parameters:**
- `category`: filter by category (energy, transport, food, etc.)
- `difficulty`: easy, medium, hard
- `sortBy`: co2Reduction, difficulty, savings

### Get Action by ID
**GET** `/actions/:actionId`

### Get Personalized Recommendations
**GET** `/actions/user/:userId/recommendations?limit=5`

Returns personalized action recommendations based on user's profile and highest emission categories.

### Start an Action
**POST** `/actions/user/:userId/start`

**Request Body:**
```json
{
  "actionId": "act-1",
  "targetDate": "2026-07-01",
  "notes": "Will replace all bulbs by end of month"
}
```

### Get User's Actions
**GET** `/actions/user/:userId/my-actions?status=active`

**Status options:** active, completed, abandoned

### Update User Action Progress
**PUT** `/actions/user/:userId/actions/:userActionId`

**Request Body:**
```json
{
  "progress": 50,
  "notes": "Replaced 5 out of 10 bulbs"
}
```

### Complete an Action
**POST** `/actions/user/:userId/actions/:userActionId/complete`

**Request Body:**
```json
{
  "notes": "All bulbs replaced!",
  "actualImpact": 200
}
```

### Abandon an Action
**POST** `/actions/user/:userId/actions/:userActionId/abandon`

### Delete User Action
**DELETE** `/actions/user/:userId/actions/:userActionId`

---

## 4. Social API

Social features including leaderboards, challenges, achievements, and comparisons.

### Get Leaderboard
**GET** `/social/leaderboard?limit=10&timeframe=allTime`

### Get Challenges
**GET** `/social/challenges?status=active`

**Status options:** active, upcoming, past

### Get Challenge by ID
**GET** `/social/challenges/:challengeId`

### Join Challenge
**POST** `/social/challenges/:challengeId/join`

**Request Body:**
```json
{
  "userId": "user-id"
}
```

### Get User's Challenges
**GET** `/social/user/:userId/challenges?status=active`

### Update Challenge Progress
**PUT** `/social/challenges/:challengeId/progress`

**Request Body:**
```json
{
  "userId": "user-id",
  "progress": 75,
  "notes": "3 weeks completed"
}
```

### Leave Challenge
**POST** `/social/challenges/:challengeId/leave`

### Get User Achievements
**GET** `/social/user/:userId/achievements`

Returns all achievements, both unlocked and locked, with criteria.

### Get User Comparison
**GET** `/social/user/:userId/comparison`

Compare user's performance with community averages and get percentile ranking.

---

## 5. Calculator API

Utilities for calculating emissions and comparing scenarios.

### Calculate Emissions
**POST** `/calculator/calculate`

Calculate CO2 emissions for a specific activity.

**Request Body:**
```json
{
  "category": "transport",
  "type": "car",
  "subtype": "gasoline",
  "distance": 100
}
```

**Response:**
```json
{
  "success": true,
  "calculation": {
    "category": "transport",
    "type": "car",
    "subtype": "gasoline",
    "amount": 100,
    "co2Equivalent": 40.4,
    "unit": "kg CO2e"
  }
}
```

### Calculate Baseline Footprint
**POST** `/calculator/baseline`

Calculate annual carbon footprint based on lifestyle profile.

**Request Body:**
```json
{
  "location": "US",
  "householdSize": 2,
  "carMilesPerYear": 12000,
  "carType": "gasoline",
  "electricityKwhPerMonth": 900,
  "heatingType": "naturalGas",
  "heatingUsage": "medium",
  "dietType": "average",
  "flightsPerYear": 2,
  "averageFlightDistance": 1500,
  "shoppingBudgetPerMonth": 500
}
```

### Get Emission Factors
**GET** `/calculator/factors?category=transport`

Get emission factors reference data.

### Get Regional Averages
**GET** `/calculator/regional-averages`

Get average annual CO2 emissions per person by region.

### Compare Scenarios
**POST** `/calculator/compare`

Compare CO2 emissions between two scenarios.

**Request Body:**
```json
{
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
}
```

### Get Impact Equivalents
**POST** `/calculator/equivalents`

Convert CO2 amount to relatable equivalents (trees planted, miles not driven, etc.).

**Request Body:**
```json
{
  "co2Amount": 1000
}
```

**Response:**
```json
{
  "success": true,
  "co2Amount": 1000,
  "unit": "kg CO2e",
  "equivalents": {
    "treesPlanted": {
      "value": "47.6",
      "description": "47.6 trees planted and grown for 1 year"
    },
    "milesNotDriven": {
      "value": "2475",
      "description": "2475 miles not driven in an average car"
    },
    "homeElectricityDays": {
      "value": "86.6",
      "description": "86.6 days of electricity in an average home"
    }
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (missing required fields, invalid data)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

---

## Data Models

### User Profile Options

**location:** US, Canada, UK, Germany, France, China, India, Brazil, Australia

**carType:** gasoline, diesel, hybrid, electric, suv

**heatingType:** naturalGas, heatingOil, propane, electric

**heatingUsage:** low, medium, high

**dietType:** vegan, vegetarian, average, high-meat

### Activity Categories

**transport:**
- car: gasoline, diesel, hybrid, electric, suv
- publicTransit: bus, train, subway, lightRail
- flight: domestic, international
- other: motorcycle, bike, walk, escooter

**energy:**
- electricity: usAverage, coal, naturalGas, renewable
- heating: naturalGas, heatingOil, propane, electric

**food:**
- meat: beef, lamb, pork, chicken, turkey
- seafood: fish, shrimp, salmon
- dairy: cheese, milk, eggs, yogurt, butter
- plantBased: vegetables, fruits, grains, legumes, nuts, tofu
- processed: bread, pasta, rice, sugar

**shopping:**
- clothing, electronics, household, general

**waste:**
- landfill, recycled, composted, foodWaste

---

## Example Workflows

### 1. User Onboarding & First Activity

```bash
# 1. Create user
POST /api/users
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "location": "US",
  "profile": { ... }
}
# Response: { "user": { "id": "user-123", ... } }

# 2. Log first activity
POST /api/activities
{
  "userId": "user-123",
  "category": "transport",
  "type": "car",
  "subtype": "gasoline",
  "distance": 30
}

# 3. Get dashboard
GET /api/users/user-123/dashboard
```

### 2. Starting a Reduction Action

```bash
# 1. Get recommendations
GET /api/actions/user/user-123/recommendations?limit=5

# 2. Start an action
POST /api/actions/user/user-123/start
{
  "actionId": "act-2",
  "notes": "Starting meatless Mondays and Wednesdays"
}

# 3. Update progress
PUT /api/actions/user/user-123/actions/ua-456
{
  "progress": 50,
  "notes": "2 weeks completed"
}

# 4. Complete action
POST /api/actions/user/user-123/actions/ua-456/complete
```

### 3. Joining a Challenge

```bash
# 1. Browse active challenges
GET /api/social/challenges?status=active

# 2. Join a challenge
POST /api/social/challenges/chal-1/join
{
  "userId": "user-123"
}

# 3. Update progress
PUT /api/social/challenges/chal-1/progress
{
  "userId": "user-123",
  "progress": 80
}
```

---

## Rate Limiting

Currently no rate limiting implemented (in-memory database).

For production, recommended limits:
- 100 requests per minute per IP
- 1000 requests per hour per user

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All CO2 values are in kilograms (kg CO2e)
- The database is in-memory, so all data is reset when the server restarts
- No authentication required in this version (add JWT for production)
