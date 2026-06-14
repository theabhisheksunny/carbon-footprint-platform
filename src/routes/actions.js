import express from 'express';
import db from '../database/inMemoryDB.js';
import { authenticateUser } from '../utils/auth.js';

const router = express.Router();

router.use('/user/:userId', authenticateUser);

// Get all available actions
router.get('/', (req, res) => {
  try {
    const { category, difficulty, sortBy = 'co2Reduction' } = req.query;

    let actions = db.findAll('actions');

    // Filter by category
    if (category) {
      actions = actions.filter(a => a.category === category);
    }

    // Filter by difficulty
    if (difficulty) {
      actions = actions.filter(a => a.difficulty === difficulty);
    }

    // Sort
    switch (sortBy) {
      case 'co2Reduction':
        actions.sort((a, b) => b.estimatedCO2Reduction - a.estimatedCO2Reduction);
        break;
      case 'difficulty':
        const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
        actions.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
        break;
      case 'savings':
        actions.sort((a, b) => (b.estimatedCostSaving || 0) - (a.estimatedCostSaving || 0));
        break;
      default:
        break;
    }

    res.json({
      success: true,
      count: actions.length,
      actions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get action by ID
router.get('/:actionId', (req, res) => {
  try {
    const { actionId } = req.params;
    const action = db.findById('actions', actionId);

    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    res.json({ success: true, action });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get personalized action recommendations for user
router.get('/user/:userId/recommendations', (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 5 } = req.query;

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's current actions
    const userActions = db.getUserActions(userId);
    const userActionIds = new Set(userActions.map(ua => ua.actionId));

    // Get all available actions
    let availableActions = db.findAll('actions')
      .filter(action => !userActionIds.has(action.id));

    // Score actions based on user's profile and activities
    const userActivities = db.getUserActivities(userId, {});
    const categoryEmissions = {};

    userActivities.forEach(act => {
      categoryEmissions[act.category] = (categoryEmissions[act.category] || 0) + (act.co2Equivalent || 0);
    });

    // Prioritize actions in categories with highest emissions
    availableActions = availableActions.map(action => {
      const categoryPriority = categoryEmissions[action.category] || 0;
      const impactScore = action.estimatedCO2Reduction;
      const difficultyPenalty = { easy: 0, medium: 0.8, hard: 0.5 }[action.difficulty] || 1;

      return {
        ...action,
        recommendationScore: (impactScore * difficultyPenalty) + (categoryPriority * 0.1)
      };
    });

    // Sort by recommendation score
    availableActions.sort((a, b) => b.recommendationScore - a.recommendationScore);

    const recommendations = availableActions.slice(0, parseInt(limit));

    res.json({
      success: true,
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User starts an action
router.post('/user/:userId/start', (req, res) => {
  try {
    const { userId } = req.params;
    const { actionId, targetDate, notes } = req.body;

    if (!actionId) {
      return res.status(400).json({ error: 'actionId is required' });
    }

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const action = db.findById('actions', actionId);
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    // Check if user already has this action
    const existingUserAction = db.findByQuery('userActions', { userId, actionId });
    if (existingUserAction.length > 0) {
      return res.status(409).json({ error: 'User has already started this action' });
    }

    const userAction = db.create('userActions', {
      userId,
      actionId,
      status: 'active',
      startDate: new Date().toISOString(),
      targetDate: targetDate || null,
      notes: notes || '',
      progress: 0,
      measuredImpact: 0
    });

    res.status(201).json({
      success: true,
      userAction,
      actionDetails: action,
      message: 'Action started successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's actions
router.get('/user/:userId/my-actions', (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let userActions = db.getUserActions(userId);

    if (status) {
      userActions = userActions.filter(ua => ua.status === status);
    }

    // Enrich with action details
    const enrichedActions = userActions.map(ua => {
      const action = db.findById('actions', ua.actionId);
      return {
        ...ua,
        actionDetails: action
      };
    });

    res.json({
      success: true,
      count: enrichedActions.length,
      userActions: enrichedActions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user action (progress, status, etc.)
router.put('/user/:userId/actions/:userActionId', (req, res) => {
  try {
    const { userId, userActionId } = req.params;
    const updates = req.body;

    // Validate progress updates
    if (updates.progress !== undefined) {
      if (typeof updates.progress !== 'number' || isNaN(updates.progress) || updates.progress < 0 || updates.progress > 100) {
        return res.status(400).json({ error: 'progress must be a number between 0 and 100' });
      }
    }

    // Validate status updates
    if (updates.status !== undefined) {
      const validStatuses = ['active', 'completed', 'abandoned'];
      if (!validStatuses.includes(updates.status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      }
    }

    const userAction = db.findById('userActions', userActionId);
    if (!userAction) {
      return res.status(404).json({ error: 'User action not found' });
    }

    if (userAction.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // If progress reaches 100%, transition status to completed
    if (updates.progress === 100 && userAction.status !== 'completed') {
      updates.status = 'completed';
    }

    // If completing action, calculate impact
    if (updates.status === 'completed' && userAction.status !== 'completed') {
      let action = db.findById('actions', userAction.actionId);
      if (!action) {
        action = db.findById('challenges', userAction.actionId);
      }
      const user = db.findById('users', userId);

      if (action && user) {
        // Update user's total CO2 reduced
        const newTotal = (user.totalCO2Reduced || 0) + (action.estimatedCO2Reduction || 0);
        db.update('users', userId, { totalCO2Reduced: newTotal });

        updates.completedDate = new Date().toISOString();
        updates.measuredImpact = action.estimatedCO2Reduction || 0;
      }
    }

    const updatedUserAction = db.update('userActions', userActionId, updates);

    res.json({
      success: true,
      userAction: updatedUserAction,
      message: 'Action updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete an action
router.post('/user/:userId/actions/:userActionId/complete', (req, res) => {
  try {
    const { userId, userActionId } = req.params;
    const { notes, actualImpact } = req.body;

    // Validate actualImpact
    if (actualImpact !== undefined) {
      if (typeof actualImpact !== 'number' || isNaN(actualImpact) || actualImpact < 0) {
        return res.status(400).json({ error: 'actualImpact must be a non-negative number' });
      }
    }

    const userAction = db.findById('userActions', userActionId);
    if (!userAction) {
      return res.status(404).json({ error: 'User action not found' });
    }

    if (userAction.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let action = db.findById('actions', userAction.actionId);
    if (!action) {
      action = db.findById('challenges', userAction.actionId);
    }
    const user = db.findById('users', userId);

    if (!action || !user) {
      return res.status(404).json({ error: 'Action or user not found' });
    }

    // Calculate impact
    const measuredImpact = actualImpact || action.estimatedCO2Reduction || 0;

    // Update user's total CO2 reduced
    const newTotal = (user.totalCO2Reduced || 0) + measuredImpact;
    db.update('users', userId, { totalCO2Reduced: newTotal });

    // Update user action
    const updatedUserAction = db.update('userActions', userActionId, {
      status: 'completed',
      completedDate: new Date().toISOString(),
      progress: 100,
      measuredImpact,
      notes: notes || userAction.notes
    });

    res.json({
      success: true,
      userAction: updatedUserAction,
      totalCO2Reduced: newTotal,
      message: 'Action completed! Great work!'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Abandon an action
router.post('/user/:userId/actions/:userActionId/abandon', (req, res) => {
  try {
    const { userId, userActionId } = req.params;
    const { reason } = req.body;

    const userAction = db.findById('userActions', userActionId);
    if (!userAction) {
      return res.status(404).json({ error: 'User action not found' });
    }

    if (userAction.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedUserAction = db.update('userActions', userActionId, {
      status: 'abandoned',
      abandonedDate: new Date().toISOString(),
      abandonReason: reason || ''
    });

    res.json({
      success: true,
      userAction: updatedUserAction,
      message: 'Action marked as abandoned'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user action
router.delete('/user/:userId/actions/:userActionId', (req, res) => {
  try {
    const { userId, userActionId } = req.params;

    const userAction = db.findById('userActions', userActionId);
    if (!userAction) {
      return res.status(404).json({ error: 'User action not found' });
    }

    if (userAction.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    db.delete('userActions', userActionId);

    res.json({
      success: true,
      message: 'User action deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
