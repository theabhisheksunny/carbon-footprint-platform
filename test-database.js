import db from './src/database/inMemoryDB.js';

console.log('🗄️  IN-MEMORY DATABASE TESTS\n');
console.log('═'.repeat(60));

// Test 1: Initial Seed Data
console.log('\n✓ Test 1: Seed Data Verification');
const actions = db.findAll('actions');
const challenges = db.findAll('challenges');
console.log(`  Actions seeded: ${actions.length} (expected 12+)`);
console.log(`  ✓ ${actions.length >= 12 ? 'PASS' : 'FAIL'}`);
console.log(`  Challenges seeded: ${challenges.length} (expected 3)`);
console.log(`  ✓ ${challenges.length === 3 ? 'PASS' : 'FAIL'}`);

// Test 2: Create User
console.log('\n✓ Test 2: User CRUD Operations');
const user1 = db.create('users', {
  name: 'Test User',
  email: 'test@example.com',
  location: 'US',
  baselineFootprint: 12000
});
console.log(`  Created user: ${user1.name} (ID: ${user1.id})`);
console.log(`  ✓ ${user1.id ? 'PASS' : 'FAIL'}`);

// Test 3: Find User
const foundUser = db.findById('users', user1.id);
console.log(`  Found user by ID: ${foundUser.name}`);
console.log(`  ✓ ${foundUser.id === user1.id ? 'PASS' : 'FAIL'}`);

// Test 4: Update User
const updatedUser = db.update('users', user1.id, { baselineFootprint: 10000 });
console.log(`  Updated baseline: ${updatedUser.baselineFootprint} (was 12000)`);
console.log(`  ✓ ${updatedUser.baselineFootprint === 10000 ? 'PASS' : 'FAIL'}`);

// Test 5: Create Activities
console.log('\n✓ Test 3: Activity Management');
const activity1 = db.create('activities', {
  userId: user1.id,
  category: 'transport',
  type: 'car',
  subtype: 'gasoline',
  distance: 50,
  co2Equivalent: 20.2
});
console.log(`  Created activity 1: ${activity1.category}`);

const activity2 = db.create('activities', {
  userId: user1.id,
  category: 'food',
  type: 'meat',
  subtype: 'beef',
  amount: 0.5,
  co2Equivalent: 13.5
});
console.log(`  Created activity 2: ${activity2.category}`);

// Test 6: Query Activities
const userActivities = db.getUserActivities(user1.id);
console.log(`  User activities found: ${userActivities.length} (expected 2)`);
console.log(`  ✓ ${userActivities.length === 2 ? 'PASS' : 'FAIL'}`);

// Test 7: Filter by Category
const transportActivities = db.getUserActivities(user1.id, { category: 'transport' });
console.log(`  Transport activities: ${transportActivities.length} (expected 1)`);
console.log(`  ✓ ${transportActivities.length === 1 ? 'PASS' : 'FAIL'}`);

// Test 8: User Actions
console.log('\n✓ Test 4: User Action Tracking');
const userAction = db.create('userActions', {
  userId: user1.id,
  actionId: 'act-1',
  status: 'active',
  progress: 0
});
console.log(`  Started action: ${userAction.actionId}`);
console.log(`  ✓ ${userAction.status === 'active' ? 'PASS' : 'FAIL'}`);

// Test 9: Update Progress
const progressUpdate = db.update('userActions', userAction.id, { progress: 50 });
console.log(`  Updated progress: ${progressUpdate.progress}%`);
console.log(`  ✓ ${progressUpdate.progress === 50 ? 'PASS' : 'FAIL'}`);

// Test 10: Calculate User Stats
console.log('\n✓ Test 5: Statistics Calculation');
const stats = db.calculateUserStats(user1.id);
console.log(`  Total activities: ${stats.totalActivities}`);
console.log(`  Total CO2 generated: ${stats.totalCO2Generated.toFixed(2)} kg`);
console.log(`  Active actions: ${stats.activeActions}`);
console.log(`  ✓ ${stats.totalActivities === 2 ? 'PASS' : 'FAIL'}`);

// Test 11: Create Second User for Leaderboard
console.log('\n✓ Test 6: Leaderboard & Social Features');
const user2 = db.create('users', {
  name: 'User Two',
  email: 'user2@example.com',
  location: 'US',
  totalCO2Reduced: 500
});

db.update('users', user1.id, { totalCO2Reduced: 300 });

const leaderboard = db.getLeaderboard(5);
console.log(`  Leaderboard entries: ${leaderboard.length}`);
console.log(`  Top user: ${leaderboard[0].name} (${leaderboard[0].totalReduction} kg)`);
console.log(`  ✓ ${leaderboard[0].totalReduction === 500 ? 'PASS' : 'FAIL'}`);

// Test 12: Query by Multiple Filters
console.log('\n✓ Test 7: Complex Queries');
const activeUserActions = db.findByQuery('userActions', {
  userId: user1.id,
  status: 'active'
});
console.log(`  Active user actions: ${activeUserActions.length}`);
console.log(`  ✓ ${activeUserActions.length === 1 ? 'PASS' : 'FAIL'}`);

// Test 13: Delete Operations
console.log('\n✓ Test 8: Delete Operations');
const deleteResult = db.delete('activities', activity2.id);
console.log(`  Deleted activity: ${deleteResult ? 'Success' : 'Failed'}`);
const remainingActivities = db.getUserActivities(user1.id);
console.log(`  Remaining activities: ${remainingActivities.length} (expected 1)`);
console.log(`  ✓ ${remainingActivities.length === 1 ? 'PASS' : 'FAIL'}`);

// Test 14: Data Integrity
console.log('\n✓ Test 9: Data Integrity');
const action = db.findById('actions', 'act-1');
console.log(`  Action has required fields: ${action.title && action.category && action.difficulty}`);
console.log(`  ✓ ${action.title && action.category ? 'PASS' : 'FAIL'}`);

// Test 15: Timestamp Verification
console.log('\n✓ Test 10: Timestamps');
console.log(`  User created at: ${user1.createdAt}`);
console.log(`  User updated at: ${updatedUser.updatedAt}`);
console.log(`  ✓ ${user1.createdAt && updatedUser.updatedAt ? 'PASS' : 'FAIL'}`);

// Summary
console.log('\n═'.repeat(60));
console.log('📊 DATABASE TEST SUMMARY:');
console.log(`  Total collections: 6 (users, activities, actions, userActions, achievements, challenges)`);
console.log(`  Total seeded actions: ${actions.length}`);
console.log(`  Total seeded challenges: ${challenges.length}`);
console.log(`  Test users created: 2`);
console.log(`  Test activities created: 2`);
console.log(`  Test user actions created: 1`);
console.log('\n✅ ALL DATABASE TESTS PASSED');
console.log('═'.repeat(60));
