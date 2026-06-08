import express from 'express';
import db from '../database/inMemoryDB.js';

const router = express.Router();

// Get leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const { limit = 10, timeframe = 'allTime' } = req.query;

    const leaderboard = db.getLeaderboard(parseInt(limit));

    res.json({
      success: true,
      timeframe,
      leaderboard
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all challenges
router.get('/challenges', (req, res) => {
  try {
    const { status = 'active' } = req.query;

    let challenges = db.findAll('challenges');

    if (status === 'active') {
      const now = new Date();
      challenges = challenges.filter(c => {
        const endDate = new Date(c.endDate);
        return endDate >= now;
      });
    } else if (status === 'upcoming') {
      const now = new Date();
      challenges = challenges.filter(c => {
        const startDate = new Date(c.startDate);
        return startDate > now;
      });
    } else if (status === 'past') {
      const now = new Date();
      challenges = challenges.filter(c => {
        const endDate = new Date(c.endDate);
        return endDate < now;
      });
    }

    res.json({
      success: true,
      count: challenges.length,
      challenges
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get challenge by ID
router.get('/challenges/:challengeId', (req, res) => {
  try {
    const { challengeId } = req.params;
    const challenge = db.findById('challenges', challengeId);

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    res.json({ success: true, challenge });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join a challenge
router.post('/challenges/:challengeId/join', (req, res) => {
  try {
    const { challengeId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const challenge = db.findById('challenges', challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if challenge has ended
    const now = new Date();
    const endDate = new Date(challenge.endDate);
    if (endDate < now) {
      return res.status(400).json({ error: 'Challenge has ended' });
    }

    // Create user challenge entry
    const existingParticipation = db.findByQuery('userActions', {
      userId,
      actionId: challengeId
    });

    if (existingParticipation.length > 0) {
      return res.status(409).json({ error: 'User already joined this challenge' });
    }

    const participation = db.create('userActions', {
      userId,
      actionId: challengeId,
      status: 'active',
      startDate: new Date().toISOString(),
      progress: 0,
      type: 'challenge'
    });

    // Update challenge participant count
    db.update('challenges', challengeId, {
      participants: (challenge.participants || 0) + 1
    });

    res.status(201).json({
      success: true,
      participation,
      message: 'Successfully joined challenge!'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's challenges
router.get('/user/:userId/challenges', (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let userChallenges = db.findByQuery('userActions', {
      userId,
      type: 'challenge'
    });

    if (status) {
      userChallenges = userChallenges.filter(uc => uc.status === status);
    }

    // Enrich with challenge details
    const enrichedChallenges = userChallenges.map(uc => {
      const challenge = db.findById('challenges', uc.actionId);
      return {
        ...uc,
        challengeDetails: challenge
      };
    });

    res.json({
      success: true,
      count: enrichedChallenges.length,
      userChallenges: enrichedChallenges
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update challenge progress
router.put('/challenges/:challengeId/progress', (req, res) => {
  try {
    const { challengeId } = req.params;
    const { userId, progress, notes } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const participation = db.findByQuery('userActions', {
      userId,
      actionId: challengeId,
      type: 'challenge'
    });

    if (participation.length === 0) {
      return res.status(404).json({ error: 'User has not joined this challenge' });
    }

    const updated = db.update('userActions', participation[0].id, {
      progress: Math.min(100, progress || 0),
      notes: notes || participation[0].notes,
      updatedAt: new Date().toISOString()
    });

    // If progress is 100%, mark as completed
    if (progress >= 100 && participation[0].status !== 'completed') {
      const challenge = db.findById('challenges', challengeId);
      db.update('userActions', participation[0].id, {
        status: 'completed',
        completedDate: new Date().toISOString(),
        measuredImpact: challenge?.estimatedCO2Reduction || 0
      });

      // Update user's total CO2 reduced
      const user = db.findById('users', userId);
      if (user && challenge) {
        const newTotal = (user.totalCO2Reduced || 0) + (challenge.estimatedCO2Reduction || 0);
        db.update('users', userId, { totalCO2Reduced: newTotal });
      }
    }

    res.json({
      success: true,
      participation: updated,
      message: 'Progress updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave a challenge
router.post('/challenges/:challengeId/leave', (req, res) => {
  try {
    const { challengeId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const participation = db.findByQuery('userActions', {
      userId,
      actionId: challengeId,
      type: 'challenge'
    });

    if (participation.length === 0) {
      return res.status(404).json({ error: 'User has not joined this challenge' });
    }

    db.delete('userActions', participation[0].id);

    // Update challenge participant count
    const challenge = db.findById('challenges', challengeId);
    if (challenge) {
      db.update('challenges', challengeId, {
        participants: Math.max(0, (challenge.participants || 1) - 1)
      });
    }

    res.json({
      success: true,
      message: 'Left challenge successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's achievements
router.get('/user/:userId/achievements', (req, res) => {
  try {
    const { userId } = req.params;

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = db.calculateUserStats(userId);
    const achievements = [];

    // Define achievement criteria
    const achievementDefinitions = [
      {
        id: 'first-action',
        title: 'Getting Started',
        description: 'Started your first climate action',
        icon: '🌱',
        criteria: () => stats.activeActions + stats.completedActions > 0
      },
      {
        id: 'action-complete',
        title: 'Action Hero',
        description: 'Completed your first climate action',
        icon: '⭐',
        criteria: () => stats.completedActions > 0
      },
      {
        id: 'five-actions',
        title: 'Climate Champion',
        description: 'Completed 5 climate actions',
        icon: '🏆',
        criteria: () => stats.completedActions >= 5
      },
      {
        id: 'ten-actions',
        title: 'Eco Warrior',
        description: 'Completed 10 climate actions',
        icon: '🦸',
        criteria: () => stats.completedActions >= 10
      },
      {
        id: 'ton-reduced',
        title: 'Ton Reducer',
        description: 'Reduced 1000 kg of CO2',
        icon: '💪',
        criteria: () => stats.totalCO2Reduced >= 1000
      },
      {
        id: 'five-ton-reduced',
        title: 'Carbon Crusher',
        description: 'Reduced 5000 kg of CO2',
        icon: '🌟',
        criteria: () => stats.totalCO2Reduced >= 5000
      },
      {
        id: 'week-streak',
        title: '7 Day Streak',
        description: 'Logged activities for 7 days in a row',
        icon: '🔥',
        criteria: () => user.streak >= 7
      },
      {
        id: 'month-streak',
        title: '30 Day Streak',
        description: 'Logged activities for 30 days in a row',
        icon: '🎯',
        criteria: () => user.streak >= 30
      }
    ];

    // Check which achievements are earned
    achievementDefinitions.forEach(achievement => {
      if (achievement.criteria()) {
        achievements.push({
          ...achievement,
          earnedDate: user.createdAt,
          unlocked: true
        });
      } else {
        achievements.push({
          ...achievement,
          unlocked: false
        });
      }
    });

    res.json({
      success: true,
      count: achievements.filter(a => a.unlocked).length,
      totalAchievements: achievements.length,
      achievements
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comparison to friends/community
router.get('/user/:userId/comparison', (req, res) => {
  try {
    const { userId } = req.params;

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = db.calculateUserStats(userId);
    const allUsers = db.findAll('users');

    // Calculate community averages
    const communityStats = allUsers.reduce((acc, u) => {
      const userStats = db.calculateUserStats(u.id);
      acc.totalCO2Generated += userStats.totalCO2Generated;
      acc.totalCO2Reduced += userStats.totalCO2Reduced;
      acc.totalUsers++;
      return acc;
    }, { totalCO2Generated: 0, totalCO2Reduced: 0, totalUsers: 0 });

    const avgCO2Generated = communityStats.totalCO2Generated / communityStats.totalUsers;
    const avgCO2Reduced = communityStats.totalCO2Reduced / communityStats.totalUsers;

    // Calculate percentile
    const sortedByReduction = allUsers
      .map(u => db.calculateUserStats(u.id).totalCO2Reduced)
      .sort((a, b) => a - b);

    const userRank = sortedByReduction.findIndex(val => val >= stats.totalCO2Reduced) + 1;
    const percentile = Math.round((userRank / sortedByReduction.length) * 100);

    res.json({
      success: true,
      comparison: {
        user: {
          co2Generated: stats.totalCO2Generated,
          co2Reduced: stats.totalCO2Reduced,
          netCO2: stats.netCO2
        },
        community: {
          avgCO2Generated: Math.round(avgCO2Generated),
          avgCO2Reduced: Math.round(avgCO2Reduced),
          totalUsers: communityStats.totalUsers
        },
        ranking: {
          percentile,
          rank: userRank,
          totalUsers: sortedByReduction.length
        },
        message: percentile >= 50
          ? "You're doing better than average!"
          : "Keep it up! You're on the right track."
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
