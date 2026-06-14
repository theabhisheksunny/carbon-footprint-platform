import express from 'express';
import crypto from 'crypto';
import db from '../database/inMemoryDB.js';
import { calculators, regionalAverages } from '../database/emissionFactors.js';
import { validateEmail, validateEmailDetailed, validateUserProfile } from '../utils/validation.js';
import { authenticateUser } from '../utils/auth.js';

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

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Valid name is required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailVal = validateEmailDetailed(email);
    if (!emailVal.valid) {
      return res.status(400).json({ error: emailVal.error });
    }

    // Validate location
    const validLocations = ['US', 'Canada', 'UK', 'Germany', 'France', 'China', 'India', 'Brazil', 'Australia', 'World'];
    if (location && !validLocations.includes(location)) {
      return res.status(400).json({ error: 'Unsupported location/region' });
    }

    // Validate profile
    if (profile) {
      const profileVal = validateUserProfile(profile);
      if (!profileVal.valid) {
        return res.status(400).json({ error: profileVal.error });
      }
    }

    // Check if user already exists
    const existingUser = db.findByQuery('users', { email });
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const allUsers = db.findAll('users');
    const nameLower = name.trim().toLowerCase();
    const nameExists = allUsers.some(u => u.name.trim().toLowerCase() === nameLower);
    if (nameExists) {
      return res.status(409).json({ error: 'User with this name already exists. Please choose a unique name.' });
    }

    // Calculate baseline footprint
    const baselineFootprint = calculators.calculateBaselineFootprint(profile || {});
    const regionalAverage = regionalAverages[location] || regionalAverages['World'];

    const token = crypto.randomUUID();

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
      onboardingCompleted: true,
      token
    });

    res.status(201).json({
      success: true,
      user,
      token,
      message: 'User created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login user (retrieve existing profile and token)
router.post('/login', (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const allUsers = db.findAll('users');
    const user = allUsers.find(u => u.email.trim().toLowerCase() === trimmedEmail);

    if (!user) {
      return res.status(404).json({ error: 'No profile found with this email. Please onboard first.' });
    }

    res.json({
      success: true,
      user,
      token: user.token,
      message: 'Login successful'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:userId', authenticateUser, (req, res) => {
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
router.put('/:userId', authenticateUser, (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate email if it's updated
    if (updates.email !== undefined) {
      const emailVal = validateEmailDetailed(updates.email);
      if (!emailVal.valid) {
        return res.status(400).json({ error: emailVal.error });
      }
      const existingUser = db.findByQuery('users', { email: updates.email });
      if (existingUser.length > 0 && existingUser[0].id !== userId) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }
    }

    // Validate profile if it's updated and recalculate baseline
    if (updates.profile !== undefined) {
      const profileVal = validateUserProfile(updates.profile);
      if (!profileVal.valid) {
        return res.status(400).json({ error: profileVal.error });
      }
      const mergedProfile = { ...user.profile, ...updates.profile };
      updates.profile = mergedProfile;
      updates.baselineFootprint = calculators.calculateBaselineFootprint(mergedProfile);
    }

    // Validate name if it's updated
    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || updates.name.trim() === '') {
        return res.status(400).json({ error: 'Valid name is required' });
      }
      const allUsers = db.findAll('users');
      const nameLower = updates.name.trim().toLowerCase();
      const nameExists = allUsers.some(u => u.name.trim().toLowerCase() === nameLower && u.id !== userId);
      if (nameExists) {
        return res.status(409).json({ error: 'User with this name already exists. Please choose a unique name.' });
      }
    }

    // Validate location if it's updated
    if (updates.location !== undefined) {
      const validLocations = ['US', 'Canada', 'UK', 'Germany', 'France', 'China', 'India', 'Brazil', 'Australia', 'World'];
      if (!validLocations.includes(updates.location)) {
        return res.status(400).json({ error: 'Unsupported location/region' });
      }
      updates.regionalAverage = regionalAverages[updates.location];
    }

    const updatedUser = db.update('users', userId, updates);

    res.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recalculate baseline footprint
router.post('/:userId/recalculate-baseline', authenticateUser, (req, res) => {
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
router.get('/:userId/stats', authenticateUser, (req, res) => {
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
router.get('/:userId/dashboard', authenticateUser, (req, res) => {
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
          let action = db.findById('actions', ua.actionId);
          if (!action) {
            action = db.findById('challenges', ua.actionId);
          }
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
router.delete('/:userId', authenticateUser, (req, res) => {
  try {
    const { userId } = req.params;
    const deleted = db.delete('users', userId);

    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clean up user's activities, actions, routines, and offsets
    const activities = db.findByQuery('activities', { userId });
    activities.forEach(a => db.delete('activities', a.id));

    const userActions = db.findByQuery('userActions', { userId });
    userActions.forEach(ua => db.delete('userActions', ua.id));

    const routines = db.findByQuery('routines', { userId });
    routines.forEach(r => db.delete('routines', r.id));

    const userOffsets = db.findByQuery('userOffsets', { userId });
    userOffsets.forEach(uo => db.delete('userOffsets', uo.id));

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
