import { v4 as uuidv4 } from 'uuid';

/**
 * In-Memory Database
 * Simulates a real database with collections and CRUD operations
 */
class InMemoryDatabase {
  constructor() {
    this.users = new Map();
    this.activities = new Map();
    this.actions = new Map();
    this.userActions = new Map();
    this.achievements = new Map();
    this.challenges = new Map();
    this.routines = new Map();
    this.offsets = new Map();
    this.userOffsets = new Map();

    // Initialize with seed data
    this.seedData();
  }

  // Award XP and EcoPoints, calculate level progress, and unlock level badges
  awardXpAndPoints(userId, xp, points) {
    const user = this.users.get(userId);
    if (!user) return null;

    const currentXp = (user.xp || 0) + xp;
    const currentPoints = (user.ecoPoints || 0) + points;

    // Progress Level formula: Level = Math.floor(Math.sqrt(currentXp / 100)) + 1
    const newLevel = Math.floor(Math.sqrt(currentXp / 100)) + 1;
    const oldLevel = user.level || 1;

    const updates = {
      xp: currentXp,
      ecoPoints: currentPoints,
      level: newLevel
    };

    if (newLevel > oldLevel) {
      const achievements = [...(user.achievements || [])];
      const levelBadge = `level-${newLevel}`;
      if (!achievements.includes(levelBadge)) {
        achievements.push(levelBadge);
        updates.achievements = achievements;
      }
    }

    // Direct update to users map
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Generic CRUD operations
  create(collection, data) {
    const id = data.id || uuidv4();
    const item = { ...data, id, createdAt: new Date().toISOString() };
    this[collection].set(id, item);

    // Auto-update user streak if activity is logged
    if (collection === 'activities' && data.userId) {
      this.updateUserStreakProperty(data.userId);
      // Log gives 20 XP and 10 EcoPoints
      this.awardXpAndPoints(data.userId, 20, 10);
    }

    // Initialize XP / EcoPoints / Level for users
    if (collection === 'users') {
      if (item.xp === undefined) item.xp = 0;
      if (item.ecoPoints === undefined) item.ecoPoints = 100; // Welcome bonus
      if (item.level === undefined) item.level = 1;
      this.users.set(id, item);
    }

    return item;
  }

  findById(collection, id) {
    return this[collection].get(id);
  }

  findAll(collection) {
    return Array.from(this[collection].values());
  }

  findByQuery(collection, query) {
    const items = Array.from(this[collection].values());
    return items.filter(item => {
      return Object.keys(query).every(key => {
        if (typeof query[key] === 'function') {
          return query[key](item[key]);
        }
        return item[key] === query[key];
      });
    });
  }

  update(collection, id, data) {
    const existing = this[collection].get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString()
    };
    this[collection].set(id, updated);

    // Auto-update user streak if activity is updated
    if (collection === 'activities' && existing.userId) {
      this.updateUserStreakProperty(existing.userId);
    }

    return updated;
  }

  delete(collection, id) {
    const existing = this[collection].get(id);
    const result = this[collection].delete(id);

    // Auto-update user streak if activity is deleted
    if (result && collection === 'activities' && existing && existing.userId) {
      this.updateUserStreakProperty(existing.userId);
    }

    return result;
  }

  updateUserStreakProperty(userId) {
    const user = this.findById('users', userId);
    if (user) {
      const streak = this.calculateUserStreak(userId).current;
      // We directly update user object to avoid infinite loop checks
      const updatedUser = {
        ...user,
        streak,
        updatedAt: new Date().toISOString()
      };
      this.users.set(userId, updatedUser);
    }
  }

  // Seed initial data
  seedData() {
    // Seed Actions Library
    const actionsData = [
      {
        id: 'act-1',
        title: 'Switch to LED bulbs',
        description: 'Replace incandescent bulbs with energy-efficient LED bulbs throughout your home',
        category: 'energy',
        difficulty: 'easy',
        estimatedCO2Reduction: 180, // kg per year
        costImplication: 'saves',
        estimatedCostSaving: 75, // dollars per year
        instructions: [
          'Identify all incandescent bulbs in your home',
          'Purchase LED equivalents (check wattage)',
          'Replace bulbs one by one',
          'Dispose of old bulbs properly'
        ],
        trackingMethod: 'manual'
      },
      {
        id: 'act-2',
        title: 'Reduce meat consumption',
        description: 'Go meatless 2-3 days per week to reduce your dietary carbon footprint',
        category: 'food',
        difficulty: 'easy',
        estimatedCO2Reduction: 300,
        costImplication: 'saves',
        estimatedCostSaving: 50,
        instructions: [
          'Choose 2-3 days per week for meatless meals',
          'Explore plant-based protein sources',
          'Try new vegetarian recipes',
          'Track your meatless days'
        ],
        trackingMethod: 'manual'
      },
      {
        id: 'act-3',
        title: 'Use public transportation',
        description: 'Replace car trips with public transit at least once a week',
        category: 'transport',
        difficulty: 'medium',
        estimatedCO2Reduction: 500,
        costImplication: 'saves',
        estimatedCostSaving: 120,
        instructions: [
          'Research public transit routes near you',
          'Get a transit pass or mobile app',
          'Plan your trip in advance',
          'Track your transit usage'
        ],
        trackingMethod: 'manual'
      },
      {
        id: 'act-4',
        title: 'Install a programmable thermostat',
        description: 'Optimize heating and cooling with automatic temperature control',
        category: 'energy',
        difficulty: 'medium',
        estimatedCO2Reduction: 450,
        costImplication: 'costs',
        estimatedCostSaving: 180,
        upfrontCost: 150,
        instructions: [
          'Purchase a smart/programmable thermostat',
          'Install or hire an electrician',
          'Program energy-saving schedules',
          'Monitor energy usage through the app'
        ],
        trackingMethod: 'automatic'
      },
      {
        id: 'act-5',
        title: 'Bike or walk for short trips',
        description: 'Replace car trips under 2 miles with biking or walking',
        category: 'transport',
        difficulty: 'easy',
        estimatedCO2Reduction: 400,
        costImplication: 'saves',
        estimatedCostSaving: 200,
        instructions: [
          'Identify regular short trips (< 2 miles)',
          'Plan safe walking/biking routes',
          'Ensure you have proper gear',
          'Track trips using a fitness app'
        ],
        trackingMethod: 'manual'
      },
      {
        id: 'act-6',
        title: 'Reduce food waste',
        description: 'Plan meals and properly store food to minimize waste',
        category: 'food',
        difficulty: 'easy',
        estimatedCO2Reduction: 250,
        costImplication: 'saves',
        estimatedCostSaving: 370,
        instructions: [
          'Meal plan for the week',
          'Make a shopping list and stick to it',
          'Learn proper food storage techniques',
          'Compost food scraps if possible'
        ],
        trackingMethod: 'manual'
      },
      {
        id: 'act-7',
        title: 'Install solar panels',
        description: 'Generate clean energy for your home with solar panels',
        category: 'energy',
        difficulty: 'hard',
        estimatedCO2Reduction: 3000,
        costImplication: 'costs',
        estimatedCostSaving: 1200,
        upfrontCost: 15000,
        instructions: [
          'Get home energy audit',
          'Research solar installers and incentives',
          'Get multiple quotes',
          'Schedule installation',
          'Monitor production with app'
        ],
        trackingMethod: 'automatic'
      },
      {
        id: 'act-8',
        title: 'Air dry laundry',
        description: 'Use a drying rack or clothesline instead of electric dryer',
        category: 'energy',
        difficulty: 'easy',
        estimatedCO2Reduction: 200,
        costImplication: 'saves',
        estimatedCostSaving: 100,
        instructions: [
          'Purchase a drying rack or install clothesline',
          'Plan extra drying time into laundry routine',
          'Air dry at least 50% of loads',
          'Use dryer only for towels/heavy items'
        ],
        trackingMethod: 'manual'
      },
      {
        id: 'act-9',
        title: 'Buy local and seasonal produce',
        description: 'Choose locally grown, seasonal fruits and vegetables',
        category: 'food',
        difficulty: 'easy',
        estimatedCO2Reduction: 150,
        costImplication: 'neutral',
        instructions: [
          'Find local farmers markets',
          'Learn what\'s in season in your area',
          'Join a CSA (Community Supported Agriculture)',
          'Track local purchases'
        ],
        trackingMethod: 'manual'
      },
      {
        id: 'act-10',
        title: 'Switch to renewable energy plan',
        description: 'Choose a 100% renewable energy plan from your utility',
        category: 'energy',
        difficulty: 'easy',
        estimatedCO2Reduction: 2500,
        costImplication: 'neutral',
        additionalCost: 10,
        instructions: [
          'Check if your utility offers green energy',
          'Compare renewable energy plans',
          'Sign up online or by phone',
          'Verify on your next bill'
        ],
        trackingMethod: 'automatic'
      },
      {
        id: 'act-11',
        title: 'Carpool to work',
        description: 'Share rides with coworkers to reduce commute emissions',
        category: 'transport',
        difficulty: 'medium',
        estimatedCO2Reduction: 600,
        costImplication: 'saves',
        estimatedCostSaving: 400,
        instructions: [
          'Find coworkers with similar routes',
          'Set up a carpool schedule',
          'Use a carpool app for coordination',
          'Rotate drivers weekly'
        ],
        trackingMethod: 'manual'
      },
      {
        id: 'act-12',
        title: 'Unplug vampire electronics',
        description: 'Eliminate standby power consumption from electronics',
        category: 'energy',
        difficulty: 'easy',
        estimatedCO2Reduction: 100,
        costImplication: 'saves',
        estimatedCostSaving: 50,
        instructions: [
          'Identify devices that draw standby power',
          'Use power strips for easy on/off',
          'Unplug chargers when not in use',
          'Consider smart plugs for automation'
        ],
        trackingMethod: 'manual'
      }
    ];

    actionsData.forEach(action => {
      this.actions.set(action.id, { ...action, createdAt: new Date().toISOString() });
    });

    // Seed Challenges
    const challengesData = [
      {
        id: 'chal-1',
        title: 'Meatless May',
        description: 'Go vegetarian for the entire month of May',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        participants: 0,
        category: 'food',
        difficulty: 'medium',
        estimatedCO2Reduction: 450
      },
      {
        id: 'chal-2',
        title: 'Zero Car Week',
        description: 'One week without driving your personal vehicle',
        startDate: '2026-06-15',
        endDate: '2026-06-21',
        participants: 0,
        category: 'transport',
        difficulty: 'hard',
        estimatedCO2Reduction: 150
      },
      {
        id: 'chal-3',
        title: 'Energy Saver Sprint',
        description: 'Reduce home energy usage by 20% this month',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        participants: 0,
        category: 'energy',
        difficulty: 'medium',
        estimatedCO2Reduction: 200
      }
    ];

    challengesData.forEach(challenge => {
      this.challenges.set(challenge.id, { ...challenge, createdAt: new Date().toISOString() });
    });

    // Seed Offsets Data
    const offsetsData = [
      { id: 'off-1', title: 'Amazon Rainforest Protection', description: 'Protects threatened forestry in the Brazilian Amazon basin.', cost: 300, offsetAmount: 200, category: 'forestry', icon: 'fa-tree' },
      { id: 'off-2', title: 'Wind Farms in West Texas', description: 'Supports displacement of coal-fired electricity with wind turbine grids.', cost: 600, offsetAmount: 500, category: 'energy', icon: 'fa-wind' },
      { id: 'off-3', title: 'Cookstoves for Kenyan Communities', description: 'Replaces open-fire cooking with clean, efficient bio-burners.', cost: 1000, offsetAmount: 1000, category: 'community', icon: 'fa-fire-burner' },
      { id: 'off-4', title: 'Marine Kelp Cultivation', description: 'Supports ocean reforestation to capture deep-sea carbon.', cost: 1800, offsetAmount: 2000, category: 'ocean', icon: 'fa-water' }
    ];

    offsetsData.forEach(offset => {
      this.offsets.set(offset.id, { ...offset, createdAt: new Date().toISOString() });
    });
  }

  // Utility methods for complex queries
  getUserActivities(userId, options = {}) {
    const { startDate, endDate, category } = options;
    let activities = this.findByQuery('activities', { userId });

    if (startDate) {
      activities = activities.filter(a => new Date(a.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      activities = activities.filter(a => new Date(a.timestamp) <= new Date(endDate));
    }
    if (category) {
      activities = activities.filter(a => a.category === category);
    }

    return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getUserActions(userId) {
    return this.findByQuery('userActions', { userId });
  }

  getLeaderboard(limit = 10) {
    const users = this.findAll('users');
    return users
      .map(user => ({
        id: user.id,
        name: user.name,
        totalReduction: user.totalCO2Reduced || 0,
        activeActions: this.findByQuery('userActions', {
          userId: user.id,
          status: 'active'
        }).length
      }))
      .sort((a, b) => b.totalReduction - a.totalReduction)
      .slice(0, limit);
  }

  calculateUserStreak(userId) {
    const activities = this.getUserActivities(userId);
    if (activities.length === 0) return { current: 0, longest: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group activities by date
    const activityDates = new Set();
    activities.forEach(act => {
      const date = new Date(act.timestamp);
      date.setHours(0, 0, 0, 0);
      activityDates.add(date.getTime());
    });

    const sortedDates = Array.from(activityDates).sort((a, b) => b - a);

    let currentStreak = 0;
    if (sortedDates.length > 0) {
      const latestDate = new Date(sortedDates[0]);
      const diffFromToday = Math.round((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffFromToday <= 1) { // 0 if logged today, 1 if logged yesterday
        currentStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const diff = Math.round((sortedDates[i - 1] - sortedDates[i]) / (1000 * 60 * 60 * 24));
          if (diff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = Math.round((sortedDates[i - 1] - sortedDates[i]) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    if (sortedDates.length === 1) {
      longestStreak = 1;
    }

    return { current: currentStreak, longest: longestStreak };
  }

  calculateUserStats(userId) {
    const activities = this.getUserActivities(userId);
    const userActions = this.getUserActions(userId);
    const user = this.findById('users', userId);

    const totalCO2 = activities.reduce((sum, act) => sum + (act.co2Equivalent || 0), 0);
    const totalReduced = user ? (user.totalCO2Reduced || 0) : 0;

    const last30Days = activities.filter(a => {
      const daysDiff = (Date.now() - new Date(a.timestamp)) / (1000 * 60 * 60 * 24);
      return daysDiff >= 0 && daysDiff <= 30;
    });

    const co2Last30Days = last30Days.reduce((sum, act) => sum + (act.co2Equivalent || 0), 0);

    return {
      totalActivities: activities.length,
      totalCO2Generated: totalCO2,
      totalCO2Reduced: totalReduced,
      netCO2: totalCO2 - totalReduced,
      activeActions: userActions.filter(ua => ua.status === 'active').length,
      completedActions: userActions.filter(ua => ua.status === 'completed').length,
      last30DaysCO2: co2Last30Days,
      baselineFootprint: user?.baselineFootprint || 0
    };
  }

  // Clear all data (useful for testing)
  clearAll() {
    this.users.clear();
    this.activities.clear();
    this.actions.clear();
    this.userActions.clear();
    this.achievements.clear();
    this.challenges.clear();
    this.routines.clear();
    this.offsets.clear();
    this.userOffsets.clear();
    this.seedData();
  }
}

// Export singleton instance
export const db = new InMemoryDatabase();
export default db;
