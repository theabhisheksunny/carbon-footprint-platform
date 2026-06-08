import express from 'express';
import db from '../database/inMemoryDB.js';
import { calculators, regionalAverages } from '../database/emissionFactors.js';

const router = express.Router();

// Create new user (onboarding)
router.post('/', (req, res) => {
  try {
    const {
      name,
      email,
      location,
      profile
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if user already exists
    const existingUser = db.findByQuery('users', { email });
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Calculate baseline footprint
    const baselineFootprint = calculators.calculateBaselineFootprint(profile || {});
    const regionalAverage = regionalAverages[location] || regionalAverages['World'];

    const user = db.create('users', {
      name,
      email,
      location: location || 'US',
      profile: profile || {},
      baselineFootprint,
      regionalAverage,
      totalCO2Reduced: 0,
      streak: 0,
      achievements: [],
      onboardingCompleted: true
    });

    res.status(201).json({
      success: true,
      user,
      message: 'User created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.findById('users', userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const user = db.update('users', userId, updates);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user,
      message: 'User updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recalculate baseline footprint
router.post('/:userId/recalculate-baseline', (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.findById('users', userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const baselineFootprint = calculators.calculateBaselineFootprint(user.profile);
    const updatedUser = db.update('users', userId, { baselineFootprint });

    res.json({
      success: true,
      baselineFootprint,
      user: updatedUser,
      message: 'Baseline footprint recalculated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user statistics
router.get('/:userId/stats', (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.findById('users', userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = db.calculateUserStats(userId);

    // Calculate comparison to regional average
    const monthlyAverage = user.regionalAverage / 12;
    const percentageDiff = ((stats.last30DaysCO2 - monthlyAverage) / monthlyAverage * 100).toFixed(1);

    res.json({
      success: true,
      stats: {
        ...stats,
        regionalAverage: user.regionalAverage,
        monthlyRegionalAverage: Math.round(monthlyAverage),
        comparisonToAverage: `${percentageDiff > 0 ? '+' : ''}${percentageDiff}%`,
        isAboveAverage: stats.last30DaysCO2 > monthlyAverage
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user dashboard data
router.get('/:userId/dashboard', (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.findById('users', userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = db.calculateUserStats(userId);
    const recentActivities = db.getUserActivities(userId, {}).slice(0, 10);
    const activeActions = db.findByQuery('userActions', {
      userId,
      status: 'active'
    });

    // Get recommendations
    const allActions = db.findAll('actions');
    const userActionIds = new Set(db.getUserActions(userId).map(ua => ua.actionId));
    const availableActions = allActions
      .filter(action => !userActionIds.has(action.id))
      .sort((a, b) => b.estimatedCO2Reduction - a.estimatedCO2Reduction)
      .slice(0, 5);

    res.json({
      success: true,
      dashboard: {
        user: {
          name: user.name,
          location: user.location,
          streak: user.streak,
          achievements: user.achievements
        },
        stats,
        recentActivities,
        activeActions: activeActions.map(ua => {
          const action = db.findById('actions', ua.actionId);
          return {
            ...ua,
            actionDetails: action
          };
        }),
        recommendations: availableActions
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
router.delete('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const deleted = db.delete('users', userId);

    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clean up user's activities and actions
    const activities = db.findByQuery('activities', { userId });
    activities.forEach(a => db.delete('activities', a.id));

    const userActions = db.findByQuery('userActions', { userId });
    userActions.forEach(ua => db.delete('userActions', ua.id));

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
