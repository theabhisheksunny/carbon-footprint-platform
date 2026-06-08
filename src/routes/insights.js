import express from 'express';
import db from '../database/inMemoryDB.js';
import { calculators, regionalAverages } from '../database/emissionFactors.js';

const router = express.Router();

// Get personalized insights for a user
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.findById('users', userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const activities = db.getUserActivities(userId);
    const stats = db.calculateUserStats(userId);

    // Analyze emission patterns
    const categoryBreakdown = {};
    activities.forEach(act => {
      if (!categoryBreakdown[act.category]) {
        categoryBreakdown[act.category] = { count: 0, totalCO2: 0 };
      }
      categoryBreakdown[act.category].count++;
      categoryBreakdown[act.category].totalCO2 += act.co2Equivalent || 0;
    });

    // Find highest impact category
    let highestCategory = null;
    let highestCO2 = 0;
    Object.keys(categoryBreakdown).forEach(cat => {
      if (categoryBreakdown[cat].totalCO2 > highestCO2) {
        highestCO2 = categoryBreakdown[cat].totalCO2;
        highestCategory = cat;
      }
    });

    // Generate insights
    const insights = [];

    // Insight 1: Highest impact category
    if (highestCategory) {
      const percentage = ((highestCO2 / stats.totalCO2Generated) * 100).toFixed(0);
      insights.push({
        type: 'high_impact',
        category: highestCategory,
        title: `${highestCategory.charAt(0).toUpperCase() + highestCategory.slice(1)} is your largest footprint`,
        description: `${percentage}% of your emissions come from ${highestCategory}. Focus here for maximum impact.`,
        co2Amount: Math.round(highestCO2),
        priority: 'high'
      });
    }

    // Insight 2: Comparison to regional average
    const regionalAvg = user.regionalAverage;
    const monthlyRegionalAvg = regionalAvg / 12;
    if (stats.last30DaysCO2 > monthlyRegionalAvg * 1.2) {
      insights.push({
        type: 'above_average',
        title: 'Above regional average',
        description: `Your monthly footprint is ${((stats.last30DaysCO2 / monthlyRegionalAvg - 1) * 100).toFixed(0)}% higher than your regional average.`,
        co2Amount: Math.round(stats.last30DaysCO2 - monthlyRegionalAvg),
        priority: 'medium'
      });
    } else if (stats.last30DaysCO2 < monthlyRegionalAvg * 0.8) {
      insights.push({
        type: 'below_average',
        title: 'Below regional average!',
        description: `Great work! Your footprint is ${((1 - stats.last30DaysCO2 / monthlyRegionalAvg) * 100).toFixed(0)}% lower than your regional average.`,
        priority: 'positive'
      });
    }

    // Insight 3: Progress trend
    if (activities.length >= 7) {
      const last7Days = activities.slice(0, 7).reduce((sum, a) => sum + (a.co2Equivalent || 0), 0);
      const previous7Days = activities.slice(7, 14).reduce((sum, a) => sum + (a.co2Equivalent || 0), 0);

      if (previous7Days > 0) {
        const change = ((last7Days - previous7Days) / previous7Days * 100).toFixed(0);
        if (Math.abs(change) > 10) {
          insights.push({
            type: change < 0 ? 'improving' : 'worsening',
            title: change < 0 ? 'Footprint decreasing!' : 'Footprint increasing',
            description: `Your emissions ${change < 0 ? 'decreased' : 'increased'} by ${Math.abs(change)}% in the past week.`,
            priority: change < 0 ? 'positive' : 'medium'
          });
        }
      }
    }

    // Insight 4: Action recommendations
    const userActions = db.getUserActions(userId);
    if (userActions.filter(ua => ua.status === 'active').length === 0) {
      insights.push({
        type: 'no_actions',
        title: 'Start a reduction action',
        description: 'You haven\'t started any actions yet. Begin with an easy action to start reducing your footprint.',
        priority: 'medium'
      });
    }

    // Insight 5: Streak encouragement
    if (user.streak >= 7) {
      insights.push({
        type: 'streak',
        title: `${user.streak} day streak!`,
        description: 'Keep up the great tracking habit!',
        priority: 'positive'
      });
    }

    // Quick wins - easy actions for their highest impact category
    const allActions = db.findAll('actions');
    const quickWins = allActions
      .filter(a => a.category === highestCategory && a.difficulty === 'easy')
      .slice(0, 3);

    res.json({
      success: true,
      insights: {
        summary: {
          totalInsights: insights.length,
          highPriority: insights.filter(i => i.priority === 'high').length,
          positive: insights.filter(i => i.priority === 'positive').length
        },
        insights,
        categoryBreakdown: Object.keys(categoryBreakdown).map(cat => ({
          category: cat,
          count: categoryBreakdown[cat].count,
          totalCO2: Math.round(categoryBreakdown[cat].totalCO2 * 100) / 100,
          percentage: ((categoryBreakdown[cat].totalCO2 / stats.totalCO2Generated) * 100).toFixed(1)
        })).sort((a, b) => b.totalCO2 - a.totalCO2),
        quickWins
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get streak information
router.get('/user/:userId/streak', (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.findById('users', userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const activities = db.getUserActivities(userId);

    // Calculate actual streak from activities
    let currentStreak = 0;
    let longestStreak = 0;
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

    // Calculate current streak
    for (let i = 0; i < sortedDates.length; i++) {
      const date = new Date(sortedDates[i]);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (date.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    let tempStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = (sortedDates[i - 1] - sortedDates[i]) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    res.json({
      success: true,
      streak: {
        current: currentStreak,
        longest: longestStreak,
        lastActivity: activities.length > 0 ? activities[0].timestamp : null,
        message: currentStreak >= 7 ? 'Amazing streak! Keep it up!' :
                 currentStreak >= 3 ? 'Great progress!' :
                 'Start tracking daily to build a streak!'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get carbon savings forecast
router.get('/user/:userId/forecast', (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = 'year' } = req.query; // month, year, 5years

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userActions = db.getUserActions(userId).filter(ua => ua.status === 'active' || ua.status === 'completed');
    const totalAnnualReduction = userActions.reduce((sum, ua) => {
      const action = db.findById('actions', ua.actionId);
      return sum + (action?.estimatedCO2Reduction || 0);
    }, 0);

    const multiplier = {
      month: 1/12,
      year: 1,
      '5years': 5
    }[timeframe] || 1;

    const projectedReduction = totalAnnualReduction * multiplier;
    const currentFootprint = user.baselineFootprint;
    const futureFootprint = Math.max(0, currentFootprint - projectedReduction);

    // Calculate equivalent impacts
    const trees = (projectedReduction / 21).toFixed(1);
    const miles = (projectedReduction / 0.404).toFixed(0);

    res.json({
      success: true,
      forecast: {
        timeframe,
        currentAnnualFootprint: currentFootprint,
        projectedAnnualReduction: Math.round(totalAnnualReduction),
        projectedFootprint: Math.round(futureFootprint),
        projectedSavings: Math.round(projectedReduction),
        percentageReduction: ((projectedReduction / currentFootprint) * 100).toFixed(1),
        equivalents: {
          trees: `${trees} trees planted for ${timeframe}`,
          milesNotDriven: `${miles} miles not driven`,
          message: `In ${timeframe === '5years' ? '5 years' : `one ${timeframe}`}, you'll save the equivalent of ${trees} trees!`
        },
        activeActions: userActions.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
