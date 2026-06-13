import express from 'express';
import db from '../database/inMemoryDB.js';
import { calculators } from '../database/emissionFactors.js';
import { validateActivity } from '../utils/validation.js';

const router = express.Router();

// Log a new activity
router.post('/', (req, res) => {
  try {
    const {
      userId,
      category,
      type,
      subtype,
      quantity,
      distance,
      amount,
      unit,
      description,
      timestamp
    } = req.body;

    if (!userId || !category || !type) {
      return res.status(400).json({ error: 'userId, category, and type are required' });
    }

    const valResult = validateActivity({ category, type, subtype, amount, distance, quantity });
    if (!valResult.valid) {
      return res.status(400).json({ error: valResult.error });
    }

    // Verify user exists
    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate CO2 emissions based on activity
    let co2Equivalent = 0;

    switch (category) {
      case 'transport':
        co2Equivalent = calculators.calculateTransportEmissions(type, subtype, distance || quantity);
        break;
      case 'energy':
        co2Equivalent = calculators.calculateEnergyEmissions(type, amount || quantity, subtype);
        break;
      case 'food':
        co2Equivalent = calculators.calculateFoodEmissions(type, subtype, amount || quantity);
        break;
      case 'shopping':
        co2Equivalent = calculators.calculateConsumptionEmissions(type, subtype, quantity > 0 ? quantity : amount, quantity > 0);
        break;
      case 'waste':
        co2Equivalent = calculators.calculateWasteEmissions(type, amount || quantity);
        break;
      default:
        co2Equivalent = 0;
    }

    const activity = db.create('activities', {
      userId,
      category,
      type,
      subtype,
      quantity,
      distance,
      amount,
      unit,
      description,
      co2Equivalent: Math.round(co2Equivalent * 100) / 100,
      timestamp: timestamp || new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      activity,
      message: 'Activity logged successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get activities for a user
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, category, limit } = req.query;

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let activities = db.getUserActivities(userId, {
      startDate,
      endDate,
      category
    });

    if (limit) {
      activities = activities.slice(0, parseInt(limit));
    }

    const totalCO2 = activities.reduce((sum, act) => sum + (act.co2Equivalent || 0), 0);

    res.json({
      success: true,
      count: activities.length,
      totalCO2: Math.round(totalCO2 * 100) / 100,
      activities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get activity by ID
router.get('/:activityId', (req, res) => {
  try {
    const { activityId } = req.params;
    const activity = db.findById('activities', activityId);

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ success: true, activity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update activity
router.put('/:activityId', (req, res) => {
  try {
    const { activityId } = req.params;
    const updates = req.body;

    // Recalculate CO2 if relevant fields changed
    const activity = db.findById('activities', activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const updatedData = { ...activity, ...updates };
    let co2Equivalent = activity.co2Equivalent;

    if (updates.distance !== undefined || updates.amount !== undefined || updates.quantity !== undefined || updates.type !== undefined || updates.subtype !== undefined || updates.category !== undefined) {
      const valResult = validateActivity(updatedData);
      if (!valResult.valid) {
        return res.status(400).json({ error: valResult.error });
      }
      switch (updatedData.category) {
        case 'transport':
          co2Equivalent = calculators.calculateTransportEmissions(
            updatedData.type,
            updatedData.subtype,
            updatedData.distance || updatedData.quantity
          );
          break;
        case 'energy':
          co2Equivalent = calculators.calculateEnergyEmissions(
            updatedData.type,
            updatedData.amount || updatedData.quantity,
            updatedData.subtype
          );
          break;
        case 'food':
          co2Equivalent = calculators.calculateFoodEmissions(
            updatedData.type,
            updatedData.subtype,
            updatedData.amount || updatedData.quantity
          );
          break;
        case 'shopping':
          co2Equivalent = calculators.calculateConsumptionEmissions(
            updatedData.type,
            updatedData.subtype,
            updatedData.quantity > 0 ? updatedData.quantity : updatedData.amount,
            updatedData.quantity > 0
          );
          break;
        case 'waste':
          co2Equivalent = calculators.calculateWasteEmissions(
            updatedData.type,
            updatedData.amount || updatedData.quantity
          );
          break;
      }
      updates.co2Equivalent = Math.round(co2Equivalent * 100) / 100;
    }

    const updatedActivity = db.update('activities', activityId, updates);

    res.json({
      success: true,
      activity: updatedActivity,
      message: 'Activity updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete activity
router.delete('/:activityId', (req, res) => {
  try {
    const { activityId } = req.params;
    const deleted = db.delete('activities', activityId);

    if (!deleted) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get activity trends/analytics
router.get('/user/:userId/trends', (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const activities = db.getUserActivities(userId, {
      startDate: cutoffDate.toISOString()
    });

    // Group by category
    const byCategory = {};
    activities.forEach(act => {
      if (!byCategory[act.category]) {
        byCategory[act.category] = {
          count: 0,
          totalCO2: 0
        };
      }
      byCategory[act.category].count++;
      byCategory[act.category].totalCO2 += act.co2Equivalent || 0;
    });

    // Group by day
    const byDay = {};
    activities.forEach(act => {
      const day = act.timestamp.split('T')[0];
      if (!byDay[day]) {
        byDay[day] = {
          date: day,
          count: 0,
          totalCO2: 0
        };
      }
      byDay[day].count++;
      byDay[day].totalCO2 += act.co2Equivalent || 0;
    });

    const dailyTrends = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      trends: {
        period: `Last ${days} days`,
        byCategory,
        dailyTrends,
        totalActivities: activities.length,
        totalCO2: activities.reduce((sum, act) => sum + (act.co2Equivalent || 0), 0)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch log activities (for importing data)
router.post('/batch', (req, res) => {
  try {
    const { userId, activities } = req.body;

    if (!userId || !Array.isArray(activities)) {
      return res.status(400).json({ error: 'userId and activities array are required' });
    }

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate all activities in batch
    for (let i = 0; i < activities.length; i++) {
      const valResult = validateActivity(activities[i]);
      if (!valResult.valid) {
        return res.status(400).json({ error: `Activity at index ${i}: ${valResult.error}` });
      }
    }

    const createdActivities = activities.map(actData => {
      let co2Equivalent = 0;

      switch (actData.category) {
        case 'transport':
          co2Equivalent = calculators.calculateTransportEmissions(
            actData.type,
            actData.subtype,
            actData.distance || actData.quantity
          );
          break;
        case 'energy':
          co2Equivalent = calculators.calculateEnergyEmissions(
            actData.type,
            actData.amount || actData.quantity,
            actData.subtype
          );
          break;
        case 'food':
          co2Equivalent = calculators.calculateFoodEmissions(
            actData.type,
            actData.subtype,
            actData.amount || actData.quantity
          );
          break;
        case 'shopping':
          co2Equivalent = calculators.calculateConsumptionEmissions(
            actData.type,
            actData.subtype,
            actData.quantity > 0 ? actData.quantity : actData.amount,
            actData.quantity > 0
          );
          break;
        case 'waste':
          co2Equivalent = calculators.calculateWasteEmissions(
            actData.type,
            actData.amount || actData.quantity
          );
          break;
      }

      return db.create('activities', {
        ...actData,
        userId,
        co2Equivalent: Math.round(co2Equivalent * 100) / 100,
        timestamp: actData.timestamp || new Date().toISOString()
      });
    });

    res.status(201).json({
      success: true,
      count: createdActivities.length,
      activities: createdActivities,
      message: 'Activities logged successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user routines
router.get('/routines/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const routines = db.findByQuery('routines', { userId });
    res.json({ success: true, count: routines.length, routines });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new recurring routine
router.post('/routines', (req, res) => {
  try {
    const {
      userId,
      name,
      category,
      type,
      subtype,
      amount,
      distance,
      quantity,
      unit,
      description,
      interval = 'daily'
    } = req.body;

    if (!userId || !name || !category || !type) {
      return res.status(400).json({ error: 'userId, name, category, and type are required' });
    }

    const valResult = validateActivity({ category, type, subtype, amount, distance, quantity });
    if (!valResult.valid) {
      return res.status(400).json({ error: valResult.error });
    }

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const routine = db.create('routines', {
      userId,
      name,
      category,
      type,
      subtype,
      amount,
      distance,
      quantity,
      unit,
      description,
      interval
    });

    res.status(201).json({
      success: true,
      routine,
      message: 'Routine created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger a routine (automatically logs activity)
router.post('/routines/:routineId/trigger', (req, res) => {
  try {
    const { routineId } = req.params;
    const routine = db.findById('routines', routineId);
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    // Calculate emissions
    let co2Equivalent = 0;
    const { category, type, subtype, amount, distance, quantity, unit, description, userId } = routine;

    switch (category) {
      case 'transport':
        co2Equivalent = calculators.calculateTransportEmissions(type, subtype, distance || quantity);
        break;
      case 'energy':
        co2Equivalent = calculators.calculateEnergyEmissions(type, amount || quantity, subtype);
        break;
      case 'food':
        co2Equivalent = calculators.calculateFoodEmissions(type, subtype, amount || quantity);
        break;
      case 'shopping':
        co2Equivalent = calculators.calculateConsumptionEmissions(type, subtype, quantity > 0 ? quantity : amount, quantity > 0);
        break;
      case 'waste':
        co2Equivalent = calculators.calculateWasteEmissions(type, amount || quantity);
        break;
    }

    const activity = db.create('activities', {
      userId,
      category,
      type,
      subtype,
      quantity,
      distance,
      amount,
      unit,
      description: description || `Triggered Routine: ${routine.name}`,
      co2Equivalent: Math.round(co2Equivalent * 100) / 100,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      activity,
      message: `Routine '${routine.name}' triggered and logged successfully!`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a routine
router.delete('/routines/:routineId', (req, res) => {
  try {
    const { routineId } = req.params;
    const deleted = db.delete('routines', routineId);
    if (!deleted) {
      return res.status(404).json({ error: 'Routine not found' });
    }
    res.json({ success: true, message: 'Routine deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
