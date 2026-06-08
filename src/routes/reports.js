import express from 'express';
import db from '../database/inMemoryDB.js';

const router = express.Router();

// Generate user report
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { format = 'json', period = 'month' } = req.query;

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = db.calculateUserStats(userId);
    const activities = db.getUserActivities(userId);
    const userActions = db.getUserActions(userId);

    // Calculate period dates
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const periodActivities = activities.filter(a =>
      new Date(a.timestamp) >= startDate && new Date(a.timestamp) <= endDate
    );

    // Category breakdown
    const categoryData = {};
    periodActivities.forEach(act => {
      if (!categoryData[act.category]) {
        categoryData[act.category] = { count: 0, co2: 0 };
      }
      categoryData[act.category].count++;
      categoryData[act.category].co2 += act.co2Equivalent || 0;
    });

    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        type: period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      user: {
        name: user.name,
        email: user.email,
        location: user.location,
        baselineFootprint: user.baselineFootprint,
        totalCO2Reduced: user.totalCO2Reduced || 0
      },
      summary: {
        totalActivities: periodActivities.length,
        totalCO2Generated: Math.round(periodActivities.reduce((sum, a) => sum + (a.co2Equivalent || 0), 0) * 100) / 100,
        averageDailyCO2: Math.round((periodActivities.reduce((sum, a) => sum + (a.co2Equivalent || 0), 0) / (period === 'week' ? 7 : period === 'month' ? 30 : 365)) * 100) / 100,
        activeActions: userActions.filter(ua => ua.status === 'active').length,
        completedActions: userActions.filter(ua => ua.status === 'completed').length
      },
      categoryBreakdown: Object.keys(categoryData).map(cat => ({
        category: cat,
        activities: categoryData[cat].count,
        co2: Math.round(categoryData[cat].co2 * 100) / 100,
        percentage: ((categoryData[cat].co2 / periodActivities.reduce((sum, a) => sum + (a.co2Equivalent || 0), 0)) * 100).toFixed(1)
      })).sort((a, b) => b.co2 - a.co2),
      topActivities: periodActivities
        .sort((a, b) => b.co2Equivalent - a.co2Equivalent)
        .slice(0, 10)
        .map(a => ({
          date: a.timestamp,
          category: a.category,
          type: a.type,
          description: a.description,
          co2: a.co2Equivalent
        })),
      actions: userActions.map(ua => {
        const action = db.findById('actions', ua.actionId);
        return {
          title: action?.title,
          status: ua.status,
          progress: ua.progress,
          estimatedReduction: action?.estimatedCO2Reduction,
          startDate: ua.startDate,
          completedDate: ua.completedDate
        };
      })
    };

    if (format === 'text') {
      // Generate plain text report
      let text = `
╔════════════════════════════════════════════════════════════╗
║         CARBON FOOTPRINT REPORT - ${period.toUpperCase()}                 ║
╚════════════════════════════════════════════════════════════╝

USER: ${user.name} (${user.email})
LOCATION: ${user.location}
BASELINE FOOTPRINT: ${user.baselineFootprint} kg CO2/year
PERIOD: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Activities:     ${report.summary.totalActivities}
Total CO2 Generated:  ${report.summary.totalCO2Generated} kg
Average Daily CO2:    ${report.summary.averageDailyCO2} kg
Active Actions:       ${report.summary.activeActions}
Completed Actions:    ${report.summary.completedActions}
Total CO2 Reduced:    ${user.totalCO2Reduced || 0} kg

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMISSIONS BY CATEGORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${report.categoryBreakdown.map(cat =>
  `${cat.category.padEnd(15)} ${String(cat.co2).padEnd(10)} kg  (${cat.percentage}%)`
).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOP 5 HIGHEST EMISSION ACTIVITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${report.topActivities.slice(0, 5).map((act, i) =>
  `${i+1}. ${act.category} - ${act.co2.toFixed(2)} kg CO2\n   ${act.description || act.type}`
).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REDUCTION ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${report.actions.map(a =>
  `• ${a.title} [${a.status.toUpperCase()}]\n  Progress: ${a.progress}% | Est. Reduction: ${a.estimatedReduction} kg/year`
).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Report generated: ${new Date().toLocaleString()}
Carbon Footprint Awareness Platform
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
      res.type('text/plain').send(text);
    } else {
      res.json({ success: true, report });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export user data (CSV format)
router.get('/user/:userId/export', (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'activities' } = req.query;

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (type === 'activities') {
      const activities = db.getUserActivities(userId);

      let csv = 'Date,Category,Type,Subtype,Amount,Distance,CO2 (kg),Description\n';
      activities.forEach(act => {
        csv += `${act.timestamp},${act.category},${act.type},${act.subtype || ''},${act.amount || ''},${act.distance || ''},${act.co2Equivalent},"${act.description || ''}"\n`;
      });

      res.type('text/csv')
         .attachment(`activities-${userId}-${new Date().toISOString().split('T')[0]}.csv`)
         .send(csv);
    } else if (type === 'actions') {
      const userActions = db.getUserActions(userId);

      let csv = 'Action,Status,Progress,Start Date,Completed Date,Estimated Reduction (kg/year)\n';
      userActions.forEach(ua => {
        const action = db.findById('actions', ua.actionId);
        csv += `"${action?.title}",${ua.status},${ua.progress},${ua.startDate},${ua.completedDate || ''},${action?.estimatedCO2Reduction}\n`;
      });

      res.type('text/csv')
         .attachment(`actions-${userId}-${new Date().toISOString().split('T')[0]}.csv`)
         .send(csv);
    } else {
      res.status(400).json({ error: 'Invalid export type. Use "activities" or "actions"' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
