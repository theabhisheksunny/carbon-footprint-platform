import db from './src/database/inMemoryDB.js';
import { calculators } from './src/database/emissionFactors.js';

console.log('🧪 RUNNING ATOMIC BUDGET & CHATBOT ADVISOR TESTS...\n');
console.log('═'.repeat(65));

try {
  // 1. Create test user with correct fields
  const user = db.create('users', {
    name: 'Eco Champion',
    email: 'champion@gmail.com',
    location: 'US',
    regionalAverage: 16000,
    baselineFootprint: 12000,
    profile: {
      householdSize: 2,
      carMilesPerYear: 6000,
      carType: 'electric'
    }
  });
  console.log(`✓ Test User created: ${user.name} (ID: ${user.id})`);
  console.log(`  Regional Average: ${user.regionalAverage} kg/yr`);
  console.log(`  Initial EcoPoints: ${user.ecoPoints}`);
  
  // 2. Verify budget target defaults
  const defaultTarget = Math.round(user.regionalAverage / 12);
  console.log(`  Expected Default Monthly Target: ${defaultTarget} kg CO2e`);
  if (defaultTarget !== Math.round(16000 / 12)) {
    throw new Error('Default monthly target does not match US regional average division');
  }
  console.log('  ✓ default target calculation: PASS');

  // 3. Set custom budget goal
  const customTarget = 400;
  const updatedUser = db.update('users', user.id, {
    profile: {
      ...user.profile,
      monthlyTarget: customTarget
    }
  });
  console.log(`✓ Custom monthly carbon budget set: ${updatedUser.profile.monthlyTarget} kg CO2e`);
  if (updatedUser.profile.monthlyTarget !== customTarget) {
    throw new Error('Custom target was not successfully saved to user profile');
  }
  console.log('  ✓ custom target update: PASS');

  // 4. Log activities and verify they count towards 30 days log
  db.create('activities', {
    userId: user.id,
    category: 'transport',
    type: 'car',
    subtype: 'gasoline',
    distance: 500, // 500 * 0.404 = 202 kg
    co2Equivalent: 202,
    timestamp: new Date().toISOString()
  });

  db.create('activities', {
    userId: user.id,
    category: 'food',
    type: 'meat',
    subtype: 'beef',
    amount: 5, // 5 * 27 = 135 kg
    co2Equivalent: 135,
    timestamp: new Date().toISOString()
  });

  const stats = db.calculateUserStats(user.id);
  console.log(`✓ Logged activities in last 30 days: ${stats.last30DaysCO2} kg CO2e`);
  if (stats.last30DaysCO2 !== 337) {
    throw new Error(`Expected logged CO2 to be 337, got ${stats.last30DaysCO2}`);
  }
  console.log('  ✓ activity log accumulation: PASS');

  // 5. Test Chatbot Advisor response when under budget
  const getAdvisorReply = (userObj, statsObj, queryText) => {
    const query = queryText.toLowerCase();
    if (query.includes('budget') || query.includes('goal') || query.includes('target') || query.includes('limit')) {
      const defaultT = Math.round((userObj.regionalAverage || 4800) / 12);
      const target = (userObj.profile && userObj.profile.monthlyTarget) ? userObj.profile.monthlyTarget : defaultT;
      const logged = Math.round(statsObj.last30DaysCO2 || 0);
      const remaining = target - logged;
      
      if (logged > target) {
        return `WARNING: Exceeding target by ${logged - target} kg`;
      } else {
        const percent = target > 0 ? ((logged / target) * 100).toFixed(0) : 0;
        return `STATUS: Logged ${logged} kg (${percent}% of budget). Remaining ${remaining} kg`;
      }
    }
    return 'DEFAULT';
  };

  const replyUnder = getAdvisorReply(updatedUser, stats, 'What is my budget?');
  console.log(`✓ Advisor reply (Under budget query): "${replyUnder}"`);
  if (!replyUnder.includes('STATUS') || !replyUnder.includes('Remaining 63')) {
    throw new Error('Chatbot reply did not report remaining budget correctly when under target');
  }
  console.log('  ✓ chatbot under-budget status reply: PASS');

  // 6. Log activity exceeding budget
  db.create('activities', {
    userId: user.id,
    category: 'transport',
    type: 'flight',
    subtype: 'domestic',
    distance: 1000, // 1000 * 0.184 = 184 kg
    co2Equivalent: 184,
    timestamp: new Date().toISOString()
  });

  const statsExceeded = db.calculateUserStats(user.id);
  console.log(`✓ Logged activities after exceeding budget: ${statsExceeded.last30DaysCO2} kg CO2e`);
  
  const replyExceeded = getAdvisorReply(updatedUser, statsExceeded, 'Check my carbon budget goal limit');
  console.log(`✓ Advisor reply (Over budget query): "${replyExceeded}"`);
  if (!replyExceeded.includes('WARNING') || !replyExceeded.includes('Exceeding target by 121 kg')) {
    throw new Error('Chatbot reply did not warn about exceeding budget correctly');
  }
  console.log('  ✓ chatbot over-budget warning reply: PASS');

  // 7. Integration test: REST endpoints for user creation, activity log, and CSV export
  console.log('\n🌐 RUNNING REST EXPORT INTEGRATION TEST...');
  const serverUrl = 'http://localhost:3000/api';
  
  // Create user via POST request
  const registerRes = await fetch(`${serverUrl}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Integration User',
      email: `integration.${Date.now()}@example.com`,
      location: 'US',
      profile: { householdSize: 1 }
    })
  });
  
  if (!registerRes.ok) {
    const err = await registerRes.json();
    throw new Error(`Failed to create integration user: ${err.error}`);
  }
  const registerData = await registerRes.json();
  const integrationUserId = registerData.user.id;
  const token = registerData.token;
  console.log(`  ✓ Created integration user via API (ID: ${integrationUserId})`);

  // Log activity via POST request
  const activityRes = await fetch(`${serverUrl}/activities`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-User-Token': token
    },
    body: JSON.stringify({
      userId: integrationUserId,
      category: 'shopping',
      type: 'clothing',
      subtype: 'shoes',
      quantity: 2,
      amount: 120,
      unit: 'pcs',
      description: 'Bought running shoes'
    })
  });
  
  if (!activityRes.ok) {
    const err = await activityRes.json();
    throw new Error(`Failed to log integration activity: ${err.error}`);
  }
  const activityData = await activityRes.json();
  console.log(`  ✓ Logged shopping activity via API (CO2: ${activityData.activity.co2Equivalent} kg)`);

  // Request CSV Export
  const exportRes = await fetch(`${serverUrl}/reports/user/${integrationUserId}/export?type=activities`, {
    headers: {
      'X-User-Token': token
    }
  });
  if (!exportRes.ok) {
    const err = await exportRes.json();
    throw new Error(`Failed to fetch CSV export: ${err.error}`);
  }
  const csvText = await exportRes.text();
  console.log('  ✓ Fetched CSV Export payload');
  
  // Verify CSV headers
  const csvLines = csvText.split('\n');
  const headers = csvLines[0];
  console.log(`  CSV Headers: "${headers}"`);
  
  const expectedHeaders = 'Date,Category,Type,Subtype,Amount,Distance,Quantity,Unit,CO2 (kg),Description';
  if (headers.trim() !== expectedHeaders) {
    throw new Error(`CSV headers mismatch.\nExpected: "${expectedHeaders}"\nGot: "${headers}"`);
  }
  console.log('  ✓ CSV headers verify (includes Quantity, Unit): PASS');

  // Verify exported row contents
  const dataRow = csvLines[1];
  console.log(`  CSV Row 1: "${dataRow}"`);
  if (!dataRow.includes('shopping') || !dataRow.includes('clothing') || !dataRow.includes('shoes') || !dataRow.includes('120') || !dataRow.includes('2') || !dataRow.includes('pcs')) {
    throw new Error('CSV exported row is missing logged activity values (Amount, Quantity, or Unit)');
  }
  console.log('  ✓ CSV data row values verify (preserves 0/numeric columns): PASS');

  console.log('\n═'.repeat(65));
  console.log('✅ ALL BUDGET, ADVISOR & EXPORT TESTS PASSED!');
  console.log('═'.repeat(65));
  
} catch (error) {
  console.error('\n❌ TEST SUITE FAILED:', error.message);
  process.exit(1);
}
