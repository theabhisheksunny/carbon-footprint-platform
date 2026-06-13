// Email format validation with strict Gmail checks
export function validateEmailDetailed(email) {
  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' };
  }
  const trimmed = email.trim();
  if (trimmed === '') {
    return { valid: false, error: 'Email is required' };
  }
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email must be at most 254 characters long' };
  }
  if (trimmed.includes(' ')) {
    return { valid: false, error: 'Email must not contain spaces' };
  }
  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: 'Email must contain exactly one @ symbol' };
  }
  const [localPart, domainPart] = parts;
  if (localPart.length === 0) {
    return { valid: false, error: 'Email username (before @) cannot be empty' };
  }
  if (localPart.length > 64) {
    return { valid: false, error: 'Email username must be at most 64 characters long' };
  }
  if (domainPart.length === 0) {
    return { valid: false, error: 'Email domain part (after @) cannot be empty' };
  }
  if (domainPart.length > 253) {
    return { valid: false, error: 'Email domain part must be at most 253 characters long' };
  }
  if (!domainPart.includes('.')) {
    return { valid: false, error: 'Email domain must contain a period (e.g., .com, .org)' };
  }
  const domainSubparts = domainPart.split('.');
  const tld = domainSubparts[domainSubparts.length - 1];
  if (tld.length < 2) {
    return { valid: false, error: 'Email domain suffix must be at least 2 characters long (e.g., .com, .org)' };
  }

  // Basic structure regex (RFC compliant)
  const basicRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!basicRegex.test(trimmed)) {
    return { valid: false, error: 'Email contains invalid characters or structure' };
  }

  // Specific Gmail / Googlemail validations
  const domainLower = domainPart.toLowerCase();
  if (domainLower === 'gmail.com' || domainLower === 'googlemail.com') {
    // Split by '+' to extract username before sub-address alias
    const username = localPart.split('+')[0];
    if (username.length === 0) {
      return { valid: false, error: 'Gmail username cannot be empty' };
    }

    // Gmail usernames can only contain letters (a-z, A-Z), numbers (0-9), and periods (.)
    const gmailCharRegex = /^[a-zA-Z0-9.]+$/;
    if (!gmailCharRegex.test(username)) {
      return { valid: false, error: 'Gmail username can only contain letters, numbers, and periods' };
    }

    // Cannot start or end with a period
    if (username.startsWith('.') || username.endsWith('.')) {
      return { valid: false, error: 'Gmail username cannot begin or end with a period' };
    }

    // Cannot have consecutive periods
    if (username.includes('..')) {
      return { valid: false, error: 'Gmail username cannot contain consecutive periods (..)' };
    }

    // Length of username excluding periods must be between 6 and 30 characters
    const cleanUsername = username.replace(/\./g, '');
    if (cleanUsername.length < 6 || cleanUsername.length > 30) {
      return { valid: false, error: 'Gmail username must be between 6 and 30 characters long (excluding periods)' };
    }
  }

  return { valid: true };
}

// Named export validateEmail returning a boolean for route compatibilities
export function validateEmail(email) {
  return validateEmailDetailed(email).valid;
}

// User Profile validation
export function validateUserProfile(profile) {
  if (!profile || typeof profile !== 'object') return { valid: false, error: 'Profile must be an object' };

  const {
    location,
    householdSize,
    carMilesPerYear,
    carType,
    electricityKwhPerMonth,
    heatingType,
    heatingUsage,
    dietType,
    flightsPerYear,
    averageFlightDistance,
    shoppingBudgetPerMonth
  } = profile;

  // Validate location
  const validLocations = ['US', 'Canada', 'UK', 'Germany', 'France', 'China', 'India', 'Brazil', 'Australia', 'World'];
  if (location && !validLocations.includes(location)) {
    return { valid: false, error: `Invalid location. Must be one of: ${validLocations.join(', ')}` };
  }

  // Validate householdSize (Strictly positive integer, max 50)
  if (householdSize !== undefined) {
    if (typeof householdSize !== 'number' || !Number.isInteger(householdSize) || householdSize < 1) {
      return { valid: false, error: 'Household size must be an integer greater than or equal to 1' };
    }
    if (householdSize > 50) {
      return { valid: false, error: 'Household size cannot exceed 50 occupants for sanity' };
    }
  }

  // Validate flightsPerYear (Must be non-negative integer, max 365)
  if (flightsPerYear !== undefined) {
    if (typeof flightsPerYear !== 'number' || !Number.isInteger(flightsPerYear) || flightsPerYear < 0) {
      return { valid: false, error: 'Flights per year must be a non-negative integer' };
    }
    if (flightsPerYear > 365) {
      return { valid: false, error: 'Flights per year cannot exceed 365 flights' };
    }
  }

  // Validate monthlyTarget (Must be a positive integer greater than or equal to 50, max 100,000)
  if (profile.monthlyTarget !== undefined) {
    const target = profile.monthlyTarget;
    if (typeof target !== 'number' || !Number.isInteger(target) || target < 50) {
      return { valid: false, error: 'Monthly budget target must be an integer greater than or equal to 50 kg CO2' };
    }
    if (target > 100000) {
      return { valid: false, error: 'Monthly budget target cannot exceed 100,000 kg CO2' };
    }
  }

  // Validate numeric fields (non-negative numbers with reasonable upper bounds)
  const numericFields = {
    carMilesPerYear: { label: 'Car miles per year', max: 200000 },
    electricityKwhPerMonth: { label: 'Electricity usage per month', max: 50000 },
    averageFlightDistance: { label: 'Average flight distance', max: 15000 },
    shoppingBudgetPerMonth: { label: 'Shopping budget per month', max: 100000 }
  };

  for (const [key, fieldProps] of Object.entries(numericFields)) {
    const val = profile[key];
    if (val !== undefined) {
      if (typeof val !== 'number' || isNaN(val) || val < 0) {
        return { valid: false, error: `${fieldProps.label} must be a non-negative number` };
      }
      if (val > fieldProps.max) {
        return { valid: false, error: `${fieldProps.label} exceeds maximum allowed value of ${fieldProps.max}` };
      }
    }
  }

  // Validate string category selectors
  if (carType !== undefined) {
    const validCarTypes = ['gasoline', 'diesel', 'hybrid', 'electric', 'suv'];
    if (!validCarTypes.includes(carType)) {
      return { valid: false, error: `Invalid carType. Must be one of: ${validCarTypes.join(', ')}` };
    }
  }

  if (heatingType !== undefined) {
    const validHeatingTypes = ['naturalGas', 'heatingOil', 'propane', 'electric'];
    if (!validHeatingTypes.includes(heatingType)) {
      return { valid: false, error: `Invalid heatingType. Must be one of: ${validHeatingTypes.join(', ')}` };
    }
  }

  if (heatingUsage !== undefined) {
    const validHeatingUsages = ['low', 'medium', 'high'];
    if (!validHeatingUsages.includes(heatingUsage)) {
      return { valid: false, error: `Invalid heatingUsage. Must be one of: ${validHeatingUsages.join(', ')}` };
    }
  }

  if (dietType !== undefined) {
    const validDietTypes = ['average', 'vegetarian', 'vegan', 'high-meat'];
    if (!validDietTypes.includes(dietType)) {
      return { valid: false, error: `Invalid dietType. Must be one of: ${validDietTypes.join(', ')}` };
    }
  }

  return { valid: true };
}

// Activity fields validation
export function validateActivity(activity) {
  if (!activity || typeof activity !== 'object') return { valid: false, error: 'Activity must be an object' };

  const { category, type, subtype, amount, distance, quantity } = activity;

  const validCategories = ['transport', 'energy', 'food', 'shopping', 'waste'];
  if (!validCategories.includes(category)) {
    return { valid: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` };
  }

  // Validate based on category
  if (category === 'transport') {
    const validTypes = ['car', 'publicTransit', 'flight', 'other'];
    if (!validTypes.includes(type)) {
      return { valid: false, error: `Invalid transport type. Must be one of: ${validTypes.join(', ')}` };
    }

    if (type === 'car') {
      const validSubtypes = ['gasoline', 'diesel', 'hybrid', 'electric', 'suv'];
      if (!validSubtypes.includes(subtype)) {
        return { valid: false, error: `Invalid car subtype. Must be one of: ${validSubtypes.join(', ')}` };
      }
    } else if (type === 'publicTransit') {
      const validSubtypes = ['bus', 'train', 'subway', 'lightRail'];
      if (!validSubtypes.includes(subtype)) {
        return { valid: false, error: `Invalid public transit subtype. Must be one of: ${validSubtypes.join(', ')}` };
      }
    } else if (type === 'flight') {
      const validSubtypes = ['domestic', 'international'];
      if (subtype && !validSubtypes.includes(subtype)) {
        return { valid: false, error: `Invalid flight subtype. Must be one of: ${validSubtypes.join(', ')}` };
      }
    } else if (type === 'other') {
      const validSubtypes = ['motorcycle', 'bike', 'walk', 'escooter'];
      if (!validSubtypes.includes(subtype)) {
        return { valid: false, error: `Invalid other transport subtype. Must be one of: ${validSubtypes.join(', ')}` };
      }
    }

    const dist = distance !== undefined ? distance : quantity;
    if (dist === undefined) {
      return { valid: false, error: 'distance or quantity is required for transport activity' };
    }
    if (typeof dist !== 'number' || isNaN(dist) || dist <= 0) {
      return { valid: false, error: 'distance or quantity must be a positive number greater than 0' };
    }
    if (dist > 15000) {
      return { valid: false, error: 'distance cannot exceed 15,000 miles in a single tracking event' };
    }
  }

  if (category === 'energy') {
    const validTypes = ['electricity', 'heating'];
    if (!validTypes.includes(type)) {
      return { valid: false, error: `Invalid energy type. Must be one of: ${validTypes.join(', ')}` };
    }

    if (type === 'electricity') {
      const validSubtypes = ['usAverage', 'coal', 'naturalGas', 'renewable'];
      if (subtype && !validSubtypes.includes(subtype)) {
        return { valid: false, error: `Invalid electricity source. Must be one of: ${validSubtypes.join(', ')}` };
      }
    } else if (type === 'heating') {
      const validSubtypes = ['naturalGas', 'heatingOil', 'propane', 'electric'];
      if (!validSubtypes.includes(subtype)) {
        return { valid: false, error: `Invalid heating fuel. Must be one of: ${validSubtypes.join(', ')}` };
      }
    }

    const amt = amount !== undefined ? amount : quantity;
    if (amt === undefined) {
      return { valid: false, error: 'amount or quantity is required for energy activity' };
    }
    if (typeof amt !== 'number' || isNaN(amt) || amt <= 0) {
      return { valid: false, error: 'amount or quantity must be a positive number greater than 0' };
    }
    if (amt > 50000) {
      return { valid: false, error: 'energy usage amount cannot exceed 50,000 units' };
    }
  }

  if (category === 'food') {
    const validTypes = ['meat', 'seafood', 'dairy', 'plantBased', 'processed'];
    if (!validTypes.includes(type)) {
      return { valid: false, error: `Invalid food category. Must be one of: ${validTypes.join(', ')}` };
    }

    const foodSubtypes = {
      meat: ['beef', 'lamb', 'pork', 'chicken', 'turkey'],
      seafood: ['fish', 'shrimp', 'salmon'],
      dairy: ['cheese', 'milk', 'eggs', 'yogurt', 'butter'],
      plantBased: ['vegetables', 'fruits', 'grains', 'legumes', 'nuts', 'tofu'],
      processed: ['bread', 'pasta', 'rice', 'sugar']
    };

    const subtypesForCategory = foodSubtypes[type];
    if (!subtypesForCategory || !subtypesForCategory.includes(subtype)) {
      return { valid: false, error: `Invalid food item. Must be one of: ${(subtypesForCategory || []).join(', ')}` };
    }

    const amt = amount !== undefined ? amount : quantity;
    if (amt === undefined) {
      return { valid: false, error: 'amount or quantity is required for food activity' };
    }
    if (typeof amt !== 'number' || isNaN(amt) || amt <= 0) {
      return { valid: false, error: 'amount or quantity must be a positive number greater than 0' };
    }
    if (amt > 500) {
      return { valid: false, error: 'food amount cannot exceed 500 kg' };
    }
  }

  if (category === 'shopping') {
    const validTypes = ['clothing', 'electronics', 'household', 'general'];
    if (!validTypes.includes(type)) {
      return { valid: false, error: `Invalid shopping category. Must be one of: ${validTypes.join(', ')}` };
    }

    const shoppingSubtypes = {
      clothing: ['tshirt', 'jeans', 'shoes', 'jacket', 'averagePerDollar'],
      electronics: ['smartphone', 'laptop', 'tablet', 'tv', 'averagePerDollar'],
      household: ['furniture', 'appliances', 'averagePerDollar'],
      general: ['averagePerDollar']
    };

    if (subtype && !shoppingSubtypes[type].includes(subtype)) {
      return { valid: false, error: `Invalid shopping item. Must be one of: ${shoppingSubtypes[type].join(', ')}` };
    }

    const amt = amount !== undefined ? amount : 0;
    const qty = quantity !== undefined ? quantity : 0;

    if (typeof amt !== 'number' || isNaN(amt) || amt < 0) {
      return { valid: false, error: 'amount must be a non-negative number' };
    }
    if (typeof qty !== 'number' || isNaN(qty) || qty < 0) {
      return { valid: false, error: 'quantity must be a non-negative number' };
    }
    if (!Number.isInteger(qty)) {
      return { valid: false, error: 'quantity must be an integer' };
    }
    if (amt === 0 && qty === 0) {
      return { valid: false, error: 'either amount or quantity must be greater than 0' };
    }
    if (qty > 1000) {
      return { valid: false, error: 'shopping quantity cannot exceed 1,000 items' };
    }
    if (amt > 100000) {
      return { valid: false, error: 'shopping amount cannot exceed $100,000' };
    }
  }

  if (category === 'waste') {
    const validTypes = ['landfill', 'recycled', 'composted', 'foodWaste'];
    if (!validTypes.includes(type)) {
      return { valid: false, error: `Invalid waste type. Must be one of: ${validTypes.join(', ')}` };
    }

    const amt = amount !== undefined ? amount : quantity;
    if (amt === undefined) {
      return { valid: false, error: 'amount or quantity is required for waste activity' };
    }
    if (typeof amt !== 'number' || isNaN(amt) || amt <= 0) {
      return { valid: false, error: 'amount or quantity must be a positive number greater than 0' };
    }
    if (amt > 2000) {
      return { valid: false, error: 'waste amount cannot exceed 2,000 kg' };
    }
  }

  return { valid: true };
}
