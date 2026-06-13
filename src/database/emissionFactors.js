/**
 * Emission Factors Database
 * Based on EPA, IPCC, and other scientific sources
 * All values in kg CO2 equivalent
 */

export const emissionFactors = {
  // TRANSPORTATION (kg CO2 per unit)
  transport: {
    car: {
      gasoline: 0.404, // per mile for average car
      diesel: 0.411,
      hybrid: 0.293,
      electric: 0.180, // depends on grid, using US average
      suv: 0.550
    },
    publicTransit: {
      bus: 0.089, // per mile per passenger
      train: 0.041,
      subway: 0.035,
      lightRail: 0.038
    },
    flight: {
      domestic: {
        short: 0.255, // per mile (< 300 miles)
        medium: 0.184, // 300-2300 miles
        long: 0.152 // > 2300 miles
      },
      international: 0.195 // per mile
    },
    other: {
      motorcycle: 0.180, // per mile
      bike: 0, // zero emissions
      walk: 0,
      escooter: 0.040 // per mile (manufacturing + electricity)
    }
  },

  // HOME ENERGY (kg CO2 per kWh or unit)
  energy: {
    electricity: {
      usAverage: 0.385, // per kWh
      coal: 0.910,
      naturalGas: 0.410,
      renewable: 0.020
    },
    heating: {
      naturalGas: 5.3, // per therm
      heatingOil: 10.2, // per gallon
      propane: 5.7, // per gallon
      electric: 0.385 // per kWh (same as electricity)
    }
  },

  // FOOD (kg CO2 per kg of food)
  food: {
    meat: {
      beef: 27.0,
      lamb: 39.2,
      pork: 12.1,
      chicken: 6.9,
      turkey: 10.9
    },
    seafood: {
      fish: 5.4,
      shrimp: 18.0,
      salmon: 11.9
    },
    dairy: {
      cheese: 13.5,
      milk: 1.9,
      eggs: 4.8,
      yogurt: 2.2,
      butter: 12.1
    },
    plantBased: {
      vegetables: 0.4,
      fruits: 0.4,
      grains: 0.6,
      legumes: 0.9,
      nuts: 2.3,
      tofu: 2.0
    },
    processed: {
      bread: 1.2,
      pasta: 1.5,
      rice: 2.7,
      sugar: 1.8
    }
  },

  // SHOPPING & CONSUMPTION (kg CO2 per item or dollar spent)
  consumption: {
    clothing: {
      tshirt: 7.0, // per item
      jeans: 33.4,
      jacket: 15.0,
      shoes: 14.0,
      averagePerDollar: 0.44 // per dollar spent
    },
    electronics: {
      smartphone: 80.0, // per device
      laptop: 200.0,
      tablet: 120.0,
      tv: 500.0,
      averagePerDollar: 0.52
    },
    household: {
      furniture: 100.0, // average per item
      appliances: 250.0,
      averagePerDollar: 0.38
    },
    general: {
      averagePerDollar: 0.42 // general shopping
    }
  },

  // WASTE (kg CO2 per unit)
  waste: {
    landfill: 0.98, // per kg of waste
    recycled: 0.12, // per kg recycled (net benefit)
    composted: 0.05, // per kg composted
    foodWaste: 2.5 // per kg food wasted (includes production)
  }
};

/**
 * Calculation helpers
 */
export const calculators = {
  // Calculate transportation emissions
  calculateTransportEmissions(type, subtype, distance, options = {}) {
    let factor;

    if (type === 'car') {
      factor = emissionFactors.transport.car[subtype] || emissionFactors.transport.car.gasoline;
    } else if (type === 'publicTransit') {
      factor = emissionFactors.transport.publicTransit[subtype] || emissionFactors.transport.publicTransit.bus;
    } else if (type === 'flight') {
      if (subtype === 'international' || (options && options.international)) {
        factor = emissionFactors.transport.flight.international;
      } else {
        if (distance < 300) {
          factor = emissionFactors.transport.flight.domestic.short;
        } else if (distance < 2300) {
          factor = emissionFactors.transport.flight.domestic.medium;
        } else {
          factor = emissionFactors.transport.flight.domestic.long;
        }
      }
    } else if (type === 'other') {
      factor = emissionFactors.transport.other[subtype] || 0;
    } else {
      factor = 0;
    }

    return distance * factor;
  },

  // Calculate home energy emissions
  calculateEnergyEmissions(energyType, amount, source = 'usAverage') {
    if (energyType === 'electricity') {
      const factor = emissionFactors.energy.electricity[source] || emissionFactors.energy.electricity.usAverage;
      return amount * factor;
    } else if (energyType === 'heating') {
      const factor = emissionFactors.energy.heating[source] || emissionFactors.energy.heating.naturalGas;
      return amount * factor;
    }
    return 0;
  },

  // Calculate food emissions
  calculateFoodEmissions(foodCategory, foodType, amount) {
    const category = emissionFactors.food[foodCategory];
    if (!category) return 0;

    const factor = category[foodType] || 0;
    return amount * factor;
  },

  // Calculate consumption emissions
  calculateConsumptionEmissions(category, subcategory, amountOrDollars, useQuantity = false) {
    const cat = emissionFactors.consumption[category];
    if (!cat) return 0;

    if (useQuantity && cat[subcategory]) {
      return amountOrDollars * cat[subcategory];
    }

    const dollarFactor = cat.averagePerDollar || emissionFactors.consumption.general.averagePerDollar;
    return amountOrDollars * dollarFactor;
  },

  // Calculate waste emissions
  calculateWasteEmissions(wasteType, amount) {
    const factor = emissionFactors.waste[wasteType] || emissionFactors.waste.landfill;
    return amount * factor;
  },

  // Calculate baseline footprint based on user profile
  calculateBaselineFootprint(profile) {
    const {
      location = 'US',
      householdSize = 1,
      carMilesPerYear = 12000,
      carType = 'gasoline',
      electricityKwhPerMonth = 900,
      heatingType = 'naturalGas',
      heatingUsage = 'medium', // low, medium, high
      dietType = 'average', // average, vegetarian, vegan, high-meat
      flightsPerYear = 2,
      averageFlightDistance = 1500,
      shoppingBudgetPerMonth = 500
    } = profile;

    let total = 0;

    // Transportation
    const carEmissions = this.calculateTransportEmissions('car', carType, carMilesPerYear);
    total += carEmissions;

    // Flights
    const flightEmissions = this.calculateTransportEmissions('flight', 'domestic', averageFlightDistance) * flightsPerYear;
    total += flightEmissions;

    // Home energy (shared resource)
    const electricityEmissions = this.calculateEnergyEmissions('electricity', electricityKwhPerMonth * 12);
    const heatingMultiplier = { low: 300, medium: 600, high: 900 };
    const heatingAmount = heatingMultiplier[heatingUsage] || 600;
    const heatingEmissions = this.calculateEnergyEmissions('heating', heatingAmount, heatingType);
    const homeEnergyEmissions = electricityEmissions + heatingEmissions;

    // Adjust for household size (shared resources are divided by householdSize but with sharing overhead efficiency)
    const householdAdjustment = householdSize === 1 ? 1 : 1 + ((householdSize - 1) * 0.5);
    const homeEnergyPerPerson = (homeEnergyEmissions * householdAdjustment) / householdSize;

    // Food (approximate based on diet type - individual resource)
    const dietEmissionsTable = {
      'vegan': 1500,
      'vegetarian': 2000,
      'average': 2500,
      'high-meat': 3300
    };
    const dietEmissions = dietEmissionsTable[dietType] || dietEmissionsTable.average;

    // Shopping (individual resource)
    const shoppingEmissions = this.calculateConsumptionEmissions('general', null, shoppingBudgetPerMonth * 12);

    // Sum up individual emissions and shared home energy emissions per person
    total = carEmissions + flightEmissions + dietEmissions + shoppingEmissions + homeEnergyPerPerson;

    return Math.round(total);
  }
};

// Regional averages (kg CO2 per year per person)
export const regionalAverages = {
  'US': 16000,
  'Canada': 15200,
  'UK': 8500,
  'Germany': 9200,
  'France': 6400,
  'China': 8000,
  'India': 2000,
  'Brazil': 2300,
  'Australia': 17000,
  'World': 4800
};

export default emissionFactors;
