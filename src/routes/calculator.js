import express from 'express';
import { calculators, emissionFactors, regionalAverages } from '../database/emissionFactors.js';

const router = express.Router();

// Calculate emissions for a specific activity
router.post('/calculate', (req, res) => {
  try {
    const { category, type, subtype, amount, distance, quantity, options } = req.body;

    if (!category || !type) {
      return res.status(400).json({ error: 'category and type are required' });
    }

    let co2Equivalent = 0;

    switch (category) {
      case 'transport':
        co2Equivalent = calculators.calculateTransportEmissions(type, subtype, distance || quantity, options);
        break;
      case 'energy':
        co2Equivalent = calculators.calculateEnergyEmissions(type, amount || quantity, subtype);
        break;
      case 'food':
        co2Equivalent = calculators.calculateFoodEmissions(type, subtype, amount || quantity);
        break;
      case 'shopping':
        co2Equivalent = calculators.calculateConsumptionEmissions(type, subtype, amount || quantity);
        break;
      case 'waste':
        co2Equivalent = calculators.calculateWasteEmissions(type, amount || quantity);
        break;
      default:
        return res.status(400).json({ error: 'Invalid category' });
    }

    res.json({
      success: true,
      calculation: {
        category,
        type,
        subtype,
        amount: amount || distance || quantity,
        co2Equivalent: Math.round(co2Equivalent * 100) / 100,
        unit: 'kg CO2e'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate baseline footprint
router.post('/baseline', (req, res) => {
  try {
    const profile = req.body;

    const baselineFootprint = calculators.calculateBaselineFootprint(profile);
    const location = profile.location || 'US';
    const regionalAverage = regionalAverages[location] || regionalAverages['World'];

    const percentageDiff = ((baselineFootprint - regionalAverage) / regionalAverage * 100).toFixed(1);

    res.json({
      success: true,
      baseline: {
        annualFootprint: baselineFootprint,
        monthlyFootprint: Math.round(baselineFootprint / 12),
        dailyFootprint: Math.round(baselineFootprint / 365),
        unit: 'kg CO2e',
        regionalAverage,
        comparisonToAverage: `${percentageDiff > 0 ? '+' : ''}${percentageDiff}%`,
        isAboveAverage: baselineFootprint > regionalAverage
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get emission factors reference
router.get('/factors', (req, res) => {
  try {
    const { category } = req.query;

    if (category) {
      const factors = emissionFactors[category];
      if (!factors) {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.json({
        success: true,
        category,
        factors
      });
    } else {
      res.json({
        success: true,
        allFactors: emissionFactors
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get regional averages
router.get('/regional-averages', (req, res) => {
  try {
    res.json({
      success: true,
      regionalAverages,
      unit: 'kg CO2e per year per person'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compare two scenarios
router.post('/compare', (req, res) => {
  try {
    const { scenario1, scenario2 } = req.body;

    if (!scenario1 || !scenario2) {
      return res.status(400).json({ error: 'Both scenario1 and scenario2 are required' });
    }

    // Calculate emissions for both scenarios
    let co2Scenario1 = 0;
    let co2Scenario2 = 0;

    const calculateScenario = (scenario) => {
      let total = 0;
      const { category, type, subtype, amount, distance, quantity, options } = scenario;

      switch (category) {
        case 'transport':
          total = calculators.calculateTransportEmissions(type, subtype, distance || quantity, options);
          break;
        case 'energy':
          total = calculators.calculateEnergyEmissions(type, amount || quantity, subtype);
          break;
        case 'food':
          total = calculators.calculateFoodEmissions(type, subtype, amount || quantity);
          break;
        case 'shopping':
          total = calculators.calculateConsumptionEmissions(type, subtype, amount || quantity);
          break;
        case 'waste':
          total = calculators.calculateWasteEmissions(type, amount || quantity);
          break;
      }
      return total;
    };

    co2Scenario1 = calculateScenario(scenario1);
    co2Scenario2 = calculateScenario(scenario2);

    const difference = co2Scenario1 - co2Scenario2;
    const percentageChange = ((difference / co2Scenario1) * 100).toFixed(1);

    res.json({
      success: true,
      comparison: {
        scenario1: {
          ...scenario1,
          co2Equivalent: Math.round(co2Scenario1 * 100) / 100
        },
        scenario2: {
          ...scenario2,
          co2Equivalent: Math.round(co2Scenario2 * 100) / 100
        },
        difference: Math.round(difference * 100) / 100,
        percentageChange: `${percentageChange}%`,
        savings: difference > 0 ? Math.round(difference * 100) / 100 : 0,
        recommendation: difference > 0 ? 'scenario2' : 'scenario1',
        unit: 'kg CO2e'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate impact equivalents (trees, cars, etc.)
router.post('/equivalents', (req, res) => {
  try {
    const { co2Amount } = req.body;

    if (!co2Amount || co2Amount <= 0) {
      return res.status(400).json({ error: 'Valid co2Amount is required' });
    }

    // Conversion factors
    const treesPlanted = (co2Amount / 21).toFixed(1); // 1 tree absorbs ~21 kg CO2/year
    const milesNotDriven = (co2Amount / 0.404).toFixed(0); // avg car emits 0.404 kg/mile
    const homeElectricityDays = (co2Amount / (900 * 0.385 / 30)).toFixed(1); // avg home uses 900 kWh/month
    const smartphones = (co2Amount / 80).toFixed(1); // 1 smartphone = 80 kg CO2
    const mealsMeatFree = (co2Amount / 2.5).toFixed(0); // avg meat meal = 2.5 kg CO2 more than veggie

    res.json({
      success: true,
      co2Amount,
      unit: 'kg CO2e',
      equivalents: {
        treesPlanted: {
          value: treesPlanted,
          description: `${treesPlanted} trees planted and grown for 1 year`
        },
        milesNotDriven: {
          value: milesNotDriven,
          description: `${milesNotDriven} miles not driven in an average car`
        },
        homeElectricityDays: {
          value: homeElectricityDays,
          description: `${homeElectricityDays} days of electricity in an average home`
        },
        smartphonesNotManufactured: {
          value: smartphones,
          description: `${smartphones} smartphones not manufactured`
        },
        mealsMeatFree: {
          value: mealsMeatFree,
          description: `${mealsMeatFree} meat-based meals replaced with vegetarian`
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
