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
    const userStreak = db.calculateUserStreak(userId).current;
    if (userStreak >= 7) {
      insights.push({
        type: 'streak',
        title: `${userStreak} day streak!`,
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
    const calculatedStreak = db.calculateUserStreak(userId);
    const currentStreak = calculatedStreak.current;
    const longestStreak = calculatedStreak.longest;

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
      let action = db.findById('actions', ua.actionId);
      if (!action) {
        action = db.findById('challenges', ua.actionId);
      }
      return sum + (action?.estimatedCO2Reduction || 0);
    }, 0);

    const multiplier = {
      month: 1/12,
      year: 1,
      '5years': 5
    }[timeframe] || 1;

    const projectedReduction = totalAnnualReduction * multiplier;
    const currentFootprint = user.baselineFootprint * multiplier;
    const futureFootprint = Math.max(0, currentFootprint - projectedReduction);

    // Calculate equivalent impacts
    const trees = (projectedReduction / 21).toFixed(1);
    const miles = (projectedReduction / 0.404).toFixed(0);

    res.json({
      success: true,
      forecast: {
        timeframe,
        currentAnnualFootprint: Math.round(currentFootprint),
        projectedAnnualReduction: Math.round(totalAnnualReduction),
        projectedFootprint: Math.round(futureFootprint),
        projectedSavings: Math.round(projectedReduction),
        percentageReduction: currentFootprint > 0 ? ((projectedReduction / currentFootprint) * 100).toFixed(1) : '0.0',
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

// Smart Carbon Advisor chatbot endpoint
router.post('/user/:userId/advisor', (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message string is required' });
    }

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = db.calculateUserStats(userId);
    const recentActivities = db.getUserActivities(userId, {}).slice(0, 10);
    const userActions = db.getUserActions(userId);
    const userActionIds = new Set(userActions.map(ua => ua.actionId));

    // Calculate user's category breakdown from recent activities
    const catEmissions = { transport: 0, energy: 0, food: 0, shopping: 0, waste: 0 };
    recentActivities.forEach(a => {
      catEmissions[a.category] = (catEmissions[a.category] || 0) + (a.co2Equivalent || 0);
    });

    // Find highest emission category
    let highestCat = 'transport';
    let maxEmit = -1;
    for (const [cat, val] of Object.entries(catEmissions)) {
      if (val > maxEmit) {
        maxEmit = val;
        highestCat = cat;
      }
    }

    // Get recommendations from action library
    const allActions = db.findAll('actions');
    const availableActions = allActions.filter(a => !userActionIds.has(a.id));

    const query = message.toLowerCase();
    let reply = "";

    // 1. Live Comparisons
    if (query.includes('incandescent') || (query.includes('led') && (query.includes('compare') || query.includes('vs') || query.includes('bulb')))) {
      reply = `💡 **Incandescent vs LED Bulbs Comparison**:\n\n` +
        `• **Incandescent Bulb (60W)**: Uses ~60W power. Assuming 3 hours/day of usage, it consumes **65.7 kWh** of electricity annually, emitting roughly **25.3 kg CO2e** per bulb.\n` +
        `• **LED Bulb (9W - equivalent brightness)**: Uses ~9W power. For the same 3 hours/day, it consumes only **9.8 kWh** annually, emitting roughly **3.8 kg CO2e** per bulb.\n\n` +
        `👉 **Annual Savings**: Switching a single bulb saves **21.5 kg CO2e** and about **$9.00** in electricity costs. Changing 10 bulbs in your home saves **215 kg CO2e** and **$90.00** per year! This is an **85% reduction** in lighting emissions and energy costs.`;
    } 
    else if (query.includes('vs') || query.includes('compare') || query.includes('comparison') || query.includes('difference between')) {
      const foodItems = {
        beef: { name: 'Beef', value: 27.0, unit: 'kg CO2e/kg' },
        lamb: { name: 'Lamb', value: 39.2, unit: 'kg CO2e/kg' },
        pork: { name: 'Pork', value: 12.1, unit: 'kg CO2e/kg' },
        chicken: { name: 'Chicken', value: 6.9, unit: 'kg CO2e/kg' },
        turkey: { name: 'Turkey', value: 10.9, unit: 'kg CO2e/kg' },
        fish: { name: 'Fish', value: 5.4, unit: 'kg CO2e/kg' },
        shrimp: { name: 'Shrimp', value: 18.0, unit: 'kg CO2e/kg' },
        salmon: { name: 'Salmon', value: 11.9, unit: 'kg CO2e/kg' },
        cheese: { name: 'Cheese', value: 13.5, unit: 'kg CO2e/kg' },
        milk: { name: 'Milk', value: 1.9, unit: 'kg CO2e/kg' },
        eggs: { name: 'Eggs', value: 4.8, unit: 'kg CO2e/kg' },
        yogurt: { name: 'Yogurt', value: 2.2, unit: 'kg CO2e/kg' },
        butter: { name: 'Butter', value: 12.1, unit: 'kg CO2e/kg' },
        vegetable: { name: 'Vegetables', value: 0.4, unit: 'kg CO2e/kg' },
        vegetables: { name: 'Vegetables', value: 0.4, unit: 'kg CO2e/kg' },
        fruit: { name: 'Fruits', value: 0.4, unit: 'kg CO2e/kg' },
        fruits: { name: 'Fruits', value: 0.4, unit: 'kg CO2e/kg' },
        grain: { name: 'Grains', value: 0.6, unit: 'kg CO2e/kg' },
        grains: { name: 'Grains', value: 0.6, unit: 'kg CO2e/kg' },
        legume: { name: 'Legumes', value: 0.9, unit: 'kg CO2e/kg' },
        legumes: { name: 'Legumes', value: 0.9, unit: 'kg CO2e/kg' },
        nuts: { name: 'Nuts', value: 2.3, unit: 'kg CO2e/kg' },
        tofu: { name: 'Tofu', value: 2.0, unit: 'kg CO2e/kg' },
        bread: { name: 'Bread', value: 1.2, unit: 'kg CO2e/kg' },
        pasta: { name: 'Pasta', value: 1.5, unit: 'kg CO2e/kg' },
        rice: { name: 'Rice', value: 2.7, unit: 'kg CO2e/kg' },
        sugar: { name: 'Sugar', value: 1.8, unit: 'kg CO2e/kg' }
      };

      const transportItems = {
        'gasoline car': { name: 'Gasoline Car', value: 0.404, unit: 'kg CO2e/mile' },
        'diesel car': { name: 'Diesel Car', value: 0.411, unit: 'kg CO2e/mile' },
        'hybrid car': { name: 'Hybrid Car', value: 0.293, unit: 'kg CO2e/mile' },
        'electric car': { name: 'Electric Car (EV)', value: 0.180, unit: 'kg CO2e/mile' },
        ev: { name: 'Electric Car (EV)', value: 0.180, unit: 'kg CO2e/mile' },
        suv: { name: 'SUV (Gasoline)', value: 0.550, unit: 'kg CO2e/mile' },
        car: { name: 'Gasoline Car', value: 0.404, unit: 'kg CO2e/mile' },
        bus: { name: 'Bus (Transit)', value: 0.089, unit: 'kg CO2e/mile' },
        train: { name: 'Train', value: 0.041, unit: 'kg CO2e/mile' },
        subway: { name: 'Subway', value: 0.035, unit: 'kg CO2e/mile' },
        'light rail': { name: 'Light Rail', value: 0.038, unit: 'kg CO2e/mile' },
        motorcycle: { name: 'Motorcycle', value: 0.180, unit: 'kg CO2e/mile' },
        bike: { name: 'Bicycle', value: 0.0, unit: 'kg CO2e/mile' },
        bicycle: { name: 'Bicycle', value: 0.0, unit: 'kg CO2e/mile' },
        walk: { name: 'Walking', value: 0.0, unit: 'kg CO2e/mile' },
        walking: { name: 'Walking', value: 0.0, unit: 'kg CO2e/mile' },
        'e-scooter': { name: 'E-Scooter', value: 0.040, unit: 'kg CO2e/mile' },
        scooter: { name: 'E-Scooter', value: 0.040, unit: 'kg CO2e/mile' }
      };

      const foundFoods = [];
      for (const [key, details] of Object.entries(foodItems)) {
        const regex = new RegExp(`\\b${key}\\b`, 'i');
        if (regex.test(query)) {
          if (!foundFoods.some(f => f.name === details.name)) {
            foundFoods.push(details);
          }
        }
      }

      const foundTransport = [];
      for (const [key, details] of Object.entries(transportItems)) {
        const regex = new RegExp(`\\b${key}\\b`, 'i');
        if (regex.test(query)) {
          if (!foundTransport.some(t => t.name === details.name)) {
            foundTransport.push(details);
          }
        }
      }

      if (foundFoods.length >= 2) {
        const item1 = foundFoods[0];
        const item2 = foundFoods[1];
        const higher = item1.value >= item2.value ? item1 : item2;
        const lower = item1.value < item2.value ? item1 : item2;
        const diff = higher.value - lower.value;
        const percent = ((diff / higher.value) * 100).toFixed(1);

        reply = `🥗 **Food Comparison: ${higher.name} vs ${lower.name}**\n\n` +
          `• **${higher.name}**: ${higher.value.toFixed(1)} ${higher.unit}\n` +
          `• **${lower.name}**: ${lower.value.toFixed(1)} ${lower.unit}\n\n` +
          `💡 Choosing **${lower.name}** instead of **${higher.name}** saves **${diff.toFixed(1)} kg CO2e** per kilogram. That is a **${percent}%** carbon footprint reduction!\n\n` +
          `*For perspective*: If you consume 10 kg of meat/food per year, switching from ${higher.name} to ${lower.name} reduces emissions by **${(diff * 10).toFixed(0)} kg CO2e**, which is equivalent to planting ${(diff * 10 / 22).toFixed(1)} trees!`;
      }
      else if (foundTransport.length >= 2) {
        const item1 = foundTransport[0];
        const item2 = foundTransport[1];
        const higher = item1.value >= item2.value ? item1 : item2;
        const lower = item1.value < item2.value ? item1 : item2;
        const diff = higher.value - lower.value;
        const percent = higher.value > 0 ? ((diff / higher.value) * 100).toFixed(1) : '100';

        reply = `🚗 **Transportation Comparison: ${higher.name} vs ${lower.name}**\n\n` +
          `• **${higher.name}**: ${higher.value.toFixed(3)} ${higher.unit}\n` +
          `• **${lower.name}**: ${lower.value.toFixed(3)} ${lower.unit}\n\n` +
          `💡 Choosing **${lower.name}** instead of **${higher.name}** saves **${diff.toFixed(3)} kg CO2e** per mile.\n\n` +
          `*For a 100-mile trip*:\n` +
          `• **${higher.name}** emits **${(higher.value * 100).toFixed(1)} kg CO2e**\n` +
          `• **${lower.name}** emits **${(lower.value * 100).toFixed(1)} kg CO2e**\n\n` +
          `👉 Taking **${lower.name}** instead of **${higher.name}** saves **${(diff * 100).toFixed(1)} kg CO2e** (a **${percent}%** reduction)!`;
      }
      else if (foundFoods.length === 1) {
        const item = foundFoods[0];
        const vsItem = item.name === 'Vegetables' ? foodItems.beef : foodItems.vegetables;
        const higher = item.value >= vsItem.value ? item : vsItem;
        const lower = item.value < vsItem.value ? item : vsItem;
        const diff = higher.value - lower.value;
        const percent = ((diff / higher.value) * 100).toFixed(1);

        reply = `🥗 **Food Insight: ${item.name}**\n\n` +
          `• **${item.name}** emissions: ${item.value.toFixed(1)} kg CO2e/kg\n` +
          `• For comparison, **${vsItem.name}** emissions: ${vsItem.value.toFixed(1)} kg CO2e/kg\n\n` +
          `💡 Choosing **${lower.name}** over **${higher.name}** saves **${diff.toFixed(1)} kg CO2e** per kilogram, reducing your diet footprint by **${percent}%**!`;
      }
      else if (foundTransport.length === 1) {
        const item = foundTransport[0];
        const vsItem = item.name === 'Train' ? transportItems.car : transportItems.train;
        const higher = item.value >= vsItem.value ? item : vsItem;
        const lower = item.value < vsItem.value ? item : vsItem;
        const diff = higher.value - lower.value;
        const percent = higher.value > 0 ? ((diff / higher.value) * 100).toFixed(1) : '100';

        reply = `🚗 **Transportation Insight: ${item.name}**\n\n` +
          `• **${item.name}** emissions: ${item.value.toFixed(3)} kg CO2e/mile\n` +
          `• For comparison, **${vsItem.name}** emissions: ${vsItem.value.toFixed(3)} kg CO2e/mile\n\n` +
          `💡 For a 100-mile trip, using **${lower.name}** instead of **${higher.name}** emits **${(lower.value * 100).toFixed(1)} kg CO2e** vs **${(higher.value * 100).toFixed(1)} kg CO2e** (saving **${(diff * 100).toFixed(1)} kg CO2e**, a **${percent}%** reduction)!`;
      }
      else {
        reply = `🔍 **Comparison Query**:\n\nI couldn't identify the specific categories or items you want to compare. You can ask me comparison questions like:\n• *Compare beef vs tofu*\n• *Compare gasoline car vs train*\n• *Compare incandescent vs LED bulbs*`;
      }
    }
    // 2. Leaderboard Standings
    else if (query.includes('leaderboard') || query.includes('rank') || query.includes('standing') || query.includes('score') || query.includes('who is first') || query.includes('winning')) {
      const allUsers = db.findAll('users');
      const leaderboard = allUsers
        .map(u => ({
          id: u.id,
          name: u.name,
          totalReduction: u.totalCO2Reduced || 0,
          activeActions: db.findByQuery('userActions', { userId: u.id, status: 'active' }).length
        }))
        .sort((a, b) => b.totalReduction - a.totalReduction);

      const userRank = leaderboard.findIndex(u => u.id === userId) + 1;
      const totalCompetitors = leaderboard.length;
      
      let rankReply = `📊 **Leaderboard Standings**:\n` +
        `• Your Rank: **#${userRank}** out of **${totalCompetitors}** users\n` +
        `• Your Total Reduction: **${(user.totalCO2Reduced || 0).toFixed(0)} kg CO2e**\n\n` +
        `🏆 **Top 3 Climaters**:\n`;

      leaderboard.slice(0, 3).forEach((u, i) => {
        const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : '🥉');
        rankReply += `${medal} **${u.name}** - ${u.totalReduction.toFixed(0)} kg reduced (${u.activeActions} active campaigns)\n`;
      });

      if (userRank === 1) {
        rankReply += `\n🥇 **Excellent job!** You are leading the community in carbon reductions. Keep up the phenomenal work!`;
      } else {
        const leader = leaderboard[0];
        const gap = leader.totalReduction - (user.totalCO2Reduced || 0);
        rankReply += `\n💡 **Advisor Tip**: You are **${gap.toFixed(0)} kg CO2e** behind the leader, **${leader.name}**. Start and complete new Campaigns to earn more points and boost your rank!`;
      }
      reply = rankReply;
    }
    // 3. Daily Streak
    else if (query.includes('streak') || query.includes('consecutive') || query.includes('day-in-a-row')) {
      const streakObj = db.calculateUserStreak(userId);
      reply = `🔥 **Your Logging Streak Status**:\n` +
        `• **Current Streak**: ${streakObj.current} ${streakObj.current === 1 ? 'day' : 'days'}\n` +
        `• **Longest Streak**: ${streakObj.longest} ${streakObj.longest === 1 ? 'day' : 'days'}\n\n`;

      if (streakObj.current === 0) {
        reply += `⚠️ You haven't logged any carbon activity today or yesterday. Log a trip, home energy usage, diet, or recycling action to start your streak!\n\n💡 *Tip*: Maintaining a streak helps you build eco-friendly habits and demonstrates active commitment to carbon reduction.`;
      } else {
        reply += `💪 **Awesome consistency!** You've tracked your carbon footprint for **${streakObj.current}** consecutive days. Keep logging daily to build your streak, rise in levels, and earn bonus EcoPoints!`;
      }
    }
    // 4. Achievements & Badges
    else if (query.includes('achievement') || query.includes('badge') || query.includes('milestone') || query.includes('unlocked')) {
      const badges = user.achievements || [];
      reply = `🏆 **Your Achievements & Badges**:\n` +
        `• **Eco Level**: Level ${user.level || 1} (${user.xp || 0} XP)\n` +
        `• **EcoPoints Balance**: ${user.ecoPoints || 0} EcoPoints\n` +
        `• **Badges Unlocked**: ${badges.length}\n\n`;

      if (badges.length === 0) {
        reply += `You haven't unlocked any milestone badges yet. Level up by completing action campaigns or purchasing carbon offsets to earn your first badge!`;
      } else {
        reply += `Here are your unlocked achievements:\n`;
        badges.forEach(b => {
          let displayName = b.replace(/-/g, ' ').toUpperCase();
          if (b.startsWith('level-')) {
            const num = b.split('-')[1];
            const titles = {
              '2': 'Level 2: Green Pioneer',
              '3': 'Level 3: Eco Guardian',
              '4': 'Level 4: Climate Warrior',
              '5': 'Level 5: Earth Champion'
            };
            displayName = titles[num] || `Level ${num} Achiever`;
          }
          reply += `• 🥇 **${displayName}**\n`;
        });
      }
      reply += `\n💡 *Tip*: Purchase verified carbon offsets in the Marketplace tab to earn exclusive project badges and level up your profile instantly!`;
    }
    // 5. Conversational greetings, help, & general queries
    else if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('who are you') || query.includes('what can you do') || query.includes('help')) {
      reply = `Hello ${user.name}! I am your Smart Eco-Advisor. 👋\n\nI analyze your real-time carbon footprint and guide you to a lower-impact lifestyle. Here is what you can ask me:\n\n• 📊 **Emissions & Stats**: *"Show my stats"*, *"What is my highest category?"*, or *"Check my carbon budget"*.\n• 🏆 **Social & Progress**: *"Where do I stand on the leaderboard?"*, *"Check my logging streak"*, or *"What achievements have I unlocked?"*\n• ⚖️ **Comparisons**: *"Compare beef vs tofu"*, *"Car vs train emissions"*, or *"Incandescent vs LED bulbs"*.\n• 💡 **Tips**: *"Suggest campaigns I should start"*, *"commute advice"*, or *"energy saving tips"*.`;
    }
    else if (query.includes('what is a carbon footprint') || query.includes('what is carbon footprint') || query.includes('define carbon footprint') || query.includes('meaning of carbon footprint')) {
      reply = `🌍 **What is a Carbon Footprint?**\n\nA carbon footprint is the total amount of greenhouse gases (including carbon dioxide and methane) generated by our actions. It is expressed in kilograms or metric tons of carbon dioxide equivalent (**kg CO2e** or **t CO2e**).\n\nEvery time you drive, turn on the heat, or eat beef, you contribute to your footprint. Reducing this number is key to stabilizing our climate. You can track your daily footprint in the **Log Activity** tab to see your footprint in real time!`;
    }
    else if (query.includes('how can i reduce') || query.includes('how to reduce') || query.includes('reduce footprint') || query.includes('save the planet') || query.includes('combat climate change') || query.includes('climate change')) {
      reply = `🌱 **How to Reduce Your Carbon Footprint**\n\nReducing your environmental impact is easier than you think! Focus on these core areas:\n\n1. 🚗 **Commuting**: Combine errands, carpool, walk/bike short distances, or use public transit. Transitioning to an EV reduces your travel emissions by over **55%**!\n2. ⚡ **Home Energy**: Switch to LED bulbs, optimize heating/cooling using programmable thermostats, and unplug vampire electronics.\n3. 🥗 **Diet**: Swap high-carbon meats (like beef or lamb) for plant-based proteins (like vegetables or tofu) or poultry. Beef is **68 times** more carbon-intensive than vegetables!\n4. 🗑️ **Waste**: Compost food waste, recycle packaging, and avoid single-use plastics.\n\n👉 Go to the **Campaigns & Actions** tab to browse and start active campaigns built to guide you step-by-step!`;
    }
    else if (query.includes('what is offsetting') || query.includes('what is carbon offset') || query.includes('why offset') || query.includes('how to offset')) {
      reply = `🌿 **Understanding Carbon Offsets**\n\nCarbon offsetting allows you to balance out your greenhouse gas emissions by funding certified environmental projects (like reforestation, clean cookstoves, or wind energy grids) that absorb or prevent an equivalent amount of carbon elsewhere.\n\nWhile **reducing** your direct footprint is the most critical first step, offsetting helps mitigate your unavoidable impact. In this platform, you can spend your earned **EcoPoints** under the **Marketplace** tab to support real projects (like Amazon Rainforest Protection) and unlock exclusive badges!`;
    }
    else if (query.includes('cause') || query.includes('methane') || query.includes('greenhouse gas') || query.includes('global warming')) {
      reply = `🌍 **What Causes Climate Change?**\n\nClimate change is driven by the **greenhouse effect**. Human activities (burning fossil fuels like coal, oil, and gas, deforestation, and industrial agriculture) release massive amounts of greenhouse gases (GHGs) like Carbon Dioxide (CO2) and Methane (CH4) into the atmosphere.\n\nThese gases act like a blanket around Earth, trapping solar heat and raising global temperatures. Methane is particularly potent, with a warming effect over **28 times** higher than CO2 over a 100-year period, largely arising from landfill waste and livestock farming. Reducing waste and animal products cuts Methane emissions directly!`;
    }
    else if (query.includes('tree') && (query.includes('plant') || query.includes('how to') || query.includes('grow') || query.includes('absorb'))) {
      reply = `🌳 **Tree Planting and Carbon Absorption**\n\nTrees are natural carbon sinks. Through photosynthesis, they absorb CO2 from the atmosphere and store it as carbon in their wood and soil, releasing oxygen back to the air.\n\n• **Absorption Rate**: A single mature tree absorbs roughly **21 to 22 kg of CO2 per year**.\n• **How to Plant**: Select native species suited to your local soil and climate, choose a spot with adequate sunlight, dig a hole twice as wide as the root ball, water regularly, and protect the sapling from pests.\n\n💡 *Tip*: You can fund tree planting and forestry protection initiatives (like Amazon Rainforest Protection) directly in the **Marketplace** tab using your EcoPoints!`;
    }
    else if (query.includes('renewable') || query.includes('solar') || query.includes('wind') || query.includes('clean energy')) {
      reply = `⚡ **Renewable and Clean Energy**\n\nRenewable energy comes from natural sources that replenish themselves faster than they are consumed, like solar, wind, geothermal, and hydropower. Unlike burning fossil fuels, renewable energy does not emit greenhouse gases during generation.\n\n• **Solar Power**: Converts sunlight into electricity using photovoltaic (PV) panels. Installing home solar can cut household carbon by **3,000 kg CO2/year**!\n• **Utility Plans**: Many utility companies allow you to switch to a 100% green renewable power plan (act-10) with a single call, eliminating up to **2,500 kg CO2/year**.\n\n💡 *Tip*: You can support clean energy grids like Texas Wind Farms in the **Marketplace** using your EcoPoints!`;
    }
    else if (query.includes('recycle') || query.includes('recycling') || query.includes('compost') || query.includes('waste')) {
      reply = `♻️ **Waste Management: Recycling and Composting**\n\nHow we handle trash has a major carbon impact. Landfills release methane (CH4) as organic matter decays without oxygen.\n\n• **Composting**: Diverts organic waste (food scraps, yard clippings) from landfills. Composting decomposes waste aerobically, avoiding methane generation and creating nutrient-rich soil.\n• **Recycling**: Saves energy by avoiding raw material extraction. Ensure you clean paper/cardboard, aluminum cans, and plastics #1 and #2 before putting them in the bin.\n• **Single-Use Plastics**: Refuse single-use shopping bags, water bottles, and plastic packaging to cut production emissions.\n\n👉 Switch to the **Log Activity** tab to record your daily waste or recycling habits!`;
    }
    else if (query.includes('water') && (query.includes('save') || query.includes('reduce') || query.includes('conserve'))) {
      reply = `💧 **Water Conservation and Energy**\n\nConserving water reduces greenhouse gas emissions! A vast amount of energy is consumed to pump, treat, heat, and deliver water to homes, as well as to process wastewater.\n\n• **Showers**: Shortening your shower by just 2 minutes saves gallons of water and cuts water-heating emissions.\n• **Fixtures**: Install low-flow faucet aerators and showerheads to cut water volume without losing pressure.\n• **Appliances**: Run dishwashers and washing machines only with full loads, and wash clothes in cold water (which saves **90%** of washing machine energy!).`;
    }
    else if (query.includes('fashion') || query.includes('cloth') || query.includes('shopping')) {
      reply = `👕 **Sustainable Fashion and Shopping**\n\nThe textile and retail industries account for nearly **8-10% of global carbon emissions**, largely due to energy-intensive fast-fashion manufacturing, synthetic materials (like polyester made from petroleum), and global shipping.\n\n• **Buy Less, Choose Quality**: Purchase durable clothes that last, repair items instead of tossing them, and buy secondhand.\n• **Materials**: Look for organic cotton, linen, hemp, or recycled synthetics.\n• **Washing**: Wash clothes less frequently, use cold water, and air dry (air drying laundry saves **200 kg CO2/year** compared to using an electric dryer!).`;
    }
    else if (query.includes('greenwash') || query.includes('green-wash')) {
      reply = `🔍 **What is Greenwashing?**\n\nGreenwashing is a marketing practice where a company or organization spends more time and money presenting themselves as environmentally friendly than actually implementing practices that minimize their environmental impact.\n\n• **How to Spot It**: Watch for vague claims like "100% natural" or "eco-friendly" without third-party certifications, cherry-picked data (highlighting one green feature while ignoring severe harms), or misleading green imagery (leaves, trees, green colors) on product packaging.\n• **Action**: Look for trusted independent labels (like Energy Star, USDA Organic, Forest Stewardship Council, or Fair Trade) and research company footprints before buying!`;
    }
    // 6. Statistics & Progress
    else if (query.includes('stat') || query.includes('progress') || query.includes('generate') || query.includes('reduction') || query.includes('reduced') || query.includes('net co2') || query.includes('my co2') || query.includes('summary') || query.includes('how many activity')) {
      reply = `📈 **Your Carbon Profile Statistics**:\n` +
        `• **Activities Logged**: ${stats.totalActivities} entries\n` +
        `• **Gross CO2 Generated**: ${stats.totalCO2Generated.toFixed(1)} kg CO2e\n` +
        `• **Carbon Reduced (Campaigns)**: ${stats.totalCO2Reduced.toFixed(1)} kg CO2e\n` +
        `• **Net Carbon Footprint**: **${stats.netCO2.toFixed(1)} kg CO2e**\n` +
        `• **Active Campaigns**: ${stats.activeActions} active\n` +
        `• **Completed Campaigns**: ${stats.completedActions} completed\n` +
        `• **30-Day Activity Log**: ${stats.last30DaysCO2.toFixed(1)} kg CO2e\n` +
        `• **Annual Baseline Footprint**: ${stats.baselineFootprint} kg/year\n` +
        `• **Regional Average**: ${user.regionalAverage || 4800} kg/year\n\n`;

      const annualProjected = stats.netCO2 * 12;
      const regionalAvg = user.regionalAverage || 4800;
      if (annualProjected > regionalAvg) {
        const overPct = (((annualProjected - regionalAvg) / regionalAvg) * 100).toFixed(0);
        reply += `⚠️ *Advisor Analysis*: Your projected annual footprint (**${annualProjected.toFixed(0)} kg**) is **${overPct}%** higher than the regional average (**${regionalAvg} kg**). We recommend starting transport or energy campaigns to reduce it!`;
      } else {
        const underPct = (((regionalAvg - annualProjected) / regionalAvg) * 100).toFixed(0);
        reply += `🌱 *Advisor Analysis*: Awesome! Your projected annual footprint (**${annualProjected.toFixed(0)} kg**) is **${underPct}%** below your regional average (**${regionalAvg} kg**). Keep up the sustainable lifestyle!`;
      }
    }
    // 7. Campaign Recommendations
    else if (query.includes('campaign') || query.includes('action') || query.includes('recommend') || query.includes('suggest') || query.includes('what should i do') || query.includes('how to reduce')) {
      const recs = availableActions.slice(0, 3);
      let recList = '';
      recs.forEach(r => {
        recList += `• **${r.title}** (${r.category.toUpperCase()})\n  *Savings*: ${r.estimatedCO2Reduction} kg CO2e/year\n  *Difficulty*: *${r.difficulty}* | *Cost*: ${r.costImplication}\n`;
      });
      reply = `💡 **Recommended Carbon Reduction Campaigns**:\n\n` +
        `Here are the top personalized campaigns recommended for your profile:\n\n` +
        `${recList || '• You have started or completed all available campaigns! Keep checking back.'}\n\n` +
        `👉 Go to the **Campaigns & Actions** tab to activate any of these and start saving carbon!`;
    }
    // 8. Carbon Budget / Goals
    else if (query.includes('budget') || query.includes('goal') || query.includes('target') || query.includes('limit')) {
      const defaultTarget = Math.round((user.regionalAverage || 4800) / 12);
      const target = (user.profile && user.profile.monthlyTarget) ? user.profile.monthlyTarget : defaultTarget;
      const logged = Math.round(stats.last30DaysCO2 || 0);
      const remaining = target - logged;
      
      if (logged > target) {
        reply = `⚠️ **Carbon Budget Warning**:\nYour monthly carbon target budget is **${target} kg CO2e**, but you have logged **${logged} kg CO2e** in the last 30 days. You are exceeding your target by **${logged - target} kg CO2e**!\n\n💡 **Advisor Tip**: Try starting easy campaigns in transportation or food (like Carpooling or Meatless meals) to reduce your carbon log, and consider funding verified offsets in the Marketplace tab to subtract emissions from your profile!`;
      } else {
        const percent = target > 0 ? ((logged / target) * 100).toFixed(0) : 0;
        reply = `📊 **Carbon Budget Status**:\nYour monthly budget is **${target} kg CO2e**. So far, you've logged **${logged} kg CO2e** (${percent}% of your budget) in the last 30 days.\n\n🌱 You have **${remaining} kg CO2e** remaining. If you stay under budget until the end of the month, you'll be on track for your sustainability goals and keep your profile green!`;
      }
    }
    // 9. Legacy / Fallbacks
    else if (query.includes('highest') || query.includes('biggest') || query.includes('worst') || query.includes('main') || (query.includes('footprint') && query.includes('breakdown'))) {
      const breakdownStr = Object.entries(catEmissions)
        .map(([cat, val]) => `• **${cat.toUpperCase()}**: ${val.toFixed(1)} kg CO2e`)
        .join('\n');
      
      const rec = availableActions.find(a => a.category === highestCat);
      reply = `Based on your recent tracking log, your highest carbon footprint category is **${highestCat.toUpperCase()}** (${maxEmit.toFixed(1)} kg CO2e).\n\nHere is your recent emissions breakdown:\n${breakdownStr}\n\n💡 **Recommendation**: Try starting the campaign **"${rec ? rec.title : 'Switch to LED bulbs'}"** which is estimated to reduce your emissions by **${rec ? rec.estimatedCO2Reduction : 180} kg CO2e** per year!`;
    } 
    else if (query.includes('transport') || query.includes('travel') || query.includes('car') || query.includes('drive') || query.includes('flight')) {
      const recs = availableActions.filter(a => a.category === 'transport').slice(0, 2);
      const recList = recs.map(r => `• **${r.title}** (${r.estimatedCO2Reduction} kg CO2e/yr savings, difficulty: *${r.difficulty}*)`).join('\n');
      reply = `🚗 **Transportation Insights**:\nTransportation is a major carbon contributor. To lower your transit footprint:\n\n${recList || '• Try carpooling or taking public transit.\n• Combine errands to minimize miles.'}\n\n💡 *Tip*: When logging car trips, remember that choosing hybrid or electric cars significantly reduces your emissions (EV factor is 0.180 kg CO2/mile vs Gasoline SUV at 0.550 kg CO2/mile).`;
    } 
    else if (query.includes('energy') || query.includes('electricity') || query.includes('heat') || query.includes('power')) {
      const recs = availableActions.filter(a => a.category === 'energy').slice(0, 2);
      const recList = recs.map(r => `• **${r.title}** (${r.estimatedCO2Reduction} kg CO2e/yr savings, difficulty: *${r.difficulty}*)`).join('\n');
      reply = `⚡ **Home Energy Insights**:\nHeating and electricity consume substantial power. Here are top actions for your home:\n\n${recList || '• Switch to LED bulbs.\n• Unplug standby electronics.'}\n\n💡 *Tip*: Try using a programmable thermostat (act-4) to save both money (~$180/yr) and carbon (~450 kg CO2/yr)!`;
    } 
    else if (query.includes('food') || query.includes('eat') || query.includes('diet') || query.includes('meat') || query.includes('beef')) {
      const recs = availableActions.filter(a => a.category === 'food').slice(0, 2);
      const recList = recs.map(r => `• **${r.title}** (${r.estimatedCO2Reduction} kg CO2e/yr savings, difficulty: *${r.difficulty}*)`).join('\n');
      reply = `🥗 **Dietary Carbon Insights**:\nFood emissions vary heavily. For example, producing 1 kg of Beef emits **27.0 kg CO2e** compared to only **0.4 kg CO2e** for Vegetables!\n\nHere are some diet actions you can adopt:\n\n${recList || '• Go meatless 2-3 days per week.\n• Buy local, seasonal produce.'}\n\n💡 *Tip*: Try starting the "Reduce meat consumption" campaign (act-2) to cut up to 300 kg CO2/yr.`;
    } 
    else if (query.includes('offset') || query.includes('points') || query.includes('rewards') || query.includes('ecopoints')) {
      reply = `🌱 **Offsets & EcoPoints Marketplace**:\nYou currently have **${user.ecoPoints || 0} EcoPoints** and are at **Level ${user.level || 1} (${user.xp || 0} XP)**.\n\nYou can spend your EcoPoints to purchase verified offsets in the Marketplace tab:\n• **Amazon Rainforest Protection** (300 points)\n• **West Texas Wind Farms** (600 points)\n• **Kenyan Clean Cookstoves** (1000 points)\n• **Marine Kelp Cultivation** (1800 points)\n\nOffsetting helps capture carbon directly, leveling you up and improving your rank on the leaderboard!`;
    } 
    else {
      // Default advice based on highest category
      const rec = availableActions.find(a => a.category === highestCat) || allActions[0];
      reply = `Hello ${user.name}! I am your Eco-Advisor. 👋\n\nLooking at your profile, your net emissions are **${stats.netCO2.toFixed(1)} kg CO2e** with **${stats.activeActions} active campaigns**.\n\nSince your highest category is **${highestCat.toUpperCase()}**, I recommend that you start the campaign: **"${rec.title}"** (which yields ~${rec.estimatedCO2Reduction} kg CO2e/year carbon reduction).\n\nAsk me about **"highest emissions"**, **"food tips"**, **"commute advice"**, **"my carbon budget"**, or **"how to spend EcoPoints"**!`;
    }

    res.json({
      success: true,
      reply,
      userStats: {
        ecoPoints: user.ecoPoints || 0,
        level: user.level || 1,
        xp: user.xp || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
