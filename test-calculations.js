import { calculators, emissionFactors, regionalAverages } from './src/database/emissionFactors.js';

console.log('🧪 EMISSION CALCULATION TESTS\n');
console.log('═'.repeat(60));

// Test 1: Transportation Calculations
console.log('\n📍 TRANSPORT EMISSIONS:');
const carEmissions = calculators.calculateTransportEmissions('car', 'gasoline', 100);
console.log(`  100 miles in gasoline car: ${carEmissions.toFixed(2)} kg CO2`);
console.log(`  Expected: ~40.4 kg CO2 (0.404 × 100)`);
console.log(`  ✓ ${Math.abs(carEmissions - 40.4) < 0.1 ? 'PASS' : 'FAIL'}`);

const busEmissions = calculators.calculateTransportEmissions('publicTransit', 'bus', 50);
console.log(`\n  50 miles on bus: ${busEmissions.toFixed(2)} kg CO2`);
console.log(`  Expected: ~4.45 kg CO2 (0.089 × 50)`);
console.log(`  ✓ ${Math.abs(busEmissions - 4.45) < 0.1 ? 'PASS' : 'FAIL'}`);

// Test 2: Energy Calculations
console.log('\n⚡ ENERGY EMISSIONS:');
const electricityEmissions = calculators.calculateEnergyEmissions('electricity', 100);
console.log(`  100 kWh electricity (US avg): ${electricityEmissions.toFixed(2)} kg CO2`);
console.log(`  Expected: ~38.5 kg CO2 (0.385 × 100)`);
console.log(`  ✓ ${Math.abs(electricityEmissions - 38.5) < 0.1 ? 'PASS' : 'FAIL'}`);

// Test 3: Food Calculations
console.log('\n🍖 FOOD EMISSIONS:');
const beefEmissions = calculators.calculateFoodEmissions('meat', 'beef', 1);
console.log(`  1 kg beef: ${beefEmissions.toFixed(2)} kg CO2`);
console.log(`  Expected: 27.0 kg CO2`);
console.log(`  ✓ ${beefEmissions === 27.0 ? 'PASS' : 'FAIL'}`);

const veggieEmissions = calculators.calculateFoodEmissions('plantBased', 'vegetables', 1);
console.log(`\n  1 kg vegetables: ${veggieEmissions.toFixed(2)} kg CO2`);
console.log(`  Expected: 0.4 kg CO2`);
console.log(`  ✓ ${veggieEmissions === 0.4 ? 'PASS' : 'FAIL'}`);

// Test 4: Baseline Calculation
console.log('\n👤 BASELINE FOOTPRINT:');
const profile1 = {
  location: 'US',
  householdSize: 1,
  carMilesPerYear: 12000,
  carType: 'gasoline',
  electricityKwhPerMonth: 900,
  heatingType: 'naturalGas',
  heatingUsage: 'medium',
  dietType: 'average',
  flightsPerYear: 2,
  averageFlightDistance: 1500,
  shoppingBudgetPerMonth: 500
};

const baseline1 = calculators.calculateBaselineFootprint(profile1);
console.log(`  Average US lifestyle: ${baseline1} kg CO2/year`);
console.log(`  US average: ${regionalAverages.US} kg CO2/year`);
console.log(`  ✓ Baseline is reasonable: ${baseline1 > 8000 && baseline1 < 20000 ? 'PASS' : 'FAIL'}`);

const profile2 = {
  location: 'US',
  householdSize: 1,
  carMilesPerYear: 5000,
  carType: 'hybrid',
  electricityKwhPerMonth: 600,
  heatingType: 'naturalGas',
  heatingUsage: 'low',
  dietType: 'vegetarian',
  flightsPerYear: 0,
  averageFlightDistance: 0,
  shoppingBudgetPerMonth: 300
};

const baseline2 = calculators.calculateBaselineFootprint(profile2);
console.log(`\n  Low-impact lifestyle: ${baseline2} kg CO2/year`);
console.log(`  ✓ Lower than average: ${baseline2 < baseline1 ? 'PASS' : 'FAIL'}`);

// Test 5: Food Category Comparison
console.log('\n🥩 vs 🥬 FOOD COMPARISON (1kg):');
const foodComparisons = [
  ['Beef', calculators.calculateFoodEmissions('meat', 'beef', 1)],
  ['Chicken', calculators.calculateFoodEmissions('meat', 'chicken', 1)],
  ['Tofu', calculators.calculateFoodEmissions('plantBased', 'tofu', 1)],
  ['Vegetables', calculators.calculateFoodEmissions('plantBased', 'vegetables', 1)]
];

foodComparisons.forEach(([name, co2]) => {
  console.log(`  ${name.padEnd(12)}: ${co2.toFixed(1)} kg CO2`);
});

const beefVsVeg = foodComparisons[0][1] / foodComparisons[3][1];
console.log(`  ✓ Beef is ${beefVsVeg.toFixed(0)}x more carbon-intensive than vegetables`);

// Test 6: Transport Mode Comparison
console.log('\n🚗 vs 🚌 TRANSPORT COMPARISON (50 miles):');
const transportModes = [
  ['Gasoline Car', calculators.calculateTransportEmissions('car', 'gasoline', 50)],
  ['Hybrid Car', calculators.calculateTransportEmissions('car', 'hybrid', 50)],
  ['Electric Car', calculators.calculateTransportEmissions('car', 'electric', 50)],
  ['Bus', calculators.calculateTransportEmissions('publicTransit', 'bus', 50)],
  ['Train', calculators.calculateTransportEmissions('publicTransit', 'train', 50)],
  ['Bike', calculators.calculateTransportEmissions('other', 'bike', 50)]
];

transportModes.forEach(([name, co2]) => {
  console.log(`  ${name.padEnd(15)}: ${co2.toFixed(2)} kg CO2`);
});

// Test 7: Regional Averages
console.log('\n🌍 REGIONAL AVERAGES:');
console.log(`  US:        ${regionalAverages.US.toLocaleString()} kg CO2/year`);
console.log(`  UK:        ${regionalAverages.UK.toLocaleString()} kg CO2/year`);
console.log(`  India:     ${regionalAverages.India.toLocaleString()} kg CO2/year`);
console.log(`  World Avg: ${regionalAverages.World.toLocaleString()} kg CO2/year`);

// Test 8: Edge Cases
console.log('\n🔍 EDGE CASE TESTS:');
console.log(`  Zero distance: ${calculators.calculateTransportEmissions('car', 'gasoline', 0)} kg CO2`);
console.log(`  ✓ ${calculators.calculateTransportEmissions('car', 'gasoline', 0) === 0 ? 'PASS' : 'FAIL'}`);

console.log(`  Bike (zero emissions): ${calculators.calculateTransportEmissions('other', 'bike', 100)} kg CO2`);
console.log(`  ✓ ${calculators.calculateTransportEmissions('other', 'bike', 100) === 0 ? 'PASS' : 'FAIL'}`);

// Summary
console.log('\n═'.repeat(60));
console.log('✅ ALL CALCULATION TESTS COMPLETED');
console.log('═'.repeat(60));
