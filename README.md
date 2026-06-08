# 🌍 Carbon Footprint Awareness Platform

A comprehensive solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

## ✨ Features

### Core Functionality
- **📊 Carbon Footprint Calculator** - Calculate baseline footprint based on lifestyle
- **📝 Activity Tracking** - Log daily activities (transportation, energy, food, shopping)
- **💡 Personalized Insights** - Data-driven recommendations based on emission patterns
- **🎯 Action Library** - 12+ curated actions to reduce carbon footprint
- **📈 Trend Analysis** - Visualize emissions over time by category
- **🏆 Gamification** - Achievements, streaks, and progress tracking
- **👥 Social Features** - Leaderboards, community challenges, comparisons

### Technical Highlights
- **In-Memory Database** - No external database required
- **RESTful API** - Clean, well-documented endpoints
- **Real-time Calculations** - Based on EPA and IPCC emission factors
- **Comprehensive Tracking** - Transportation, energy, food, shopping, waste

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start the server
npm start

# For development (with auto-reload)
npm run dev
```

The server will start at `http://localhost:3000`

### Run Demo

```bash
# Run the interactive demo script
./demo.sh
```

The demo script will:
- Create sample users
- Log various activities
- Start and complete actions
- Calculate emissions and comparisons
- Show leaderboards and achievements

## 📚 API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

### Quick Examples

#### 1. Create a User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "location": "US",
    "profile": {
      "carMilesPerYear": 10000,
      "dietType": "average"
    }
  }'
```

#### 2. Log an Activity
```bash
curl -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id",
    "category": "transport",
    "type": "car",
    "subtype": "gasoline",
    "distance": 50
  }'
```

#### 3. Get Recommendations
```bash
curl http://localhost:3000/api/actions/user/{userId}/recommendations
```

## 📁 Project Structure

```
.
├── src/
│   ├── database/
│   │   ├── inMemoryDB.js          # In-memory database implementation
│   │   └── emissionFactors.js     # Emission factors & calculations
│   ├── routes/
│   │   ├── users.js               # User management endpoints
│   │   ├── activities.js          # Activity logging endpoints
│   │   ├── actions.js             # Reduction actions endpoints
│   │   ├── social.js              # Social features endpoints
│   │   └── calculator.js          # Calculation utilities endpoints
│   └── server.js                  # Express server setup
├── package.json
├── demo.sh                        # Interactive demo script
├── API_DOCUMENTATION.md           # Complete API reference
└── README.md
```

## 🎯 Key Endpoints

### Users
- `POST /api/users` - Create user
- `GET /api/users/:userId/dashboard` - Get dashboard
- `GET /api/users/:userId/stats` - Get statistics

### Activities
- `POST /api/activities` - Log activity
- `GET /api/activities/user/:userId` - Get user activities
- `GET /api/activities/user/:userId/trends` - Get trends

### Actions
- `GET /api/actions` - Browse actions
- `POST /api/actions/user/:userId/start` - Start action
- `POST /api/actions/user/:userId/actions/:id/complete` - Complete action

### Social
- `GET /api/social/leaderboard` - Get leaderboard
- `GET /api/social/challenges` - Get challenges
- `GET /api/social/user/:userId/achievements` - Get achievements

### Calculator
- `POST /api/calculator/calculate` - Calculate emissions
- `POST /api/calculator/compare` - Compare scenarios
- `POST /api/calculator/equivalents` - Get equivalents

## 📊 Data Models

### Emission Categories

**Transportation**
- Car (gasoline, diesel, hybrid, electric, SUV)
- Public Transit (bus, train, subway, light rail)
- Flights (domestic, international)
- Other (bike, walk, motorcycle, e-scooter)

**Energy**
- Electricity (by grid source)
- Heating (natural gas, oil, propane, electric)

**Food**
- Meat (beef, pork, chicken, lamb, turkey)
- Seafood (fish, shrimp, salmon)
- Dairy (cheese, milk, eggs, yogurt)
- Plant-based (vegetables, fruits, grains, legumes)

**Shopping**
- Clothing, electronics, household goods

**Waste**
- Landfill, recycled, composted, food waste

## 🧮 Emission Factors

All emission factors are based on:
- **EPA** (Environmental Protection Agency)
- **IPCC** (Intergovernmental Panel on Climate Change)
- **Scientific studies** on lifecycle emissions

### Example Factors (kg CO2e)
- Gasoline car: 0.404 per mile
- Bus: 0.089 per mile per passenger
- Beef: 27.0 per kg
- Chicken: 6.9 per kg
- Vegetables: 0.4 per kg
- Electricity (US avg): 0.385 per kWh

## 🎮 Gamification Features

### Achievements
- 🌱 Getting Started - Start first action
- ⭐ Action Hero - Complete first action
- 🏆 Climate Champion - Complete 5 actions
- 🦸 Eco Warrior - Complete 10 actions
- 💪 Ton Reducer - Reduce 1000 kg CO2
- 🔥 7 Day Streak - Log activities for 7 days
- 🎯 30 Day Streak - Log activities for 30 days

### Challenges
- Meatless May - Go vegetarian for a month
- Zero Car Week - No driving for a week
- Energy Saver Sprint - Reduce energy 20%

### Leaderboard
- Ranks users by total CO2 reduced
- Community comparisons
- Percentile rankings

## 🌟 Action Library

The platform includes 12 pre-seeded actions:

**Easy Actions**
- Switch to LED bulbs (180 kg CO2/year)
- Reduce meat consumption (300 kg CO2/year)
- Bike or walk for short trips (400 kg CO2/year)
- Reduce food waste (250 kg CO2/year)
- Air dry laundry (200 kg CO2/year)

**Medium Actions**
- Use public transportation (500 kg CO2/year)
- Install programmable thermostat (450 kg CO2/year)
- Carpool to work (600 kg CO2/year)

**Hard Actions**
- Install solar panels (3000 kg CO2/year)

## 🔧 Configuration

### Environment Variables
```bash
PORT=3000  # Server port (default: 3000)
```

### Database
The platform uses an in-memory database that resets on server restart. This is perfect for:
- Development and testing
- Demos and presentations
- Quick prototyping

For production, you would migrate to:
- PostgreSQL for persistent storage
- Redis for caching
- MongoDB for flexible schemas

## 🧪 Testing

```bash
# Run the demo script to test all features
./demo.sh

# Manual testing with curl
curl http://localhost:3000/health
```

## 📈 Sample User Journey

1. **Onboarding** - User creates account, completes profile questionnaire
2. **Baseline** - System calculates annual carbon footprint (e.g., 12,500 kg)
3. **Tracking** - User logs daily activities (driving, meals, energy usage)
4. **Insights** - Platform shows highest emission categories
5. **Actions** - User browses recommended actions, starts "Reduce meat consumption"
6. **Progress** - User tracks progress over weeks, updates completion percentage
7. **Achievement** - User completes action, reduces 300 kg CO2, unlocks "Action Hero"
8. **Social** - User joins "Meatless May" challenge, climbs leaderboard
9. **Comparison** - User sees they're in top 30% of community

## 🎯 Future Enhancements

### Phase 2 (Suggested Additions)
- Mobile apps (React Native)
- Smart home integrations (Nest, Ecobee)
- Financial app integrations (Plaid for purchase tracking)
- Machine learning recommendations
- Social sharing (post achievements to social media)
- Team/corporate accounts

### Phase 3
- Carbon offset marketplace
- API for third-party developers
- Predictive analytics
- Community forums
- Educational content library

## 🤝 Contributing

This is a demonstration project. To extend it:

1. Add new emission factors to `emissionFactors.js`
2. Create new actions in the seed data
3. Add new API endpoints in `routes/`
4. Implement frontend (React, Vue, or Angular)

## 📝 Notes

### Accuracy
- Emission factors are based on scientific sources
- Calculations use lifecycle emissions (including production)
- Regional variations are approximated
- Individual results may vary based on specific circumstances

### Privacy
- No sensitive data collection in demo version
- For production: encrypt personal data, anonymize analytics
- GDPR compliance needed for EU users

### Assumptions
- Average US grid electricity mix
- Standard vehicle efficiency
- Typical household sizes
- General shopping categories

## 📄 License

MIT License - feel free to use and modify for your projects.

## 🙏 Acknowledgments

Emission factors sourced from:
- EPA (Environmental Protection Agency)
- IPCC (Intergovernmental Panel on Climate Change)
- Various peer-reviewed studies on carbon footprints

## 📞 Support

For questions or issues:
- Check API_DOCUMENTATION.md for endpoint details
- Run demo.sh to see example usage
- Review code comments for implementation details

---

**Built with ❤️ for a sustainable future 🌱**
