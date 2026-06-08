// API Endpoint Inventory and Cross-Check

const endpoints = {
  users: [
    { method: 'POST', path: '/api/users', description: 'Create user' },
    { method: 'GET', path: '/api/users/:userId', description: 'Get user by ID' },
    { method: 'PUT', path: '/api/users/:userId', description: 'Update user' },
    { method: 'POST', path: '/api/users/:userId/recalculate-baseline', description: 'Recalculate baseline' },
    { method: 'GET', path: '/api/users/:userId/stats', description: 'Get user statistics' },
    { method: 'GET', path: '/api/users/:userId/dashboard', description: 'Get dashboard' },
    { method: 'DELETE', path: '/api/users/:userId', description: 'Delete user' }
  ],
  activities: [
    { method: 'POST', path: '/api/activities', description: 'Log activity' },
    { method: 'GET', path: '/api/activities/user/:userId', description: 'Get user activities' },
    { method: 'GET', path: '/api/activities/:activityId', description: 'Get activity by ID' },
    { method: 'PUT', path: '/api/activities/:activityId', description: 'Update activity' },
    { method: 'DELETE', path: '/api/activities/:activityId', description: 'Delete activity' },
    { method: 'GET', path: '/api/activities/user/:userId/trends', description: 'Get activity trends' },
    { method: 'POST', path: '/api/activities/batch', description: 'Batch log activities' }
  ],
  actions: [
    { method: 'GET', path: '/api/actions', description: 'Get all actions' },
    { method: 'GET', path: '/api/actions/:actionId', description: 'Get action by ID' },
    { method: 'GET', path: '/api/actions/user/:userId/recommendations', description: 'Get recommendations' },
    { method: 'POST', path: '/api/actions/user/:userId/start', description: 'Start action' },
    { method: 'GET', path: '/api/actions/user/:userId/my-actions', description: 'Get user actions' },
    { method: 'PUT', path: '/api/actions/user/:userId/actions/:userActionId', description: 'Update user action' },
    { method: 'POST', path: '/api/actions/user/:userId/actions/:userActionId/complete', description: 'Complete action' },
    { method: 'POST', path: '/api/actions/user/:userId/actions/:userActionId/abandon', description: 'Abandon action' },
    { method: 'DELETE', path: '/api/actions/user/:userId/actions/:userActionId', description: 'Delete user action' }
  ],
  social: [
    { method: 'GET', path: '/api/social/leaderboard', description: 'Get leaderboard' },
    { method: 'GET', path: '/api/social/challenges', description: 'Get challenges' },
    { method: 'GET', path: '/api/social/challenges/:challengeId', description: 'Get challenge by ID' },
    { method: 'POST', path: '/api/social/challenges/:challengeId/join', description: 'Join challenge' },
    { method: 'GET', path: '/api/social/user/:userId/challenges', description: 'Get user challenges' },
    { method: 'PUT', path: '/api/social/challenges/:challengeId/progress', description: 'Update challenge progress' },
    { method: 'POST', path: '/api/social/challenges/:challengeId/leave', description: 'Leave challenge' },
    { method: 'GET', path: '/api/social/user/:userId/achievements', description: 'Get user achievements' },
    { method: 'GET', path: '/api/social/user/:userId/comparison', description: 'Get user comparison' }
  ],
  calculator: [
    { method: 'POST', path: '/api/calculator/calculate', description: 'Calculate emissions' },
    { method: 'POST', path: '/api/calculator/baseline', description: 'Calculate baseline' },
    { method: 'GET', path: '/api/calculator/factors', description: 'Get emission factors' },
    { method: 'GET', path: '/api/calculator/regional-averages', description: 'Get regional averages' },
    { method: 'POST', path: '/api/calculator/compare', description: 'Compare scenarios' },
    { method: 'POST', path: '/api/calculator/equivalents', description: 'Get equivalents' }
  ]
};

let total = 0;
Object.keys(endpoints).forEach(category => {
  console.log(`\n${category.toUpperCase()}: ${endpoints[category].length} endpoints`);
  endpoints[category].forEach(ep => {
    console.log(`  ${ep.method.padEnd(6)} ${ep.path}`);
    total++;
  });
});

console.log(`\n✓ TOTAL ENDPOINTS: ${total}`);
